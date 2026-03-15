import { readFile } from "node:fs/promises";
import type { Transcript } from "@/lib/types";
import { getAppConfig } from "@/lib/server/config";
import { normalizeFunAsrTranscript } from "@/lib/server/transcript";

export async function transcribeWithFunAsr(filePath: string, filename: string): Promise<Transcript> {
  const config = await getAppConfig();
  const baseUrl = config.transcriptionApiBaseUrl;
  const model = config.transcriptionModel || "qwen3-asr";
  const token = config.transcriptionApiToken;
  const fileBuffer = await readFile(filePath);

  const formData = new FormData();
  formData.append("model", model);
  formData.append("response_format", "verbose_json");
  formData.append("enable_speaker_diarization", "true");
  formData.append("word_timestamps", "true");
  formData.append("file", new Blob([fileBuffer]), filename);

  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/audio/transcriptions`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`funasr-api transcription failed: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return normalizeFunAsrTranscript(payload as never);
}
