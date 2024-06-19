import type { Knex } from "knex";
import { transactionType } from "../src/@types";

const tableName = "transactions";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable(tableName, (table: Knex.TableBuilder) => {
    table.uuid("id").primary();
    table
      .uuid("walletId")
      .references("id")
      .inTable("wallets")
      .onDelete("CASCADE");
    table.decimal("amount", 15, 2).notNullable();
    table
      .enu("type", [transactionType.Credit, transactionType.Debit])
      .notNullable();
    table.string("narration", 255).notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable(tableName);
}
