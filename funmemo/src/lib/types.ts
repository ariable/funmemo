export type JobStatus =
  | "queued"
  | "transcribing"
  | "transcript_ready"
  | "speaker_editing"
  | "summarizing"
  | "summary_ready"
  | "completed"
  | "failed";

export type JobStep =
  | "upload"
  | "transcription"
  | "annotation"
  | "summary"
  | "export";

export interface SpeakerProfileInput {
  speakerId: string;
  speakerName?: string;
  speakerRole?: string;
  speakerDisplay?: string;
  sortOrder: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
  speakerId: string;
  speakerName?: string;
  speakerRole?: string;
  speakerDisplay?: string;
}

export interface Transcript {
  text: string;
  language: string;
  duration: number;
  segments: TranscriptSegment[];
  words?: Array<Record<string, unknown>>;
  speakerProfiles: SpeakerProfileInput[];
}

export interface SummaryBlock {
  title: string;
  items: string[];
}

export interface JobCard {
  id: string;
  title: string;
  sourceFilename: string;
  meetingAtText?: string;
  status: JobStatus;
  statusLabel: string;
  currentStep: JobStep;
  progress: number;
  speakerCount: number;
  durationText: string;
  createdAtText: string;
  language?: string;
}

export interface JobDetail extends JobCard {
  transcript: Transcript | null;
  summaryMarkdown: string | null;
}
