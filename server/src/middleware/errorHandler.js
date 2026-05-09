import { AppError } from "../lib/errors.js";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    const body = { error: err.message };
    if (err.code) body.code = err.code;
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  // Prisma — unique constraint violation
  if (err.code === "P2002") {
    return res.status(409).json({ error: "Resource already exists" });
  }
  // Prisma — record not found
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Not found" });
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
