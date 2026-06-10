import { Router } from "express";
import { ProjectStatus, Role } from "@prisma/client";
import { canAdmin } from "../lib/auth.js";
import { jsonSafe } from "../lib/json.js";
import { prisma } from "../lib/prisma.js";
import { toProjectDto } from "../lib/projects.js";
import { deletePdf } from "../lib/storage.js";
import { parseBigIntParam } from "../lib/validation.js";

export const projectsRouter = Router();

function parseStatus(status: unknown) {
  const value = String(status || "").toUpperCase().replaceAll(" ", "_");
  if (value === "COMPLETED") return ProjectStatus.COMPLETED;
  if (value === "ACTIVE") return ProjectStatus.ACTIVE;
  if (value === "ARCHIVED") return ProjectStatus.ARCHIVED;
  return ProjectStatus.IN_PROGRESS;
}

function visibleWhere(userRole: Role, district?: string | null) {
  if (canAdmin(userRole) || userRole === Role.REVIEWER || userRole === Role.IIT_ROPAR || userRole === Role.GIS) return {};
  if (district) return { district };
  return {};
}

projectsRouter.get("/", async (req, res) => {
  const projects = await prisma.project.findMany({
    where: visibleWhere(req.user!.role, req.user!.district),
    include: { files: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(jsonSafe(projects.map(toProjectDto)));
});

projectsRouter.post("/", async (req, res) => {
  const body = req.body || {};

  if (Array.isArray(body)) {
    await prisma.project.deleteMany({});
    const created = await Promise.all(
      body.map((project) =>
        prisma.project.create({
          data: {
            projectName: project.projectName || project.title || `District Survey Report - ${project.district || "Punjab"}`,
            title: project.title || project.projectName,
            district: project.district || "Punjab",
            year: project.year || "2025-26",
            mineral: project.mineral || "Sand",
            rivers: project.rivers || "Not specified",
            progress: Number(project.progress || 0),
            status: parseStatus(project.status),
            signatures: Number(project.signatures || 0),
            createdBy: req.user!.id,
            projectState: typeof project.projectState === "string" ? project.projectState : project.projectState ? JSON.stringify(project.projectState) : null
          }
        })
      )
    );
    res.json(jsonSafe({ success: true, projects: created.map(toProjectDto) }));
    return;
  }

  const created = await prisma.project.create({
    data: {
      projectName: body.projectName || body.title || `District Survey Report - ${body.district || "Punjab"}`,
      title: body.title || body.projectName,
      district: body.district || "Punjab",
      year: body.year || "2025-26",
      mineral: body.mineral || "Sand",
      rivers: body.rivers || "Not specified",
      progress: 0,
      status: parseStatus(body.status),
      signatures: 0,
      createdBy: req.user!.id,
      projectState: typeof body.projectState === "string" ? body.projectState : body.projectState ? JSON.stringify(body.projectState) : null
    },
    include: { files: true }
  });

  await prisma.workflowHistory.create({
    data: {
      reportId: created.id,
      action: "PROJECT_CREATED",
      remarks: `${created.district || "Punjab"} DSR project created for ${created.year || "2025-26"}`,
      performedBy: req.user!.id
    }
  });

  res.status(201).json(jsonSafe(toProjectDto(created)));
});

projectsRouter.get("/:id", async (req, res) => {
  const id = parseBigIntParam(req.params.id, res, "project id");
  if (!id) return;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { files: true }
  });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(jsonSafe(toProjectDto(project)));
});

projectsRouter.put("/:id/state", async (req, res) => {
  const id = parseBigIntParam(req.params.id, res, "project id");
  if (!id) return;
  const project = await prisma.project.update({
    where: { id },
    data: {
      projectState: req.body?.state == null ? null : typeof req.body.state === "string" ? req.body.state : JSON.stringify(req.body.state)
    },
    include: { files: true }
  });
  res.json(jsonSafe({ success: true, project: toProjectDto(project) }));
});

projectsRouter.delete("/:id", async (req, res) => {
  if (!canAdmin(req.user!.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const id = parseBigIntParam(req.params.id, res, "project id");
  if (!id) return;
  const files = await prisma.dsrFile.findMany({ where: { projectId: id } });
  await Promise.all(files.map((file) => deletePdf(file.objectKey).catch(() => undefined)));
  await prisma.project.delete({ where: { id } });
  res.json({ success: true, message: "Project deleted successfully" });
});
