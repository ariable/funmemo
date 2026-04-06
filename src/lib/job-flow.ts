import type { JobCard, JobDetail, JobStatus, JobStep } from "@/lib/types";

export type FlowPage = "annotation" | "summary" | "export";

export const flowLabels: Record<FlowPage, string> = {
  annotation: "发言人修正",
  summary: "纪要生成",
  export: "导出预览",
};

function resolveFlowPage(status: JobStatus, currentStep: JobStep): FlowPage {
  if (status === "summary_ready" || status === "completed" || currentStep === "export") {
    return "export";
  }

  if (status === "summarizing" || currentStep === "summary") {
    return "summary";
  }

  return "annotation";
}

export function getJobFlowPath(job: Pick<JobCard, "id" | "status" | "currentStep"> | JobDetail) {
  return `/jobs/${job.id}/${resolveFlowPage(job.status, job.currentStep)}`;
}

export function getStepPath(jobId: string, step: FlowPage) {
  return `/jobs/${jobId}/${step}`;
}
