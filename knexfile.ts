import { Knex } from "knex";
import env from "./src/config/env";

const config: Knex.Config = {
  client: "mysql2",
  connection: {
    uri: env.DB_URL,
  },
  migrations: {
    directory: "./migrations",
  },
};

export default config;
