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
}
