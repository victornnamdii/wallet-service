import { Request, Response, NextFunction } from "express";
import { TransactionModel } from "../models/Transaction";
import { WalletModel } from "../models/Wallet";
import { database } from "../database";
import { APIError } from "../lib/error";
import { HttpStatusCode, transactionType } from "../@types";
import { ResponseDTO } from "../lib/response";
import { Knex } from "knex";

class WalletController {
  static async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const wallet = await WalletModel.findByUserId(req.user!.id);

      if (!wallet) {
        throw new APIError(
          "Wallet not found",
          HttpStatusCode.NOT_FOUND,
          "User wallet details not found"
        );
      }

      res
        .status(200)
        .json(new ResponseDTO("success", "Successful", { wallet }));
    } catch (error) {
      next(error);
    }
  }

  static async fundWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount } = req.body;

      await database.transaction(async (trx: Knex.Transaction) => {
        const wallet = await WalletModel.fundWallet(
          req.user!.walletId!,
          amount,
          trx
        );

        await TransactionModel.createTransaction(
          {
            walletId: req.user!.walletId!,
            amount,
            type: transactionType.Credit,
            narration: "FUND BY SELF",
          },
          trx
        );

        res
          .status(201)
          .json(
            new ResponseDTO(
              "success",
              `${amount} successfully added to your wallet`,
              { wallet }
            )
          );
      });
    } catch (error) {
      next(error);
    }
  }

  static async withdraw(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount } = req.body;

      await database.transaction(async (trx: Knex.Transaction) => {
        const wallet = await WalletModel.withdraw(req.user!.id, amount, trx);

        await TransactionModel.createTransaction(
          {
            walletId: req.user!.walletId!,
            amount,
            type: transactionType.Debit,
            narration: "WITHDRAWAL BY SELF",
          },
          trx
        );

        res
          .status(201)
          .json(
            new ResponseDTO(
              "success",
              `${amount} successfully debited from your wallet`,
              { wallet }
            )
          );
      });
    } catch (error) {
      next(error);
    }
  }

  static async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount } = req.body;
      const { receivingWalletId } = req.params;

      await database.transaction(async (trx: Knex.Transaction) => {
        const debitedWallet = await WalletModel.withdraw(
          req.user!.id,
          amount,
          trx
        );

        await TransactionModel.createTransaction(
          {
            walletId: req.user!.walletId!,
            amount,
            type: transactionType.Debit,
            narration: `TRF TO ${receivingWalletId}`,
          },
          trx
        );

        const creditedWallet = await WalletModel.fundWallet(
          receivingWalletId,
          amount,
          trx
        );

        await TransactionModel.createTransaction(
          {
            walletId: creditedWallet.id,
            amount,
            type: transactionType.Credit,
            narration: `TRF FROM ${debitedWallet.id}`,
          },
          trx
        );

        res
          .status(201)
          .json(
            new ResponseDTO(
              "success",
              `${amount} successfully transferred to ${creditedWallet.id}`,
              { wallet: debitedWallet }
            )
          );
      });
    } catch (error) {
      next(error);
    }
  }
}

export default WalletController;
