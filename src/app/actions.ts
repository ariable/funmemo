"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { saveAppConfig } from "@/lib/server/config";
import { transcribeWithFunAsr } from "@/lib/server/funasr";
import { getJobDetail } from "@/lib/server/jobs";
import { ensureJobDirectories, fileSize, getMaxUploadBytes, readJobJson, removeJobDirectory, writeJobFile, writeJobFileStream } from "@/lib/server/storage";
import { applySpeakerProfiles } from "@/lib/server/transcript";
import { buildUploadLogData, resolveClientIp } from "@/lib/server/upload-log";
import type { SpeakerProfileInput, SummaryOutputFormat, Transcript } from "@/lib/types";

export async function saveSettingsAction(
  _previousState: { success?: boolean; error?: string } | undefined,
  formData: FormData,
) {
  try {
    await saveAppConfig({
      transcriptionApiBaseUrl: String(formData.get("transcriptionApiBaseUrl") ?? ""),
      transcriptionApiToken: String(formData.get("transcriptionApiToken") ?? ""),
      transcriptionModel: String(formData.get("transcriptionModel") ?? ""),
      llmApiBaseUrl: String(formData.get("llmApiBaseUrl") ?? ""),
      llmApiKey: String(formData.get("llmApiKey") ?? ""),
      llmModel: String(formData.get("llmModel") ?? ""),
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "设置保存失败",
    };
  }
}

export async function uploadJobAction(
  _previousState: { id?: string; error?: string } | undefined,
  formData: FormData,
) {
  const requestHeaders = await headers();
  const file = formData.get("file");
  const titleInput = formData.get("title");
  const meetingAtInput = formData.get("meetingAt");
  const meetingLocationInput = formData.get("meetingLocation");

  if (!(file instanceof File)) {
    return { error: "请上传音频文件。" };
  }

  if (file.size > getMaxUploadBytes()) {
    return { error: `文件大小超过限制（最大 ${Math.round(getMaxUploadBytes() / 1024 / 1024 / 1024)} GB）` };
  }

  const title = typeof titleInput === "string" ? titleInput.trim() : "";
  const meetingAtRaw = typeof meetingAtInput === "string" ? meetingAtInput.trim() : "";
  const meetingLocation = typeof meetingLocationInput === "string" ? meetingLocationInput.trim() : "";
  const meetingAt = meetingAtRaw ? new Date(meetingAtRaw) : null;
  const sourceFilename = file.name || `meeting-${Date.now()}.wav`;

  const job = await prisma.job.create({
    data: {
      title: title || path.parse(sourceFilename).name,
      meetingAt: meetingAt && !Number.isNaN(meetingAt.getTime()) ? meetingAt : null,
      meetingLocation: meetingLocation || null,
      sourceFilename,
      status: "queued",
      currentStep: "upload",
    },
  });

  try {
    await ensureJobDirectories(job.id);
    const sourcePath = await writeJobFileStream(
      job.id,
      path.join("source", sourceFilename),
      file,
    );
    const sourceSizeBytes = await fileSize(sourcePath);

    await prisma.jobFile.create({
      data: {
        jobId: job.id,
        fileType: "source_audio",
        path: sourcePath,
        mimeType: file.type || "audio/*",
        sizeBytes: sourceSizeBytes,
      },
    });

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "transcribing",
        currentStep: "transcription",
      },
    });

    const rawTranscript = await transcribeWithFunAsr(sourcePath, sourceFilename);
    const annotatedTranscript = applySpeakerProfiles(rawTranscript, rawTranscript.speakerProfiles);

    const rawPath = await writeJobFile(
      job.id,
      "transcript/transcript.raw.json",
      JSON.stringify(rawTranscript, null, 2),
    );
    const annotatedPath = await writeJobFile(
      job.id,
      "transcript/transcript.annotated.json",
      JSON.stringify(annotatedTranscript, null, 2),
    );

    await prisma.jobFile.createMany({
      data: [
        {
          jobId: job.id,
          fileType: "transcript_raw",
          path: rawPath,
          mimeType: "application/json",
        },
        {
          jobId: job.id,
          fileType: "transcript_annotated",
          path: annotatedPath,
          mimeType: "application/json",
        },
      ],
    });

    await prisma.speakerProfile.createMany({
      data: annotatedTranscript.speakerProfiles.map((speaker) => ({
        jobId: job.id,
        speakerId: speaker.speakerId,
        speakerName: speaker.speakerName,
        speakerRole: speaker.speakerRole,
        speakerDisplay: speaker.speakerDisplay,
        sortOrder: speaker.sortOrder,
      })),
    });

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "transcript_ready",
        currentStep: "annotation",
        audioDurationSec: annotatedTranscript.duration,
        segmentCount: annotatedTranscript.segments.length,
        speakerCount: annotatedTranscript.speakerProfiles.length,
        language: annotatedTranscript.language,
      },
    });

    await prisma.uploadLog.create({
      data: buildUploadLogData({
        jobId: job.id,
        clientIp: resolveClientIp(requestHeaders),
        userAgent: requestHeaders.get("user-agent"),
        sourceFilename,
        audioDurationSec: annotatedTranscript.duration,
        fileSizeBytes: sourceSizeBytes,
      }),
    });

    revalidatePath("/");
    revalidatePath(`/jobs/${job.id}`);
    return { id: job.id };
  } catch (error) {
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "上传处理失败",
      },
    });
    await removeJobDirectory(job.id);

    return {
      error: error instanceof Error ? error.message : "上传处理失败",
    };
  }
}

