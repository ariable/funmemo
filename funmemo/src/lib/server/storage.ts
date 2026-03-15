import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

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
  return path.join(getJobDir(jobId), ...parts);
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

export async function fileSize(filePath: string) {
  const info = await stat(filePath);
  return info.size;
}

export async function removeJobDirectory(jobId: string) {
  await rm(getJobDir(jobId), { recursive: true, force: true });
}
