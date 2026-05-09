import { verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { unauthorized } from "../lib/errors.js";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  whatsapp: true,
  phoneNumber: true,
  joinedDate: true,
  designation: true,
  isManager: true,
  managerId: true,
};

export const requireAuth = async (req, res, next) => {
  try {
    const cookieName = process.env.COOKIE_NAME ?? "pm_session";
    const token = req.cookies?.[cookieName];
    if (!token) throw unauthorized("Not signed in");

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: userSelect,
    });
    if (!user) throw unauthorized("Session is invalid");

    /* Impersonation tokens carry the original admin's id under `imp`.
       We surface both to the request so most route logic keeps using
       `req.user` (the impersonated user), and the rare consumer that
       cares — /me, audit logging — can read `impersonatedBy`. */
    if (payload.imp) {
      const impersonator = await prisma.user.findUnique({
        where: { id: payload.imp },
        select: { id: true, name: true, email: true, role: true },
      });
      if (impersonator) {
        user.impersonatedBy = impersonator;
      }
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(unauthorized("Session expired"));
    }
    next(err);
  }
};
