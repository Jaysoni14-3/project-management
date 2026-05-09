import "dotenv/config";
import "express-async-errors";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import tasksRoutes, { projectTaskRoutes, checklistRouter } from "./routes/tasks.routes.js";
import bugsRoutes, { projectBugRoutes } from "./routes/bugs.routes.js";
import modulesRoutes, { projectModuleRoutes } from "./routes/modules.routes.js";
import notesRoutes, { projectNoteRoutes } from "./routes/notes.routes.js";
import commentsRoutes from "./routes/comments.routes.js";
import attachmentsRoutes from "./routes/attachments.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import searchRoutes from "./routes/search.routes.js";
import conversationsRoutes from "./routes/conversations.routes.js";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";
import { initSocketIO } from "./lib/socketio.js";
import { setIo } from "./lib/realtime.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = (process.env.CORS_ORIGIN ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      // Allow non-browser requests (curl, server-to-server) which have no origin
      if (!origin) return cb(null, true);
      if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
/* Tag every request with an id so error responses + server logs can
   share it. Mounted after parsers so SyntaxError from express.json()
   still funnels through our errorHandler with the id attached. */
app.use(requestId);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/projects/:projectId/tasks", projectTaskRoutes);
app.use("/api/projects/:projectId/bugs", projectBugRoutes);
app.use("/api/projects/:projectId/modules", projectModuleRoutes);
app.use("/api/projects/:projectId/notes", projectNoteRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/checklist", checklistRouter);
app.use("/api/bugs", bugsRoutes);
app.use("/api/modules", modulesRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/attachments", attachmentsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/conversations", conversationsRoutes);

/* 404 handler for unmatched routes — must come AFTER all routers and
   BEFORE the error handler. Returns the same JSON shape as other
   errors so the client can render it via ErrorState. */
app.use("/api/*", notFoundHandler);

app.use(errorHandler);

/* Wrap Express in an http.Server so Socket.IO can attach. The chat
   surface uses Socket.IO for real-time delivery; REST routes still
   serve the same endpoints. setIo() makes the io instance available
   to routes that need to broadcast (e.g., POST /messages). */
const httpServer = http.createServer(app);
const io = initSocketIO(httpServer);
setIo(io);

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
