import { AuthRequired } from "@/components/auth-required";
import { JobFlowClient } from "@/components/job-detail-client";
import { getCurrentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function JobAnnotationPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <AuthRequired />;
  }

  return <JobFlowClient jobId={jobId} step="annotation" userDisplayName={currentUser.displayName} />;
}
