import { notFound, redirect } from "next/navigation";
import { AuthRequired } from "@/components/auth-required";
import { parseAuthAttempt } from "@/lib/auth-login";
import { getCurrentUser } from "@/lib/server/auth";
import { getJobDetail } from "@/lib/server/jobs";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { jobId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentUser = await getCurrentUser();

  if (!jobId || jobId.includes("[")) {
    notFound();
  }

  if (!currentUser) {
    return <AuthRequired authAttempt={parseAuthAttempt(resolvedSearchParams?.authAttempt)} returnTo={`/jobs/${jobId}`} />;
  }

  const job = await getJobDetail(jobId, { userId: currentUser.id });
  if (!job) {
    notFound();
  }

  const shouldOpenSummary = job.status === "summary_ready" || job.status === "completed";
  redirect(`/jobs/${jobId}/${shouldOpenSummary ? "summary" : "annotation"}`);
}
