import { forbidden } from "../lib/errors.js";

export const requireRole = (...allowed) => (req, res, next) => {
  if (!req.user) return next(forbidden());
  if (!allowed.includes(req.user.role)) {
    return next(forbidden(`Requires role: ${allowed.join("/")}`));
  }
  next();
};
