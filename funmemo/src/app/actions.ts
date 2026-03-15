"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveAppConfig } from "@/lib/server/config";
import { transcribeWithFunAsr } from "@/lib/server/funasr";
import { getJobDetail, upsertSummary } from "@/lib/server/jobs";
import { ensureJobDirectories, fileSize, removeJobDirectory, writeJobFile } from "@/lib/server/storage";
import { generateMeetingSummary } from "@/lib/server/summary";
import { applySpeakerProfiles } from "@/lib/server/transcript";
import type { SpeakerProfileInput } from "@/lib/types";

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
  const file = formData.get("file");
  const titleInput = formData.get("title");
  const meetingAtInput = formData.get("meetingAt");

  if (!(file instanceof File)) {
    return { error: "请上传音频文件。" };
  }

  const title = typeof titleInput === "string" ? titleInput.trim() : "";
  const meetingAtRaw = typeof meetingAtInput === "string" ? meetingAtInput.trim() : "";
  const meetingAt = meetingAtRaw ? new Date(meetingAtRaw) : null;
  const sourceFilename = file.name || `meeting-${Date.now()}.wav`;

  const job = await prisma.job.create({
    data: {
      title: title || path.parse(sourceFilename).name,
      meetingAt: meetingAt && !Number.isNaN(meetingAt.getTime()) ? meetingAt : null,
      sourceFilename,
      status: "queued",
      currentStep: "upload",
    },
  });

  try {
    await ensureJobDirectories(job.id);
    const sourcePath = await writeJobFile(
      job.id,
      path.join("source", sourceFilename),
      Buffer.from(await file.arrayBuffer()),
    );

    await prisma.jobFile.create({
      data: {
        jobId: job.id,
        fileType: "source_audio",
        path: sourcePath,
        mimeType: file.type || "audio/*",
        sizeBytes: await fileSize(sourcePath),
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

  await writeJobFile(
    jobId,
    "transcript/transcript.annotated.json",
    JSON.stringify(annotatedTranscript, null, 2),
  );

  revalidatePath(`/jobs/${jobId}`);
}

export async function generateSummaryAction(jobId: string) {
  const job = await getJobDetail(jobId);
  if (!job || !job.transcript) {
    throw new Error("任务或 transcript 不存在");
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "summarizing",
      currentStep: "summary",
    },
  });

  try {
    const contentMarkdown = await generateMeetingSummary(job.transcript);
    await upsertSummary(jobId, contentMarkdown);
    await writeJobFile(jobId, "summary/summary.md", contentMarkdown);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "summary_ready",
        currentStep: "summary",
      },
    });
  } catch (error) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "纪要生成失败",
      },
    });
    throw error;
  }

  revalidatePath(`/jobs/${jobId}`);
}
