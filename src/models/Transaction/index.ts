import { Transaction, transactionType } from "../../@types";
import { v4 } from "uuid";
import { Model } from "../Model";
import { Knex } from "knex";

export class TransactionModel extends Model {
  protected static tableName = "transactions";

  public static async createTransaction(
    data: {
      walletId: string;
      amount: number;
      type: transactionType;
      narration: string;
    },
    trx: Knex.Transaction
  ): Promise<Transaction> {
    const { walletId, amount, type, narration } = data;
    const id = v4();

    await super.insert({ id, walletId, amount, type, narration }, trx);

    return { id, walletId, amount, type, narration };
  }

  public static async clearTransactions(walletId: string): Promise<void> {
    await this.table.where("walletId", walletId).delete();
  }

  public static async findByWalletId(walletId: string): Promise<Transaction | undefined> {
    return await this.table.where("walletId", walletId).select("*").first();
  }

  public static async findAllByWalletId(walletId: string): Promise<Transaction[]> {
    return await this.table.where("walletId", walletId).select("*");
  }
}
