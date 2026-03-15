import type { Transcript, TranscriptSegment, SpeakerProfileInput } from "@/lib/types";

type FunAsrSegment = {
  id?: number;
  start?: number;
  end?: number;
  text?: string;
  speaker?: string;
};

type FunAsrResponse = {
  language?: string;
  duration?: number;
  text?: string;
  words?: Array<Record<string, unknown>>;
  segments?: FunAsrSegment[];
};

function sanitizeText(text: string | undefined) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

export function buildSpeakerProfiles(segments: TranscriptSegment[]) {
  const uniqueSpeakers = Array.from(
    new Set(segments.map((segment) => segment.speakerId).filter(Boolean)),
  );

  return uniqueSpeakers.map((speakerId, index) => ({
    speakerId,
    speakerName: speakerId,
    speakerRole: "",
    speakerDisplay: speakerId,
    sortOrder: index + 1,
  }));
}

export function normalizeFunAsrTranscript(payload: FunAsrResponse): Transcript {
  const segments: TranscriptSegment[] = (payload.segments ?? []).map((segment, index) => {
    const speakerId = segment.speaker ?? `说话人${index + 1}`;
    const text = sanitizeText(segment.text);

    return {
      id: segment.id ?? index + 1,
      start: Number(segment.start ?? 0),
      end: Number(segment.end ?? 0),
      text,
      speaker: speakerId,
      speakerId,
      speakerName: speakerId,
      speakerRole: "",
      speakerDisplay: speakerId,
    };
  });

  return {
    text: sanitizeText(payload.text) || segments.map((segment) => segment.text).join(" "),
    language: payload.language ?? "zh",
    duration: Number(payload.duration ?? 0),
    words: payload.words,
    segments,
    speakerProfiles: buildSpeakerProfiles(segments),
  };
}

export function mergeSpeakerDisplay(profile: SpeakerProfileInput) {
  const name = (profile.speakerName ?? "").trim();
  const role = (profile.speakerRole ?? "").trim();

  if (name && role) {
    return `${name} / ${role}`;
  }

  return name || role || profile.speakerId;
}

export function applySpeakerProfiles(
  transcript: Transcript,
  profiles: SpeakerProfileInput[],
): Transcript {
  const profileMap = new Map(
    profiles.map((profile) => [
      profile.speakerId,
      {
        ...profile,
        speakerDisplay: mergeSpeakerDisplay(profile),
      },
    ]),
  );

  const segments = transcript.segments.map((segment) => {
    const profile = profileMap.get(segment.speakerId);

    return {
      ...segment,
      speakerName: profile?.speakerName?.trim() || segment.speakerName || segment.speakerId,
      speakerRole: profile?.speakerRole?.trim() || "",
      speakerDisplay: profile?.speakerDisplay || mergeSpeakerDisplay(profile ?? {
        speakerId: segment.speakerId,
        speakerName: segment.speakerName,
        speakerRole: segment.speakerRole,
        sortOrder: 0,
      }),
    };
  });

  return {
    ...transcript,
    segments,
    speakerProfiles: profiles.map((profile) => ({
      ...profile,
      speakerDisplay: mergeSpeakerDisplay(profile),
    })),
  };
}

function formatTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remain = String(total % 60).padStart(2, "0");
  return `${minutes}:${remain}`;
}

export function formatTranscriptForSummary(transcript: Transcript) {
  return transcript.segments
    .map((segment) => {
      const speaker = segment.speakerDisplay || segment.speakerName || segment.speakerId;
      return `[${formatTimestamp(segment.start)}] ${speaker}：${segment.text}`;
    })
    .join("\n\n");
}

export function splitSummaryBlocks(markdown: string) {
  const sections = markdown
    .split(/^##\s+/m)
    .map((section) => section.trim())
    .filter(Boolean);

  return sections.map((section) => {
    const [titleLine = "", ...bodyLines] = section.split("\n");
    const items = bodyLines
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);

    return {
      title: titleLine.trim(),
      items: items.length > 0 ? items : bodyLines.filter(Boolean),
    };
  });
}
