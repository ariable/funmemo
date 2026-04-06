import { writeJobFile } from "@/lib/server/storage";
import { buildExportBaseName, buildMarkdownExport } from "@/lib/server/exports";
import { getJobDetail } from "@/lib/server/jobs";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = await getJobDetail(jobId);

  if (!job || (!job.summaryMarkdown && !job.summaryJson)) {
    return new Response("纪要尚未生成", { status: 404 });
  }

  const content = buildMarkdownExport(job);
  const filename = `${buildExportBaseName(job)}.md`;
  const filePath = await writeJobFile(jobId, `exports/${filename}`, content);

  await prisma.download.create({
    data: {
      jobId,
      downloadType: "markdown",
      filePath,
    },
  });

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
