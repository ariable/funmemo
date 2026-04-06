import { JobFlowClient } from "@/components/job-detail-client";

export const dynamic = "force-dynamic";

export default async function JobAnnotationPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return <JobFlowClient jobId={jobId} step="annotation" />;
}
