import dotenv from "dotenv";

dotenv.config();

export const config = {
  apiPort: Number(process.env.API_PORT || 8080),
  webOrigin: process.env.WEB_ORIGIN || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "local-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  localFileStorage: process.env.LOCAL_FILE_STORAGE !== "false",
  awsRegion: process.env.AWS_REGION || "ap-south-1",
  s3Bucket: process.env.AWS_S3_BUCKET || "dsr-pdfs",
  s3Endpoint: process.env.AWS_S3_ENDPOINT || "",
  s3ForcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true",
  queueRedisUrl: process.env.QUEUE_REDIS_URL || "redis://localhost:6380"
};
