import { Server as IOServer } from "socket.io";
import { verifyToken } from "./jwt.js";
import { prisma } from "./prisma.js";

/* Tiny cookie header parser. The `cookie` package is hoisted in our
   tree (cookie-parser depends on it), but we don't want to take a
   direct dep on it just for one header — keep this self-contained. */
const parseCookies = (header = "") => {
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    if (k) out[k] = v;
  });
  return out;
};

/* Authenticate the handshake using the same JWT cookie the REST routes
   use. We intentionally don't accept tokens via query/auth payload —
   one auth path keeps the threat surface tight. */
const authMiddleware = async (socket, next) => {
  try {
    const cookieName = process.env.COOKIE_NAME ?? "pm_session";
    const cookies = parseCookies(socket.handshake.headers.cookie || "");
    const token = cookies[cookieName];
    if (!token) return next(new Error("unauthorized"));

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true },
    });
    if (!user) return next(new Error("unauthorized"));

    socket.data.userId = user.id;
    socket.data.userName = user.name;
    next();
  } catch (err) {
    next(new Error("unauthorized"));
  }
};

/* Attach Socket.IO to the existing http.Server. Each connected socket:
   - joins `user:<id>` (for cross-tab signals like read-receipts)
   - joins `conversation:<id>` for every conversation it participates in
   New conversations created during the session join via `conversation:join`
   so the client can subscribe immediately after creating a DM. */
export const initSocketIO = (httpServer) => {
  const io = new IOServer(httpServer, {
    cors: {
      origin: (origin, cb) => {
        const allowed = (process.env.CORS_ORIGIN ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (!origin) return cb(null, true);
        if (allowed.length === 0 || allowed.includes(origin)) {
          return cb(null, true);
        }
        cb(new Error(`Socket.IO CORS blocked: ${origin}`));
      },
      credentials: true,
    },
  });

  io.use(authMiddleware);

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;

    socket.join(`user:${userId}`);

    /* Subscribe the socket to every conversation this user is in. The
       same query happens once per connect — typical workspace user is
       in <100 conversations so the cost is negligible. */
    try {
      const parts = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      for (const p of parts) {
        socket.join(`conversation:${p.conversationId}`);
      }
    } catch (err) {
      console.error("[socket] join conversations failed:", err);
    }

    /* Late-join for conversations created after this socket connected
       (e.g., the client just opened a new DM). The client emits this
       with the conversation id; we re-verify membership before letting
       them subscribe. */
    socket.on("conversation:join", async (conversationId, ack) => {
      try {
        if (typeof conversationId !== "string" || !conversationId) {
          if (typeof ack === "function") ack({ ok: false });
          return;
        }
        const part = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: { conversationId, userId },
          },
          select: { conversationId: true },
        });
        if (!part) {
          if (typeof ack === "function") ack({ ok: false });
          return;
        }
        socket.join(`conversation:${conversationId}`);
        if (typeof ack === "function") ack({ ok: true });
      } catch (err) {
        console.error("[socket] conversation:join failed:", err);
        if (typeof ack === "function") ack({ ok: false });
      }
    });
  });

  return io;
};
