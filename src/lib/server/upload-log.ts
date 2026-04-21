type HeaderReader = {
  get(name: string): string | null;
};

export function resolveClientIp(headers: HeaderReader) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")
      .map((value) => value.trim())
      .find(Boolean);

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return null;
}

export function buildUploadLogData(input: {
  jobId: string;
  userId: string;
  userDisplayName?: string | null;
  sourceFilename: string;
  audioDurationSec?: number | null;
  fileSizeBytes?: number | null;
  clientIp?: string | null;
  userAgent?: string | null;
}) {
  return {
    jobId: input.jobId,
    userId: input.userId,
    userDisplayName: input.userDisplayName?.trim() || null,
    clientIp: input.clientIp?.trim() || null,
    userAgent: input.userAgent?.trim() || null,
    sourceFilename: input.sourceFilename,
    audioDurationSec: input.audioDurationSec ?? null,
    fileSizeBytes: input.fileSizeBytes ?? null,
  };
}
