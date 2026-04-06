import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JobExportPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  redirect(`/jobs/${jobId}/summary`);
}
