import type { Job, SpeakerProfile, Summary } from "@prisma/client";
import type { JobCard, JobDetail, JobStatus, StructuredSummary, SummaryOutputFormat, Transcript } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { readJobJson } from "@/lib/server/storage";

const progressMap: Record<JobStatus, number> = {
  queued: 10,
  transcribing: 30,
  transcript_ready: 55,
  speaker_editing: 70,
  summarizing: 85,
  summary_ready: 100,
  completed: 100,
  failed: 100,
};

const statusLabelMap: Record<JobStatus, string> = {
  queued: "排队中",
  transcribing: "转录中",
  transcript_ready: "转录完成",
  speaker_editing: "待修正发言人",
  summarizing: "纪要生成中",
  summary_ready: "纪要已生成",
  completed: "已完成",
  failed: "处理失败",
};

function formatCreatedAt(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatMeetingAt(date: Date | null) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDuration(durationSec: number | null) {
  if (!durationSec || durationSec <= 0) {
    return "未知时长";
  }

  const minutes = Math.round(durationSec / 60);
  return `${minutes} 分钟`;
}

export function toJobCard(job: Job): JobCard {
  return {
    id: job.id,
    title: job.title || job.sourceFilename,
    sourceFilename: job.sourceFilename,
    meetingAtText: formatMeetingAt(job.meetingAt),
    status: job.status as JobStatus,
    statusLabel: statusLabelMap[job.status as JobStatus],
    currentStep: job.currentStep as JobCard["currentStep"],
    progress: progressMap[job.status as JobStatus],
    speakerCount: job.speakerCount ?? 0,
    durationText: formatDuration(job.audioDurationSec),
    createdAtText: formatCreatedAt(job.createdAt),
    language: job.language ?? "中文",
  };
}

export async function listJobs() {
  const jobs = await prisma.job.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return jobs.map(toJobCard);
}

function mapSpeakerProfiles(speakerProfiles: SpeakerProfile[]) {
  return speakerProfiles.map((speaker) => ({
    speakerId: speaker.speakerId,
    speakerName: speaker.speakerName ?? undefined,
    speakerRole: speaker.speakerRole ?? undefined,
    speakerDisplay: speaker.speakerDisplay ?? undefined,
    sortOrder: speaker.sortOrder,
  }));
}

export async function getJobDetail(jobId: string): Promise<JobDetail | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      speakerProfiles: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      summaries: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!job) {
    return null;
  }

  let transcript: Transcript | null = null;
  try {
    transcript = await readJobJson<Transcript>(jobId, "transcript/transcript.annotated.json");
  } catch {
    try {
      transcript = await readJobJson<Transcript>(jobId, "transcript/transcript.raw.json");
    } catch {
      transcript = null;
    }
  }

  if (transcript && transcript.speakerProfiles.length === 0 && job.speakerProfiles.length > 0) {
    transcript.speakerProfiles = mapSpeakerProfiles(job.speakerProfiles);
  }

  const latestSummaryRecord = job.summaries[0] ?? null;
  const summaryMarkdown: string | null = latestSummaryRecord?.contentMarkdown ?? null;
  const summaryFormat = (latestSummaryRecord?.outputFormat as SummaryOutputFormat) ?? null;

  let summaryJson: StructuredSummary | null = null;
  if (latestSummaryRecord?.contentJson) {
    try {
      summaryJson = JSON.parse(latestSummaryRecord.contentJson) as StructuredSummary;
    } catch {
      summaryJson = null;
    }
  }

  return {
    ...toJobCard(job),
    transcript,
    summaryMarkdown,
    summaryJson,
    summaryFormat,
  };
}

export async function upsertSummary(
  jobId: string,
  contentMarkdown: string,
  options?: { contentJson?: string; outputFormat?: SummaryOutputFormat },
) {
  const existing = await prisma.summary.findFirst({
    where: { jobId },
    orderBy: { updatedAt: "desc" },
  });

  const data = {
    contentMarkdown,
    contentJson: options?.contentJson ?? null,
    outputFormat: options?.outputFormat ?? "markdown",
    status: "ready" as const,
    generatedAt: new Date(),
  };

  if (existing) {
    return prisma.summary.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.summary.create({
    data: { jobId, ...data },
  });
}

export async function latestSummary(jobId: string): Promise<Summary | null> {
  return prisma.summary.findFirst({
    where: { jobId },
    orderBy: { updatedAt: "desc" },
  });
}
