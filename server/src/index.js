import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import tasksRoutes, { projectTaskRoutes, checklistRouter } from "./routes/tasks.routes.js";
import bugsRoutes, { projectBugRoutes } from "./routes/bugs.routes.js";
import notesRoutes, { projectNoteRoutes } from "./routes/notes.routes.js";
import commentsRoutes from "./routes/comments.routes.js";
import attachmentsRoutes from "./routes/attachments.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import searchRoutes from "./routes/search.routes.js";

import { errorHandler } from "./middleware/errorHandler.js";

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

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/projects/:projectId/tasks", projectTaskRoutes);
app.use("/api/projects/:projectId/bugs", projectBugRoutes);
app.use("/api/projects/:projectId/notes", projectNoteRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/checklist", checklistRouter);
app.use("/api/bugs", bugsRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/attachments", attachmentsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/search", searchRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
