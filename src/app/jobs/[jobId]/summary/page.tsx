import { AuthRequired } from "@/components/auth-required";
import { JobFlowClient } from "@/components/job-detail-client";
import { getCurrentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function JobSummaryPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <AuthRequired returnTo={`/jobs/${jobId}/summary`} />;
  }

  return <JobFlowClient jobId={jobId} step="summary" userDisplayName={currentUser.displayName} />;
}
