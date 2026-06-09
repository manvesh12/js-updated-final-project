import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { putPdf } from "../lib/storage.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 80 * 1024 * 1024 } });

export const filesRouter = Router();

filesRouter.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "File is required" });
    return;
  }
  const key = `uploads/${Date.now()}-${randomUUID()}-${req.file.originalname}`;
  await putPdf(key, req.file.buffer);
  res.status(201).json({
    success: true,
    fileName: req.file.originalname,
    objectKey: key,
    contentType: req.file.mimetype,
    sizeBytes: req.file.size
  });
});
