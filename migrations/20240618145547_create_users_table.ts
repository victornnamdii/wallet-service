import type { Knex } from "knex";

const tableName = "users";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable(tableName, (table: Knex.TableBuilder) => {
    table.string("bvn").alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable(tableName);
}
