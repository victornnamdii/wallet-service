import { v4 } from "uuid";
import isUUID from "validator/lib/isUUID";
import { HttpStatusCode, Wallet } from "../../@types";
import { Model } from "../Model";
import { Knex } from "knex";
import { APIError } from "../../lib/error";
import { countDecimals } from "../../lib/helpers";

export class WalletModel extends Model {
  protected static tableName = "wallets";

  public static async findByUserId(userId: string): Promise<Wallet | null> {
    return this.table.where("userId", userId).select("*").first();
  }

  public static async createWallet(
    userId: string,
    trx: Knex.Transaction
  ): Promise<Wallet> {
    const id = v4();

    await super.insert({ id, userId }, trx);

    return { id, userId, balance: 0 };
  }

  private static checkAmount(amount: number) {
    if (amount === undefined) {
      throw new APIError(
        "Invalid amount",
        HttpStatusCode.BAD_REQUEST,
        "Please specify an amount"
      );
    }

    if (
      typeof amount !== "number" ||
      amount <= 0 ||
      countDecimals(amount) > 2
    ) {
      throw new APIError(
        "Invalid amount",
        HttpStatusCode.BAD_REQUEST,
        "Amount should be a number greater than 0 with a maximum of 2 decimal places"
      );
    }
  }

  public static async fundWallet(
    id: string,
    amount: number,
    trx: Knex.Transaction
  ): Promise<Wallet> {
    WalletModel.checkAmount(amount);

    if (!isUUID(id, 4)) {
      throw new APIError(
        "Invalid ID",
        HttpStatusCode.BAD_REQUEST,
        "Invalid Wallet ID"
      );
    }

    const wallet = await trx<Wallet>(this.tableName)
      .where("wallets.id", id)
      .select(
        trx.raw("wallets.*, CONCAT(u.firstName, \" \", u.lastName) as userName")
      )
      .innerJoin("users as u", "wallets.userId", "=", "u.id")
      .forUpdate()
      .first();

    if (!wallet) {
      throw new APIError(
        "Wallet not found",
        HttpStatusCode.NOT_FOUND,
        "No wallet found with the specified ID"
      );
    }

    await trx(this.tableName).where("id", id).increment("balance", amount);

    wallet.balance = (wallet.balance * 100 + amount * 100) / 100;

    return wallet;
  }

  public static async withdraw(
    userId: string,
    amount: number,
    trx: Knex.Transaction
  ): Promise<Wallet> {
    WalletModel.checkAmount(amount);

    const wallet = (await trx<Wallet>(this.tableName)
      .where("userId", userId)
      .select(
        trx.raw("wallets.*, CONCAT(u.firstName, \" \", u.lastName) as userName")
      )
      .innerJoin("users as u", "wallets.userId", "=", "u.id")
      .forUpdate()
      .first()) as Wallet;

    if (wallet.balance > amount) {
      await trx(this.tableName)
        .where("userId", userId)
        .decrement("balance", amount);

      wallet.balance = (wallet.balance * 100 - amount * 100) / 100;
      return wallet;
    }

    throw new APIError(
      "Insufficient funds",
      HttpStatusCode.BAD_REQUEST,
      "You don't have enough funds for this operation"
    );
  }
}
