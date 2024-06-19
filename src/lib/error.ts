import { HttpStatusCode } from "../@types";

class BaseError extends Error {
  public readonly name: string;
  public readonly httpCode: HttpStatusCode;
  public readonly description: string;
  public readonly isOperational: boolean;

  constructor(
    name: string,
    httpCode: HttpStatusCode,
    description: string,
    isOperational: boolean
  ) {
    super(description);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = name;
    this.httpCode = httpCode;
    this.description = description;
    this.isOperational = isOperational;

    Error.captureStackTrace(this);
  }
}

class APIError extends BaseError {
  constructor(
    name: string,
    httpCode = HttpStatusCode.INTERNAL_SERVER,
    description = "Internal Server Error",
    isOperational = true
  ) {
    super(name, httpCode, description, isOperational);
  }
}


export { APIError };
