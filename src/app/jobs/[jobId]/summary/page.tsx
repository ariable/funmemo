import { AuthRequired } from "@/components/auth-required";
import { parseAuthAttempt } from "@/lib/auth-login";
import { JobFlowClient } from "@/components/job-detail-client";
import { getCurrentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function JobSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { jobId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <AuthRequired authAttempt={parseAuthAttempt(resolvedSearchParams?.authAttempt)} returnTo={`/jobs/${jobId}/summary`} />;
  }

  return <JobFlowClient jobId={jobId} step="summary" userDisplayName={currentUser.displayName} />;
}
