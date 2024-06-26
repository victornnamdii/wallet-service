import { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/User";
import { ResponseDTO } from "../lib/response";
import { decrypt } from "../lib/crypto";
import { database } from "../config/database";
import { WalletModel } from "../models/Wallet";
import { generateId } from "../lib/helpers";

class UserController {
  static async signUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, bvn, phoneNumber } =
        req.body;

      await database.transaction(async (trx) => {
        const id = generateId();

        const user = await UserModel.insertUser(
          {
            id,
            email,
            password,
            firstName,
            lastName,
            bvn,
            phoneNumber,
          },
          trx
        );

        const wallet = await WalletModel.createWallet(id, trx);

        res
          .status(201)
          .json(new ResponseDTO("success", "Successful", { user, wallet }));
      });
    } catch (error) {
      next(error);
    }
  }

  static async logIn(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const token = await UserModel.login({ email, password });

      res.status(200).json(new ResponseDTO("success", "Successful", { token }));
    } catch (error) {
      next(error);
    }
  }

  static async profile(req: Request, res: Response, next: NextFunction) {
    try {
      req.user!.password = undefined;
      req.user!.bvn = decrypt(req.user!.bvn);

      res
        .status(200)
        .json(new ResponseDTO("success", "Successful", { user: req.user }));
    } catch (error) {
      next(error);
    }
  }
}

export default UserController;
