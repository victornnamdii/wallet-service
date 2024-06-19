import type { Knex } from "knex";

const tableName = "wallets";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable(tableName, (table: Knex.TableBuilder) => {
    table.uuid("id").primary();
    table.uuid("userId").references("id").inTable("users").onDelete("CASCADE");
    table.string("currency").defaultTo("NGN").notNullable();
    table.decimal("balance", 15, 2).defaultTo(0);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable(tableName);
}
