import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { signToken, cookieOptions } from "../lib/jwt.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "../schemas/auth.schema.js";
import { conflict, unauthorized, badRequest, notFound, forbidden } from "../lib/errors.js";

const router = Router();
const COOKIE = () => process.env.COOKIE_NAME ?? "pm_session";

/* When REGISTER_REQUIRES_ADMIN is on, only privileged roles (admin or
   manager) can create users — matches the product rule that employees
   can't onboard others. Env name is kept for backward compat. */
const registerHandlers =
  process.env.REGISTER_REQUIRES_ADMIN === "true"
    ? [requireAuth, requireRole("admin", "manager")]
    : [];

router.post(
  "/register",
  ...registerHandlers,
  validate({ body: registerSchema }),
  async (req, res) => {
    const { email, password, name, role, ...extra } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("Email already registered");

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role ?? "employee",
        ...extra,
      },
      select: {
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
      },
    });

    res.status(201).json(user);
  }
);

router.post("/login", validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw unauthorized("Invalid credentials");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw unauthorized("Invalid credentials");

  const token = signToken({ sub: user.id });
  res.cookie(COOKIE(), token, cookieOptions());

  const { passwordHash: _ph, ...safe } = user;
  res.json(safe);
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE(), { path: "/" });
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

router.post(
  "/change-password",
  requireAuth,
  validate({ body: changePasswordSchema }),
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw badRequest("Current password is incorrect");
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    res.json({ ok: true });
  }
);

/* ──────────────────────────────────────────────────────────────────
   Impersonation — admin-only "Login as <user>" flow.

   Issues a session cookie for the target user but tags the JWT with
   `imp: <originalAdminId>`. The auth middleware surfaces that as
   `req.user.impersonatedBy`, so the frontend can show a banner and
   any future audit logging can record who actually performed an
   action while impersonating.

   Nested impersonation is intentionally blocked — once you're
   impersonating, you must stop before starting again. Self-
   impersonation is also a no-op (just continue with the current
   session).
   ────────────────────────────────────────────────────────────────── */

router.post(
  "/impersonate/:userId",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    if (req.user.impersonatedBy) {
      throw forbidden("Already impersonating — stop first to switch");
    }
    if (req.params.userId === req.user.id) {
      throw badRequest("That's already you");
    }
    const target = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { ...{
        id: true, email: true, name: true, role: true, avatar: true,
        whatsapp: true, phoneNumber: true, joinedDate: true,
        designation: true, isManager: true, managerId: true,
      } },
    });
    if (!target) throw notFound("User not found");

    /* Shorter expiry on impersonation tokens — these are workflow
       conveniences, not durable sessions. 4h is plenty for a debug
       session and limits exposure if the cookie leaks. */
    const token = signToken(
      { sub: target.id, imp: req.user.id },
      { expiresIn: "4h" }
    );
    res.cookie(COOKIE(), token, cookieOptions());
    res.json({ ...target, impersonatedBy: { id: req.user.id, name: req.user.name } });
  }
);

router.post("/stop-impersonating", requireAuth, async (req, res) => {
  const adminId = req.user.impersonatedBy?.id;
  if (!adminId) throw badRequest("Not currently impersonating");

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: {
      id: true, email: true, name: true, role: true, avatar: true,
      whatsapp: true, phoneNumber: true, joinedDate: true,
      designation: true, isManager: true, managerId: true,
    },
  });
  if (!admin) throw notFound("Original admin no longer exists");

  const token = signToken({ sub: admin.id });
  res.cookie(COOKIE(), token, cookieOptions());
  res.json(admin);
});

export default router;
