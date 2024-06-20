import { Model } from "../Model";
import { HttpStatusCode, KnexError, User } from "../../@types";
import isNumeric from "validator/lib/isNumeric";
import isEmail from "validator/lib/isEmail";
import isMobilePhone from "validator/lib/isMobilePhone";
import isAlpha from "validator/lib/isAlpha";
import { APIError } from "../../lib/error";
import {
  comparePassword,
  generateToken,
  hashString,
  isUniqueConstraintError,
} from "../../lib/helpers";
import { encrypt } from "../../lib/crypto";
import checkBlacklist from "../../lib/karmaValidator";
import { Knex } from "knex";

export class UserModel extends Model {
  protected static tableName = "users";

  public static async findByEmail(email: string): Promise<User | undefined> {
    return await this.table.where("email", email).select("*").first();
  }

  public static async findByPhoneNumber(
    phoneNumber: string
  ): Promise<User | undefined> {
    return await this.table
      .where("phoneNumber", phoneNumber)
      .select("*")
      .first();
  }

  public static async deleteByEmail(email: string): Promise<void> {
    await this.table.where("email", email).delete();
  }

  public static async insertUser<T extends User>(
    data: T,
    trx: Knex.Transaction
  ): Promise<User> {
    const { id, email, firstName, lastName, phoneNumber, bvn, password } = data;
    try {
      if (typeof email !== "string" || !isEmail(email)) {
        throw new APIError(
          "Validation Error",
          HttpStatusCode.BAD_REQUEST,
          "Please enter a valid email"
        );
      }

      if (
        typeof firstName !== "string" ||
        firstName?.length < 1 ||
        !isAlpha(firstName)
      ) {
        throw new APIError(
          "Validation Error",
          HttpStatusCode.BAD_REQUEST,
          "Please enter a valid first name"
        );
      }

      if (
        typeof lastName !== "string" ||
        lastName?.length < 1 ||
        !isAlpha(lastName)
      ) {
        throw new APIError(
          "Validation Error",
          HttpStatusCode.BAD_REQUEST,
          "Please enter a valid last name"
        );
      }

      if (typeof password !== "string" || password?.length < 6) {
        throw new APIError(
          "Validation Error",
          HttpStatusCode.BAD_REQUEST,
          "Please enter a password with at least 6 characters"
        );
      }

      if (typeof bvn !== "string" || !isNumeric(bvn) || bvn.length !== 11) {
        throw new APIError(
          "Validation Error",
          HttpStatusCode.BAD_REQUEST,
          "Please enter a valid BVN"
        );
      }

      if (
        typeof phoneNumber !== "string" ||
        !isMobilePhone(phoneNumber, "any", { strictMode: true })
      ) {
        throw new APIError(
          "Validation Error",
          HttpStatusCode.BAD_REQUEST,
          "Please enter a valid phone number starting with '+' and a country code"
        );
      }

      await Promise.all([
        checkBlacklist(email),
        checkBlacklist(phoneNumber),
        checkBlacklist(bvn),
      ]);

      await super.insert(
        {
          id,
          bvn: encrypt(bvn),
          password: hashString(password),
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber,
        },
        trx
      );

      return { id, email, firstName, lastName, phoneNumber, bvn };
    } catch (error) {
      if (isUniqueConstraintError(error as KnexError)) {
        const knexError = error as KnexError;
        let value;
        let key;

        if (knexError.sqlMessage.includes("bvn")) {
          value = bvn;
          key = "BVN";
        } else if (knexError.sqlMessage.includes("email")) {
          value = email;
          key = "email";
        } else if (knexError.sqlMessage.includes("phonenumber")) {
          value = phoneNumber;
          key = "phone number";
        }

        throw new APIError(
          "Unique Constraint Error",
          HttpStatusCode.BAD_REQUEST,
          `User with ${key} '${value}' already exists`
        );
      }

      throw error;
    }
  }

  public static async login(credentials: {
    email: string;
    password: string;
  }): Promise<string> {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new APIError(
        "Missing Credentials",
        HttpStatusCode.BAD_REQUEST,
        "Please enter your email and password"
      );
    }

    if (
      typeof email === "string" &&
      isEmail(email) &&
      typeof password === "string"
    ) {
      const user = await UserModel.findByEmail(email);

      if (user !== undefined) {
        const authenticated = comparePassword(password, user.password!);
        if (authenticated) {
          return generateToken(user.id, "1h");
        }
      }
    }

    throw new APIError(
      "Invalid Credentials",
      HttpStatusCode.UNAUTHORIZED,
      "Email or password is incorrect"
    );
  }

  public static async findByIdWithWalletId(id: string): Promise<User | undefined> {
    return await this.table
      .where("users.id", id)
      .select("users.*", "w.id as walletId")
      .innerJoin("wallets as w", "users.id", "=", "w.userId")
      .first();
  }
}
