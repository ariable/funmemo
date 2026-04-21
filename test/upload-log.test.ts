import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { buildUploadLogData, resolveClientIp } from "../src/lib/server/upload-log.ts";

test("resolveClientIp prefers the first forwarded IP", () => {
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.10, 10.0.0.2",
    "x-real-ip": "198.51.100.5",
  });

  assert.equal(resolveClientIp(headers), "203.0.113.10");
});

test("buildUploadLogData normalizes optional fields", () => {
  const data = buildUploadLogData({
    jobId: "job_123",
    userId: "user_123",
    userDisplayName: "张三",
    clientIp: " 203.0.113.10 ",
    userAgent: " Test Agent ",
    sourceFilename: "meeting.wav",
    audioDurationSec: 321.5,
    fileSizeBytes: 4096,
  });

  assert.deepEqual(data, {
    jobId: "job_123",
    userId: "user_123",
    userDisplayName: "张三",
    clientIp: "203.0.113.10",
    userAgent: "Test Agent",
    sourceFilename: "meeting.wav",
    audioDurationSec: 321.5,
    fileSizeBytes: 4096,
  });
});

test("deleting a job does not delete upload logs", async () => {
  const databaseUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;
  const adapter = new PrismaLibSql({ url: databaseUrl });
  const prisma = new PrismaClient({ adapter });
  const sourceFilename = `meeting-${Date.now()}.wav`;
  let jobId = "";

  try {
    const job = await prisma.job.create({
      data: {
        userId: "user_123",
        userDisplayName: "张三",
        title: "Test upload",
        sourceFilename,
      },
    });
    jobId = job.id;

    await prisma.uploadLog.create({
      data: {
        jobId,
        userId: "user_123",
        userDisplayName: "张三",
        clientIp: "203.0.113.10",
        sourceFilename,
        audioDurationSec: 123,
        fileSizeBytes: 2048,
      },
    });

    await prisma.job.delete({
      where: { id: jobId },
    });

    const logs = await prisma.uploadLog.findMany();
    const matchedLog = logs.find((log) => log.jobId === jobId);
    assert.ok(matchedLog);
    assert.equal(matchedLog.sourceFilename, sourceFilename);
  } finally {
    if (jobId) {
      await prisma.uploadLog.deleteMany({
        where: { jobId },
      });
    }
    await prisma.$disconnect();
  }
});