export async function saveSpeakersAction(jobId: string, speakerProfiles: SpeakerProfileInput[]) {
  const job = await getJobDetail(jobId);
  if (!job || !job.transcript) {
    throw new Error("任务或 transcript 不存在");
  }

  const annotatedTranscript = applySpeakerProfiles(job.transcript, speakerProfiles);

  await writeJobFile(
    jobId,
    "transcript/transcript.annotated.json",
    JSON.stringify(annotatedTranscript, null, 2),
  );

  await prisma.$transaction([
    prisma.speakerProfile.deleteMany({ where: { jobId } }),
    prisma.speakerProfile.createMany({
      data: annotatedTranscript.speakerProfiles.map((speaker) => ({
        jobId,
        speakerId: speaker.speakerId,
        speakerName: speaker.speakerName,
        speakerRole: speaker.speakerRole,
        speakerDisplay: speaker.speakerDisplay,
        sortOrder: speaker.sortOrder,
      })),
    }),
    prisma.job.update({
      where: { id: jobId },
      data: {
        status: "speaker_editing",
        currentStep: "annotation",
        speakerCount: annotatedTranscript.speakerProfiles.length,
      },
    }),
    prisma.summary.deleteMany({ where: { jobId } }),
  ]);

  revalidatePath(`/jobs/${jobId}`);
}

export async function generateSummaryAction(jobId: string, format: SummaryOutputFormat = "markdown") {
  const job = await getJobDetail(jobId);
  if (!job || !job.transcript) {
    throw new Error("任务或 transcript 不存在");
  }

  const existingSummary = await prisma.summary.findFirst({
    where: { jobId },
    orderBy: { updatedAt: "desc" },
  });

  const summaryData = {
    outputFormat: format,
    status: "processing" as const,
    contentMarkdown: null,
    contentJson: null,
    generatedAt: null,
  };

  if (existingSummary) {
    await prisma.summary.update({
      where: { id: existingSummary.id },
      data: summaryData,
    });
  } else {
    await prisma.summary.create({
      data: {
        jobId,
        ...summaryData,
      },
    });
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "summarizing",
      currentStep: "summary",
      errorMessage: null,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { queued: true };
}

export async function saveSegmentEditsAction(jobId: string, edits: Record<number, string>) {
  const editIds = Object.keys(edits).map(Number);
  if (editIds.length === 0) return;

  const transcript = await readJobJson<Transcript>(jobId, "transcript/transcript.annotated.json");

  let changed = false;
  for (const segment of transcript.segments) {
    if (edits[segment.id] !== undefined && segment.text !== edits[segment.id]) {
      segment.text = edits[segment.id];
      changed = true;
    }
  }
  if (!changed) return;

  transcript.text = transcript.segments.map((s) => s.text).join(" ");

  await writeJobFile(jobId, "transcript/transcript.annotated.json", JSON.stringify(transcript, null, 2));
}

export async function deleteJobAction(jobId: string) {
  const trimmedJobId = jobId.trim();

  if (!trimmedJobId) {
    return { error: "缺少任务 ID" };
  }

  try {
    await prisma.job.delete({
      where: { id: trimmedJobId },
    });

    await removeJobDirectory(trimmedJobId);

    revalidatePath("/");
    revalidatePath(`/jobs/${trimmedJobId}`);

    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "删除任务失败",
    };
  }
}
