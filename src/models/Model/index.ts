import { Knex } from "knex";
import { database } from "../../config/database";

export abstract class Model {
  protected static tableName?: string;

  protected static get table() {
    if (!this.tableName) {
      throw new Error("The table name must be defined for the model.");
    }
    return database(this.tableName);
  }

  protected static async insert<Payload>(
    data: Payload,
    trx?: Knex.Transaction
  ): Promise<void> {
    if (!trx) {
      await this.table.insert(data);
      return;
    }

    await trx(this.tableName).insert(data);
  }

  public static async findById<Result>(id: string): Promise<Result> {
    return this.table.where("id", id).select("*").first();
  }

  protected static async findAll<Item>(): Promise<Item[]> {
    return this.table.select("*");
  }
}
