import { getCurrentUserFromRequestHeaders } from "@/lib/server/auth";
import { writeJobFile } from "@/lib/server/storage";
import { resolveClientIp } from "@/lib/server/upload-log";
import { buildExportBaseName, buildWordDocxExport } from "@/lib/server/exports";
import { getJobDetail } from "@/lib/server/jobs";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const currentUser = getCurrentUserFromRequestHeaders({
    get(name) {
      return request.headers.get(name);
    },
  });

  if (!currentUser) {
    return new Response("未登录，请通过统一登录入口访问。", { status: 401 });
  }

  const job = await getJobDetail(jobId, { userId: currentUser.id });

  if (!job || (!job.summaryMarkdown && !job.summaryJson)) {
    return new Response("纪要尚未生成", { status: 404 });
  }

  const content = await buildWordDocxExport(job);
  const filename = `${buildExportBaseName(job)}.docx`;
  const filePath = await writeJobFile(jobId, `exports/${filename}`, content);

  await prisma.download.create({
    data: {
      jobId,
      userId: currentUser.id,
      userDisplayName: currentUser.displayName,
      downloadType: "word",
      filePath,
      clientIp: resolveClientIp(request.headers),
      userAgent: request.headers.get("user-agent"),
    },
  });

  return new Response(new Uint8Array(content), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
