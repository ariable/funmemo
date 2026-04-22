import { prisma } from "@/lib/prisma";
import { handleTranscribe } from "./handlers/transcribe";
import { handleSummarize } from "./handlers/summarize";

const POLL_INTERVAL_MS = 3000;
const SHUTDOWN_WAIT_MS = 1000;
let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let activeLoop: Promise<void> | null = null;
let shutdownPromise: Promise<void> | null = null;
let signalHandlersRegistered = false;

function log(message: string) {
  console.log(`[worker ${new Date().toISOString()}] ${message}`);
}

async function pollOnce() {
  const job = await prisma.job.findFirst({
    where: { status: { in: ["queued", "summarizing"] } },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return;

  if (job.status === "queued") {
    const claimed = await prisma.job.updateMany({
      where: { id: job.id, status: "queued" },
      data: { status: "transcribing", currentStep: "transcription" },
    });
    if (claimed.count === 0) return;

    log(`transcribing job ${job.id} (${job.sourceFilename})`);
    try {
      await handleTranscribe(job.id);
      log(`transcription done for job ${job.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "转录失败";
      log(`transcription failed for job ${job.id}: ${message}`);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "failed", errorMessage: message },
      });
    }
  } else if (job.status === "summarizing") {
    const claimed = await prisma.job.updateMany({
      where: { id: job.id, status: "summarizing", updatedAt: job.updatedAt },
      data: { status: "summarizing" },
    });
    if (claimed.count === 0) return;

    log(`summarizing job ${job.id}`);
    try {
      await handleSummarize(job.id);
      log(`summary done for job ${job.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "纪要生成失败";
      log(`summary failed for job ${job.id}: ${message}`);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "failed", errorMessage: message },
      });
    }
  }
}

async function loop() {
  if (!running) return;

  try {
    await pollOnce();
  } catch (error) {
    log(`poll error: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (running) {
    timer = setTimeout(() => void loop(), POLL_INTERVAL_MS);
  }
}

function runLoop() {
  const currentLoop = loop().finally(() => {
    if (activeLoop === currentLoop) {
      activeLoop = null;
    }
  });
  activeLoop = currentLoop;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
  } catch (error) {
    log(`prisma disconnect failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function registerSignalHandlers() {
  if (signalHandlersRegistered) return;
  signalHandlersRegistered = true;

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }
}

export function startWorker() {
  if (running) return;
  registerSignalHandlers();
  running = true;
  log("worker started");
  runLoop();
}

export async function stopWorker({ disconnect = false }: { disconnect?: boolean } = {}) {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  if (activeLoop) {
    await Promise.race([
      activeLoop.catch(() => undefined),
      wait(SHUTDOWN_WAIT_MS),
    ]);
  }

  if (disconnect) {
    await disconnectPrisma();
  }

  log("worker stopped");
}

async function shutdown(signal: NodeJS.Signals) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    log(`${signal} received, shutting down`);
    await stopWorker({ disconnect: true });
    log("shutdown complete");
    process.exit(0);
  })().catch((error) => {
    log(`shutdown failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });

  return shutdownPromise;
}
