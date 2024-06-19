import axios from "axios";
import env from "../config/env";
import { APIError } from "./error";
import { HttpStatusCode } from "../@types";

const karmaClient = axios.create({
  baseURL: env.KARMA_DB_URL,
  headers: {
    Authorization: `Bearer ${env.ADJUTOR_SECRET}`,
  },
  validateStatus: (status) => status === 200 || status === 404,
});

const checkBlacklist = async (identity: string) => {
  const { status, data } = await karmaClient.get(identity);
  if (status === 200) {
    console.log(data);
    throw new APIError(
      "Karma Blacklist",
      HttpStatusCode.BAD_REQUEST,
      "You have been blacklisted and not allowed to create a new account"
    );
  }
};

export default checkBlacklist;
