import { ErrorRequestHandler, RequestHandler } from "express";
import { ResponseDTO } from "../lib/response";

const errorRequestHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res
      .status(400)
      .json(new ResponseDTO("error", "Invalid JSON syntax"));
  }

  if (err.isOperational) {
    return res
      .status(err.httpCode)
      .json(new ResponseDTO("error", err.description));
  }

  console.log(err);
  res.status(500).json(new ResponseDTO("error", "Internal Server Error"));
};

const pageNotFoundHandler: RequestHandler = (req, res) => {
  res
    .status(404)
    .json(new ResponseDTO("error", `${req.method} ${req.url} not found`));
};

export { errorRequestHandler, pageNotFoundHandler };
