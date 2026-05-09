import jwt from "jsonwebtoken";

export const signToken = (payload, opts = {}) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    ...opts,
  });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});
