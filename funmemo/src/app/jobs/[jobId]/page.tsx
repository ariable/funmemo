import { notFound } from "next/navigation";
import { JobDetailClient } from "@/components/job-detail-client";

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

  return <JobDetailClient jobId={jobId} />;
}
