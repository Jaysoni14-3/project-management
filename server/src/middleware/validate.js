import { ZodError } from "zod";
import { badRequest } from "../lib/errors.js";

export const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) req.query = schemas.query.parse(req.query);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      const e = badRequest("Validation failed");
      e.details = issues;
      return next(e);
    }
    next(err);
  }
};
