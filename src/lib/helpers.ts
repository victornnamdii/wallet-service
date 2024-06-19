import { hashSync, genSaltSync, compareSync } from "bcrypt";
import jwt, {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
} from "jsonwebtoken";
import { HttpStatusCode, KnexError } from "../@types";
import env from "../config/env";
import { APIError } from "./error";

export const hashString = (string: string) => {
  const salt = genSaltSync(10);
  return hashSync(string, salt);
};

export const comparePassword = (password: string, hash: string) => {
  return compareSync(password, hash);
};

export const generateToken = (userId: string, expiresIn: string) => {
  return jwt.sign({ id: userId }, env.SECRET_KEY, { expiresIn: expiresIn });
};

export const decodeToken = (token: string) => {
  try {
    const decodedToken = jwt.verify(token, env.SECRET_KEY) as {
      id: string;
    };

    return decodedToken;
  } catch (error) {
    if (
      error instanceof JsonWebTokenError ||
      error instanceof NotBeforeError ||
      error instanceof TokenExpiredError
    ) {
      throw new APIError(
        "Invalid Token",
        HttpStatusCode.FORBIDDEN,
        "Forbidden"
      );
    }
    throw error;
  }
};

export const isUniqueConstraintError = (err: KnexError) => {
  if (err instanceof Error) {
    return err.code === "ER_DUP_ENTRY";
  }
  return false;
};

const countDecimals = (number: number) => {
  const text = number.toString();

  if (text.indexOf("e-") !== -1) {
    const [wholeNumber, RHS] = text.split("e-");
    let decimalPlaces = parseInt(RHS, 10);
    if (decimalPlaces > 0) {
      if (wholeNumber.indexOf(".") !== -1) {
        decimalPlaces += wholeNumber.split(".")[1].length;
      }
      return decimalPlaces;
    }
    throw new Error("Unsupported Number");
  }

  if (Math.floor(number) !== number) {
    return text.split(".")[1]?.length || 0;
  }

  return 0;
};

export const checkAmount = (amount: number) => {
  if (amount === undefined) {
    throw new APIError(
      "Invalid amount",
      HttpStatusCode.BAD_REQUEST,
      "Please specify an amount"
    );
  }

  if (typeof amount !== "number" || amount <= 0 || countDecimals(amount) > 2) {
    throw new APIError(
      "Invalid amount",
      HttpStatusCode.BAD_REQUEST,
      "Amount should be a number greater than 0 with a maximum of 2 decimal places"
    );
  }
};
