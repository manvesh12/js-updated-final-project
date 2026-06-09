import { Router } from "express";
import { canUpload } from "../lib/auth.js";
import { excelQueue, pdfQueue } from "../jobs/queues.js";

export const jobsRouter = Router();

jobsRouter.post("/pdf", async (req, res) => {
  if (!canUpload(req.user!.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const job = await pdfQueue.add("generate-pdf", req.body || {});
  res.status(202).json({ jobId: job.id, status: "queued" });
});

jobsRouter.post("/excel", async (req, res) => {
  if (!canUpload(req.user!.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const job = await excelQueue.add("process-excel", req.body || {});
  res.status(202).json({ jobId: job.id, status: "queued" });
});
