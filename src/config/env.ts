import dotenv from "dotenv";

dotenv.config();

const env = {
  DB_URL: process.env.DB_URL as string,
  PORT: process.env.PORT as string,
  KARMA_DB_URL: process.env.KARMA_DB_URL as string,
  ADJUTOR_SECRET: process.env.ADJUTOR_SECRET as string,
  CRYPTO_ALGORITHM: process.env.CRYPTO_ALGORITHM as string,
  CRYPTO_IV: process.env.CRYPTO_IV as string,
  CRYPTO_KEY: process.env.CRYPTO_KEY as string,
  SECRET_KEY: process.env.SECRET_KEY as string
};

export default env;
