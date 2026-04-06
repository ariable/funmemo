import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const storageRoot = process.env.STORAGE_ROOT
  ? path.resolve(process.env.STORAGE_ROOT)
  : path.join(process.cwd(), "storage");

export function getStorageRoot() {
  return storageRoot;
}

export function getJobDir(jobId: string) {
  return path.join(storageRoot, "jobs", jobId);
}

export function getJobPath(jobId: string, ...parts: string[]) {
  const jobDir = getJobDir(jobId);
  const resolved = path.resolve(jobDir, ...parts);
  if (!resolved.startsWith(jobDir + path.sep) && resolved !== jobDir) {
    throw new Error("Invalid path: escapes job directory");
  }
  return resolved;
}

export async function ensureJobDirectories(jobId: string) {
  await Promise.all(
    ["source", "transcript", "summary", "exports", "meta"].map((segment) =>
      mkdir(getJobPath(jobId, segment), { recursive: true }),
    ),
  );
}

export async function writeJobFile(jobId: string, relativePath: string, content: string | Buffer) {
  const targetPath = getJobPath(jobId, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content);
  return targetPath;
}

export async function readJobText(jobId: string, relativePath: string) {
  return readFile(getJobPath(jobId, relativePath), "utf8");
}

export async function readJobJson<T>(jobId: string, relativePath: string) {
  const raw = await readJobText(jobId, relativePath);
  return JSON.parse(raw) as T;
}

export function getMaxUploadBytes() {
  return MAX_UPLOAD_BYTES;
}

export async function writeJobFileStream(jobId: string, relativePath: string, file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`文件大小超过限制（最大 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024 / 1024)} GB）`);
  }
  const targetPath = getJobPath(jobId, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  const webStream = file.stream();
  const nodeReadable = Readable.fromWeb(webStream as Parameters<typeof Readable.fromWeb>[0]);
  const ws = createWriteStream(targetPath);
  await pipeline(nodeReadable, ws);
  return targetPath;
}

export async function fileSize(filePath: string) {
  const info = await stat(filePath);
  return info.size;
}

export async function removeJobDirectory(jobId: string) {
  await rm(getJobDir(jobId), { recursive: true, force: true });
}
