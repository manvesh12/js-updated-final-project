import { Router } from "express";
import { canAdmin, canUpload } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { deletePdf, getPdf, putPdf } from "../lib/storage.js";

export const pdfRouter = Router();

function objectKey(projectId: bigint | number | string, annexureId: string) {
  return `${annexureId}-${projectId}.pdf`;
}

pdfRouter.post("/upload-pdf", async (req, res) => {
  const projectId = req.body?.projectId ? BigInt(req.body.projectId) : null;
  const annexureId = req.body?.annexureId || "anx3";
  const fileName = req.body?.fileName;
  const pdf = req.body?.pdf;

  if (annexureId === "final" && !canAdmin(req.user!.role)) {
    res.status(403).type("text/plain").send("Access Denied - Only Administrators can download or email the Final DSR PDF.");
    return;
  }
  if (!canUpload(req.user!.role) && !canAdmin(req.user!.role)) {
    res.status(403).json({ success: false, error: "Access denied" });
    return;
  }
  if (!projectId) {
    res.status(400).json({ success: false, error: "Missing projectId" });
    return;
  }

  const key = objectKey(projectId, annexureId);
  if (fileName == null || pdf == null) {
    await deletePdf(key).catch(() => undefined);
    await prisma.dsrFile.deleteMany({ where: { projectId, annexureId } });
    res.json({ success: true });
    return;
  }

  const bytes = Buffer.from(String(pdf), "base64");
  await putPdf(key, bytes);
  await prisma.dsrFile.upsert({
    where: { projectId_annexureId: { projectId, annexureId } },
    create: {
      projectId,
      annexureId,
      fileName,
      objectKey: key,
      sizeBytes: bytes.byteLength
    },
    update: {
      fileName,
      objectKey: key,
      sizeBytes: bytes.byteLength
    }
  });

  if (annexureId === "final") {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    let state: Record<string, unknown> = {};
    try {
      state = project?.projectState ? JSON.parse(project.projectState) : {};
      if (typeof state === "string") state = JSON.parse(state);
    } catch {
      state = {};
    }
    state.finalPdfGeneratedAt = new Date().toISOString();
    await prisma.project.update({ where: { id: projectId }, data: { projectState: JSON.stringify(state) } });
  }

  await prisma.workflowHistory.create({
    data: {
      reportId: projectId,
      action: "DOCUMENT_UPLOADED",
      remarks: `Uploaded document '${fileName}' for Annexure ${annexureId}`,
      performedBy: req.user!.id
    }
  });

  res.json({ success: true });
});

pdfRouter.get("/download-pdf", async (req, res) => {
  const projectId = req.query.projectId ? BigInt(String(req.query.projectId)) : null;
  const annexureId = String(req.query.annexureId || "anx3");
  const inline = String(req.query.inline || "false") === "true";

  if (annexureId === "final" && !canAdmin(req.user!.role)) {
    res.status(403).type("text/plain").send("Access Denied - Only Administrators can download or email the Final DSR PDF.");
    return;
  }
  if (!projectId) {
    res.status(400).type("text/plain").send("Missing projectId");
    return;
  }

  const file = await prisma.dsrFile.findUnique({ where: { projectId_annexureId: { projectId, annexureId } } });
  if (!file) {
    res.status(404).type("text/plain").send("PDF not found");
    return;
  }

  try {
    const bytes = await getPdf(file.objectKey);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(file.fileName)}"`);
    res.send(bytes);
  } catch (error) {
    res.status(404).type("text/plain").send(`PDF not found or error loading: ${(error as Error).message}`);
  }
});

pdfRouter.post("/email-final-pdf", async (req, res) => {
  if (!canAdmin(req.user!.role)) {
    res.status(403).type("text/plain").send("Access Denied - Only Administrators can download or email the Final DSR PDF.");
    return;
  }
  if (!req.body?.projectId || !req.body?.email) {
    res.status(400).json({ success: false, error: "Missing projectId or email" });
    return;
  }
  res.json({ success: true, message: `Final DSR PDF queued for ${req.body.email}` });
});
