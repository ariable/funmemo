import { prisma } from "@/lib/prisma";
import { handleTranscribe } from "./handlers/transcribe";
import { handleSummarize } from "./handlers/summarize";

const POLL_INTERVAL_MS = 3000;
let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;

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

export function startWorker() {
  if (running) return;
  running = true;
  log("worker started");
  void loop();
}

export function stopWorker() {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  log("worker stopped");
}
