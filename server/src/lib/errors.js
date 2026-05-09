export class AppError extends Error {
  constructor(message, status = 400, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg = "Bad request") => new AppError(msg, 400, "BAD_REQUEST");
export const unauthorized = (msg = "Unauthorized") => new AppError(msg, 401, "UNAUTHORIZED");
export const forbidden = (msg = "Forbidden") => new AppError(msg, 403, "FORBIDDEN");
export const notFound = (msg = "Not found") => new AppError(msg, 404, "NOT_FOUND");
export const conflict = (msg = "Conflict") => new AppError(msg, 409, "CONFLICT");
