import type { Knex } from "knex";

const tableName = "users";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable(tableName, (table: Knex.TableBuilder) => {
    table.uuid("id").primary();
    table.string("email", 255).unique().notNullable();
    table.string("firstName", 255).notNullable();
    table.string("lastName", 255).notNullable();
    table.string("password").notNullable();
    table.string("bvn", 11).notNullable();
    table.string("phoneNumber", 255).notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable(tableName);
}
