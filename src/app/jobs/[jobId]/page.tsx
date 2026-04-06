import { notFound, redirect } from "next/navigation";
import { getJobDetail } from "@/lib/server/jobs";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  if (!jobId || jobId.includes("[")) {
    notFound();
  }

  const job = await getJobDetail(jobId);
  if (!job) {
    notFound();
  }

  const shouldOpenSummary = job.status === "summary_ready" || job.status === "completed";
  redirect(`/jobs/${jobId}/${shouldOpenSummary ? "summary" : "annotation"}`);
}
