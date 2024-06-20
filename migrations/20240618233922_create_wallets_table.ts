import type { Knex } from "knex";

const tableName = "wallets";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable(tableName, (table: Knex.TableBuilder) => {
    table.string("currency", 15).defaultTo("NGN").notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable(tableName);
}
