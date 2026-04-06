import { prisma } from "@/lib/prisma";
import { transcribeWithFunAsr } from "@/lib/server/funasr";
import { ensureJobDirectories, fileSize, writeJobFile } from "@/lib/server/storage";
import { applySpeakerProfiles } from "@/lib/server/transcript";

export async function handleTranscribe(jobId: string) {
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { files: { where: { fileType: "source_audio" } } },
  });

  const sourceFile = job.files[0];
  if (!sourceFile) {
    throw new Error("源音频文件记录不存在");
  }

  await ensureJobDirectories(jobId);

  const rawTranscript = await transcribeWithFunAsr(sourceFile.path, job.sourceFilename);
  const annotatedTranscript = applySpeakerProfiles(rawTranscript, rawTranscript.speakerProfiles);

  const rawPath = await writeJobFile(
    jobId,
    "transcript/transcript.raw.json",
    JSON.stringify(rawTranscript, null, 2),
  );
  const annotatedPath = await writeJobFile(
    jobId,
    "transcript/transcript.annotated.json",
    JSON.stringify(annotatedTranscript, null, 2),
  );

  await prisma.jobFile.createMany({
    data: [
      {
        jobId,
        fileType: "transcript_raw",
        path: rawPath,
        mimeType: "application/json",
        sizeBytes: await fileSize(rawPath),
      },
      {
        jobId,
        fileType: "transcript_annotated",
        path: annotatedPath,
        mimeType: "application/json",
        sizeBytes: await fileSize(annotatedPath),
      },
    ],
  });

  await prisma.speakerProfile.createMany({
    data: annotatedTranscript.speakerProfiles.map((speaker) => ({
      jobId,
      speakerId: speaker.speakerId,
      speakerName: speaker.speakerName,
      speakerRole: speaker.speakerRole,
      speakerDisplay: speaker.speakerDisplay,
      sortOrder: speaker.sortOrder,
    })),
  });

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "transcript_ready",
      currentStep: "annotation",
      audioDurationSec: annotatedTranscript.duration,
      segmentCount: annotatedTranscript.segments.length,
      speakerCount: annotatedTranscript.speakerProfiles.length,
      language: annotatedTranscript.language,
    },
  });
}
