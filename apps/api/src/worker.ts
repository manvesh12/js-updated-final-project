import { Worker } from "bullmq";
import { redisConnection } from "./jobs/queues.js";

const connection = redisConnection();

new Worker(
  "pdf-jobs",
  async (job) => {
    console.log("PDF job received", job.id, job.name);
    return { ok: true, receivedAt: new Date().toISOString(), payload: job.data };
  },
  { connection }
);

new Worker(
  "excel-jobs",
  async (job) => {
    console.log("Excel job received", job.id, job.name);
    return { ok: true, receivedAt: new Date().toISOString(), payload: job.data };
  },
  { connection }
);

console.log("DSR background workers running.");
