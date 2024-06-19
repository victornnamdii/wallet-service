import { type RequestHandler } from "express";
import { UserModel } from "../models/User";
import { decodeToken } from "../lib/helpers";
import { APIError } from "../lib/error";
import { HttpStatusCode } from "../@types";

const verifyToken: RequestHandler = async (req, res, next) => {
  try {
    const authorization = req.header("Authorization");
    if (
      !authorization ||
      !authorization.startsWith("Bearer ") ||
      authorization.length < 8
    ) {
      throw new APIError(
        "Invalid Authorization",
        HttpStatusCode.UNAUTHORIZED,
        "Invalid Authorization"
      );
    }

    const decodedToken = decodeToken(authorization.slice(7));

    const user = await UserModel.findByIdWithWalletId(decodedToken.id);
    if (!user) {
      throw new APIError(
        "Invalid Token",
        HttpStatusCode.FORBIDDEN,
        "Forbidden"
      );
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

export { verifyToken };
