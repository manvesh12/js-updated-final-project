import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./lib/config.js";
import { requireAuth } from "./lib/auth.js";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { filesRouter } from "./routes/files.js";
import { jobsRouter } from "./routes/jobs.js";
import { pdfRouter } from "./routes/pdf.js";
import { projectsRouter } from "./routes/projects.js";
import { reportsRouter } from "./routes/reports.js";
import { usersRouter } from "./routes/users.js";

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.webOrigin, credentials: true }));
app.use(express.json({ limit: "80mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/files", requireAuth, filesRouter);
app.use("/api/jobs", requireAuth, jobsRouter);
app.use("/api/projects", requireAuth, projectsRouter);
app.use("/api/reports", requireAuth, reportsRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api", requireAuth, pdfRouter);

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Internal server error" });
});

app.listen(config.apiPort, () => {
  console.log(`DSR API running on http://localhost:${config.apiPort}`);
});
