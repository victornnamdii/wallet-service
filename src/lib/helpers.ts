import { hashSync, genSaltSync, compare } from "bcrypt";
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

export const comparePassword = async (password: string, hash: string) => {
  return await compare(password, hash);
};

export const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, env.SECRET_KEY, { expiresIn: "1h" });
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

export const countDecimals = (number: number) => {
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
