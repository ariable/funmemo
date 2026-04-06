import { prisma } from "@/lib/prisma";
import { getJobDetail, upsertSummary } from "@/lib/server/jobs";
import { writeJobFile } from "@/lib/server/storage";
import { generateMeetingSummary } from "@/lib/server/summary";

export async function handleSummarize(jobId: string) {
  const job = await getJobDetail(jobId);
  if (!job || !job.transcript) {
    throw new Error("任务或 transcript 不存在");
  }

  const summaryRecord = await prisma.summary.findFirst({
    where: { jobId },
    orderBy: { updatedAt: "desc" },
  });
  const format = summaryRecord?.outputFormat === "json" ? "json" : "markdown";

  const result = await generateMeetingSummary(job.transcript, format);
  await upsertSummary(jobId, result.markdown, {
    contentJson: result.format === "json" ? JSON.stringify(result.structured) : undefined,
    outputFormat: result.format,
  });
  await writeJobFile(jobId, "summary/summary.md", result.markdown);

  if (result.format === "json") {
    await writeJobFile(jobId, "summary/summary.json", JSON.stringify(result.structured, null, 2));
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "summary_ready",
      currentStep: "summary",
    },
  });
}
