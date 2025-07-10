import { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { StatusCode } from "hono/utils/http-status";
import { ApplicationError } from "../errors";
import { env } from "../env";

export const globalErrorMiddleware: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException && err.message) {
    return c.json(
      {
        message: err.message,
      },
      err.status
    );
  }

  if (ApplicationError.isApplicationError(err)) {
    // Fix: Cast to number first, then to appropriate status code type
    const statusCode = Number(err.code) as
      | 400
      | 401
      | 403
      | 404
      | 409
      | 422
      | 500;
    return c.json(err.getResponseMessage(), statusCode);
  }

  console.error("APP ERROR:", err);
  if (env.NODE_ENV == "PRODUCTION")
    err.message = "Something went wrong, please try again later!";
  return c.json({ message: err.message }, 500);
};
