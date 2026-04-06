"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { generateSummaryAction, saveSegmentEditsAction, saveSpeakersAction } from "@/app/actions";
import { splitSummaryBlocks } from "@/lib/server/transcript";
import type { JobDetail, SpeakerProfileInput, StructuredSummary, SummaryOutputFormat } from "@/lib/types";

const statusTone = {
  queued: "bg-slate-100 text-slate-700",
  transcribing: "bg-amber-50 text-amber-700",
  transcript_ready: "bg-sky-50 text-sky-700",
  speaker_editing: "bg-violet-50 text-violet-700",
  summarizing: "bg-cyan-50 text-cyan-700",
  summary_ready: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
} as const;

const stepSequence = ["upload", "transcription", "annotation", "summary"] as const;

const stepLabels = {
  upload: "上传",
  transcription: "转录",
  annotation: "标注",
  summary: "纪要",
} as const;

function formatTimeline(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remain = String(total % 60).padStart(2, "0");
  return `${minutes}:${remain}`;
}

function speakerLabel(p: SpeakerProfileInput) {
  const name = (p.speakerName ?? "").trim();
  const role = (p.speakerRole ?? "").trim();
  if (name && role) return `${name} / ${role}`;
  return name || role || p.speakerId;
}

function isProfileComplete(profile: SpeakerProfileInput) {
  return Boolean((profile.speakerName ?? "").trim() && (profile.speakerRole ?? "").trim());
}

function AnnotationOverviewCard({
  profiles,
  filterSpeaker,
  onSelectSpeaker,
  onSave,
  onNext,
  saving,
  saveError,
  canProceed,
}: {
  profiles: SpeakerProfileInput[];
  filterSpeaker: string;
  onSelectSpeaker: (speakerId: string) => void;
  onSave: () => void;
  onNext: () => void;
  saving: boolean;
  saveError: string;
  canProceed: boolean;
}) {
  const filled = profiles.filter(isProfileComplete).length;

  return (
    <section className="glass-panel rounded-[28px] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-title">已标注发言人</p>
          <p className="mt-1 text-xs text-slate-400">
            共 {profiles.length} 位，已完成标注 {filled} 位
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {profiles.map((profile) => (
          <button
            key={profile.speakerId}
            type="button"
            onClick={() => onSelectSpeaker(profile.speakerId)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              filterSpeaker === profile.speakerId
                ? "border-cyan-300 bg-cyan-50 text-cyan-700"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-200 hover:text-cyan-700"
            }`}
          >
            {profile.speakerId}：{speakerLabel(profile)}
          </button>
        ))}
      </div>

      {saveError && <p className="mt-4 text-sm text-rose-600">{saveError}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-60"
        >
          {saving ? "保存中..." : "保存标注"}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={saving || !canProceed}
          className={`rounded-full px-5 py-3 text-sm font-medium text-white transition ${
            saving || !canProceed
              ? "cursor-not-allowed bg-slate-300 text-slate-100"
              : "bg-gradient-to-r from-cyan-600 to-teal-600 hover:opacity-90"
          }`}
        >
          {saving ? "处理中..." : "下一步：生成纪要"}
        </button>
        {!canProceed ? (
          <p className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
            请在下方为每位发言人填写姓名和职务。
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TranscriptSection({
  transcript,
  profiles,
  filterSpeaker,
  onFilterSpeakerChange,
  segmentEdits,
  onUpdateProfile,
  onUpdateSegmentText,
  onSaveProfiles,
  savingProfiles,
}: {
  transcript: JobDetail["transcript"];
  profiles: SpeakerProfileInput[];
  filterSpeaker: string;
  onFilterSpeakerChange: (speakerId: string) => void;
  segmentEdits: Record<number, string>;
  onUpdateProfile: (speakerId: string, key: "speakerName" | "speakerRole", value: string) => void;
  onUpdateSegmentText: (segmentId: number, text: string) => void;
  onSaveProfiles: () => void;
  savingProfiles: boolean;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  if (!transcript) {
    return (
      <section className="glass-panel rounded-[28px] p-5 md:p-6">
        <p className="section-title">Transcript</p>
        <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
          transcript 暂不可用。
        </div>
      </section>
    );
  }

  const segments =
    filterSpeaker === "__all__"
      ? transcript.segments
      : transcript.segments.filter((s) => s.speakerId === filterSpeaker);
  const selectedProfile = profiles.find((profile) => profile.speakerId === filterSpeaker);

  return (
    <section className="glass-panel rounded-[28px] p-5 md:p-6">
      <div>
        <div>
          <p className="section-title">Transcript</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            时间线与分段内容
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            在这里完成发言人标注和逐段修订，然后进入纪要页面。
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={filterSpeaker}
            onChange={(e) => onFilterSpeakerChange(e.target.value)}
            className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm text-slate-600 outline-none transition focus:border-cyan-300"
          >
            <option value="__all__">全部发言人</option>
            {profiles.map((p) => (
              <option key={p.speakerId} value={p.speakerId}>
                {speakerLabel(p)}
              </option>
            ))}
          </select>
          {filterSpeaker === "__all__" ? (
            <span className="rounded-full border border-cyan-300 bg-cyan-100 px-4 py-2.5 text-sm font-semibold text-cyan-900 shadow-[0_8px_20px_rgba(8,145,178,0.12)]">
              先在此选择说话人，再填写姓名和职务
            </span>
          ) : null}

          {selectedProfile ? (
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  value={selectedProfile.speakerName ?? ""}
                  onChange={(event) => onUpdateProfile(selectedProfile.speakerId, "speakerName", event.target.value)}
                  placeholder="姓名"
                  className="min-w-28 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300"
                />
                <input
                  value={selectedProfile.speakerRole ?? ""}
                  onChange={(event) => onUpdateProfile(selectedProfile.speakerId, "speakerRole", event.target.value)}
                  placeholder="职务"
                  className="min-w-32 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300"
                />
                <button
                  type="button"
                  onClick={onSaveProfiles}
                  disabled={savingProfiles}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-60"
                >
                  {savingProfiles ? "保存中..." : "保存"}
                </button>
              </div>
              <p className="max-w-sm text-sm leading-6 text-slate-500 lg:text-right">
                若多个说话人实际为同一人，请填写相同的姓名和职务
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {segments.map((segment) => {
          const profile = profiles.find((p) => p.speakerId === segment.speakerId);
          const displayName = (profile?.speakerName ?? "").trim() || segment.speaker || segment.speakerId;
          const displayRole = (profile?.speakerRole ?? "").trim();
          const displayText = segmentEdits[segment.id] ?? segment.text;
          const isEditing = editingId === segment.id;

          return (
            <article
              key={segment.id}
              className="grid gap-4 rounded-[24px] border border-slate-200/80 bg-white/82 p-4 md:grid-cols-[88px_minmax(0,1fr)]"
            >
              <div className="rounded-2xl bg-slate-950 px-3 py-3 text-center text-white">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-300">
                  时间
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {formatTimeline(segment.start)} — {formatTimeline(segment.end)}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                      {displayName}
                    </span>
                    {displayRole && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                        {displayRole}
                      </span>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => { setEditingId(segment.id); setEditDraft(displayText); }}
                      className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-400 transition hover:border-cyan-200 hover:text-cyan-600"
                    >
                      编辑
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div className="mt-3">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-[15px] leading-7 text-slate-700 outline-none transition focus:border-cyan-400"
                    />
                    <div className="mt-2 flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 transition hover:bg-slate-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => { onUpdateSegmentText(segment.id, editDraft); setEditingId(null); }}
                        className="rounded-full bg-slate-950 px-3 py-1 text-xs text-white transition hover:bg-slate-800"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">
                    {displayText}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StructuredSummaryView({ summary }: { summary: StructuredSummary }) {
  return (
    <div className="space-y-4">
      {summary.attendees.length > 0 && (
        <section className="rounded-[24px] border border-slate-200/80 bg-white/84 p-4">
          <h3 className="text-sm font-semibold tracking-[0.14em] text-slate-500 uppercase">
            参会人
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.attendees.map((a) => (
              <span
                key={`${a.name}-${a.role}`}
                className="rounded-full bg-slate-50 px-3 py-1.5 text-sm text-slate-600"
              >
                {a.name}{a.role ? `（${a.role}）` : ""}
              </span>
            ))}
          </div>
        </section>
      )}

      {summary.overview && (
        <section className="rounded-[24px] border border-slate-200/80 bg-white/84 p-4">
          <h3 className="text-sm font-semibold tracking-[0.14em] text-slate-500 uppercase">
            会议概述
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{summary.overview}</p>
        </section>
      )}

      {summary.topics.map((topic) => (
        <section
          key={topic.title}
          className="rounded-[24px] border border-slate-200/80 bg-white/84 p-4"
        >
          <h3 className="text-sm font-semibold tracking-[0.14em] text-slate-500 uppercase">
            {topic.title}
          </h3>
          <div className="mt-3 space-y-2">
            {topic.points.map((point) => (
              <div
                key={point}
                className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600"
              >
                {point}
              </div>
            ))}
            {topic.conclusion && (
              <div className="rounded-2xl bg-cyan-50 px-3 py-2.5 text-sm leading-6 text-cyan-700">
                <span className="font-medium">结论：</span>{topic.conclusion}
              </div>
            )}
          </div>
        </section>
      ))}

      {summary.decisions.length > 0 && (
        <section className="rounded-[24px] border border-slate-200/80 bg-white/84 p-4">
          <h3 className="text-sm font-semibold tracking-[0.14em] text-slate-500 uppercase">
            决议事项
          </h3>
          <div className="mt-3 space-y-2">
            {summary.decisions.map((d) => (
              <div
                key={d}
                className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600"
              >
                {d}
              </div>
            ))}
          </div>
        </section>
      )}

      {summary.actionItems.length > 0 && (
        <section className="rounded-[24px] border border-emerald-200/80 bg-emerald-50/50 p-4">
          <h3 className="text-sm font-semibold tracking-[0.14em] text-emerald-700 uppercase">
            待办事项
          </h3>
          <div className="mt-3 space-y-2">
            {summary.actionItems.map((item) => (
              <div
                key={`${item.owner}-${item.task}`}
                className="grid grid-cols-[1fr_auto_auto] items-start gap-2 rounded-2xl bg-white px-3 py-2.5 text-sm"
              >
                <span className="leading-6 text-slate-700">{item.task}</span>
                <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700">
                  {item.owner}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {item.deadline ?? "待确认"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {summary.risks.length > 0 && (
        <section className="rounded-[24px] border border-amber-200/80 bg-amber-50/50 p-4">
          <h3 className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
            风险与遗留
          </h3>
          <div className="mt-3 space-y-2">
            {summary.risks.map((r) => (
              <div
                key={r}
                className="rounded-2xl bg-white px-3 py-2.5 text-sm leading-6 text-slate-600"
              >
                {r}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MarkdownSummaryView({ markdown }: { markdown: string }) {
  const blocks = splitSummaryBlocks(markdown);
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <section
          key={block.title}
          className="rounded-[24px] border border-slate-200/80 bg-white/84 p-4"
        >
          <h3 className="text-sm font-semibold tracking-[0.14em] text-slate-500 uppercase">
            {block.title}
          </h3>
          <div className="mt-3 space-y-3">
            {block.items.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function JobFlowClient({ jobId, step }: { jobId: string; step?: string }) {
  return <JobDetailClient jobId={jobId} step={step} />;
}

export function JobDetailClient({ jobId, step }: { jobId: string; step?: string }) {
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [profiles, setProfiles] = useState<SpeakerProfileInput[]>([]);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summaryFormat, setSummaryFormat] = useState<SummaryOutputFormat>("json");
  const [segmentEdits, setSegmentEdits] = useState<Record<number, string>>({});
  const [showRegenerateOptions, setShowRegenerateOptions] = useState(false);
  const [filterSpeaker, setFilterSpeaker] = useState("__all__");
  const [summaryPollCount, setSummaryPollCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchJob = async () => {
      try {
        const response = await fetch(`/api/job-detail?jobId=${encodeURIComponent(jobId)}`, { cache: "no-store" });
        const result = (await response.json()) as JobDetail | { message?: string };
        if (cancelled) return;

        if (!response.ok) {
          setError("message" in result ? result.message ?? "任务加载失败" : "任务加载失败");
          setJob(null);
          setProfiles([]);
          setSegmentEdits({});
          setSaveError("");
          setSummaryPollCount(0);
          setFilterSpeaker("__all__");
        } else {
          setError("");
          const nextJob = result as JobDetail;
          setJob(nextJob);
          setProfiles(nextJob.transcript?.speakerProfiles ?? []);
          setSummaryFormat(nextJob.summaryFormat ?? "json");
          setSegmentEdits({});
          setSaveError("");
          if (nextJob.status !== "summarizing") {
            setSummaryPollCount(0);
          }
          setShowRegenerateOptions(false);
          setFilterSpeaker("__all__");
        }
      } catch {
        if (!cancelled) {
          setError("网络请求失败");
        }
      }
      if (!cancelled) {
        setLoading(false);
      }
    };

    void fetchJob();

    return () => { cancelled = true; };
  }, [jobId, reloadKey]);

  useEffect(() => {
    if (step !== "summary") {
      return;
    }
    if (job?.status !== "summarizing") {
      return;
    }

    const timer = setTimeout(() => {
      setSummaryPollCount((current) => current + 1);
      setReloadKey((current) => current + 1);
    }, 5000);

    return () => clearTimeout(timer);
  }, [job?.status, step]);

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-white/70 bg-white/82 p-8 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          正在加载任务详情...
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-white/70 bg-white/82 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:border-cyan-200 hover:text-cyan-700"
          >
            返回工作台
          </Link>
          <p className="mt-4 text-sm text-rose-600">{error || "任务不存在。"}</p>
        </div>
      </main>
    );
  }

  const activeJob = job;
  const displayStep = step === "summary"
    ? "summary"
    : activeJob.currentStep === "export"
      ? "summary"
      : activeJob.currentStep;
  const currentStepIndex = stepSequence.indexOf(displayStep);
  const hasStructuredSummary = activeJob.summaryFormat === "json" && activeJob.summaryJson != null;
  const showStaleRefreshHint = activeJob.status === "summarizing" && summaryPollCount >= 12;
  const canProceedToSummary = profiles.length > 0 && profiles.every(isProfileComplete);

  function refreshJob() {
    setReloadKey((current) => current + 1);
  }

  function updateSegmentText(segmentId: number, text: string) {
    setSegmentEdits((cur) => ({ ...cur, [segmentId]: text }));
  }

  async function saveAnnotations() {
    setSaveError("");
    setIsSaving(true);
    try {
      if (Object.keys(segmentEdits).length > 0) {
        await saveSegmentEditsAction(activeJob.id, segmentEdits);
      }
      await saveSpeakersAction(activeJob.id, profiles);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存失败");
      setIsSaving(false);
      throw e;
    }
    setIsSaving(false);
  }

  async function handleSave() {
    try {
      await saveAnnotations();
    } catch {}
  }

  async function handleNext() {
    if (!canProceedToSummary) {
      setSaveError("请先为每位发言人填写姓名和职务。");
      return;
    }

    try {
      await saveAnnotations();
    } catch {
      return;
    }

    router.push(`/jobs/${activeJob.id}/summary`);
  }

  async function generateSummary() {
    setSaveError("");
    setSummaryPollCount(0);
    setGenerating(true);
    try {
      await generateSummaryAction(activeJob.id, summaryFormat);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "纪要生成失败");
      setGenerating(false);
      return;
    }
    setGenerating(false);
    setShowRegenerateOptions(false);
    refreshJob();
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="glass-panel rounded-[32px] p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:border-cyan-200 hover:text-cyan-700"
              >
                返回工作台
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusTone[activeJob.status]}`}>
                  {activeJob.statusLabel}
                </span>
                <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-sm text-slate-500">
                  {activeJob.durationText}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                  {activeJob.title}
                </h1>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {activeJob.sourceFilename}
                  {activeJob.meetingAtText ? ` · 会议时间 ${activeJob.meetingAtText}` : ""}
                  {activeJob.meetingLocation ? ` · 会议地点 ${activeJob.meetingLocation}` : ""}
                  {` · 创建于 ${activeJob.createdAtText} · 已识别 ${activeJob.speakerCount} 位发言人`}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "当前进度", value: `${activeJob.progress}%` },
                { label: "发言人数", value: `${activeJob.speakerCount}` },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-[24px] border border-white/70 bg-white/80 p-4 text-right shadow-[0_12px_32px_rgba(15,23,42,0.05)]"
                >
                  <p className="section-title">{item.label}</p>
                  <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    {item.value}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {stepSequence.map((stepItem, index) => {
              const active = index <= currentStepIndex;
              const isLast = index === stepSequence.length - 1;

              return (
                <div key={stepItem} className="relative">
                  {!isLast && (
                    <div className="pointer-events-none absolute left-[calc(50%+2.25rem)] right-[-0.75rem] top-1/2 hidden -translate-y-1/2 md:block">
                      <div
                        className={`h-[3px] rounded-full ${
                          active ? "bg-cyan-400" : "bg-slate-200"
                        }`}
                      />
                    </div>
                  )}
                  <div
                    className={`relative rounded-[22px] border-2 px-4 py-4 shadow-sm ${
                      active
                        ? "border-cyan-400 bg-cyan-50"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                          active
                            ? "border-cyan-600 bg-cyan-600 text-white"
                            : "border-slate-300 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className={`text-sm font-medium ${active ? "text-slate-950" : "text-slate-600"}`}>
                        {stepLabels[stepItem]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {(step === "annotation" || !step) && (
          <>
            <AnnotationOverviewCard
              profiles={profiles}
              filterSpeaker={filterSpeaker}
              onSelectSpeaker={setFilterSpeaker}
              onSave={handleSave}
              onNext={handleNext}
              saving={isSaving}
              saveError={saveError}
              canProceed={canProceedToSummary}
            />
            <TranscriptSection
              transcript={activeJob.transcript}
              profiles={profiles}
              filterSpeaker={filterSpeaker}
              onFilterSpeakerChange={setFilterSpeaker}
              segmentEdits={segmentEdits}
              onUpdateProfile={(speakerId, key, value) =>
                setProfiles((current) =>
                  current.map((profile) =>
                    profile.speakerId === speakerId ? { ...profile, [key]: value } : profile,
                  ),
                )
              }
              onUpdateSegmentText={updateSegmentText}
              onSaveProfiles={handleSave}
              savingProfiles={isSaving}
            />
          </>
        )}

        {step === "summary" && (
          <section className="glass-panel rounded-[28px] p-6 md:p-8">
            <div className="flex justify-end">
              <Link
                href={`/jobs/${activeJob.id}/annotation`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700"
              >
                返回标注
              </Link>
            </div>

            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    纪要内容
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    {((!hasStructuredSummary && !activeJob.summaryMarkdown) || showRegenerateOptions) && (
                      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          onClick={() => setSummaryFormat("json")}
                          className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                            summaryFormat === "json"
                              ? "bg-slate-950 text-white"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          结构化
                        </button>
                        <button
                          type="button"
                          onClick={() => setSummaryFormat("markdown")}
                          className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                            summaryFormat === "markdown"
                              ? "bg-slate-950 text-white"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Markdown
                        </button>
                      </div>
                    )}

                    {!hasStructuredSummary && !activeJob.summaryMarkdown ? (
                      <button
                        type="button"
                        onClick={generateSummary}
                        disabled={!activeJob.transcript || generating || activeJob.status === "summarizing"}
                        className="rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        {generating || activeJob.status === "summarizing" ? "生成中..." : "生成纪要"}
                      </button>
                    ) : showRegenerateOptions ? (
                      <>
                        <button
                          type="button"
                          onClick={generateSummary}
                          disabled={!activeJob.transcript || generating || activeJob.status === "summarizing"}
                          className="rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                        >
                          {generating || activeJob.status === "summarizing" ? "生成中..." : "确认重新生成"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRegenerateOptions(false)}
                          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowRegenerateOptions(true)}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700"
                        >
                          重新生成
                        </button>
                        <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-slate-950">导出：</span>
                          <a
                            href={`/api/jobs/${activeJob.id}/export/markdown`}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700"
                          >
                            Markdown
                          </a>
                          <a
                            href={`/api/jobs/${activeJob.id}/export/word`}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700"
                          >
                            Word
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {((!hasStructuredSummary && !activeJob.summaryMarkdown) || showRegenerateOptions) && (
                  <p className="mt-3 text-sm text-slate-500">
                    选择输出格式后生成新的纪要内容。
                  </p>
                )}
              </div>
            </div>

            {(generating || activeJob.status === "summarizing") && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
                请在几分钟后手动刷新页面查看纪要内容。
              </div>
            )}

            {showStaleRefreshHint && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                如果页面长时间未更新，请手动刷新页面查看最新结果。
              </div>
            )}

            {saveError && <p className="mt-4 text-sm text-rose-600">{saveError}</p>}

            <div className="mt-6">
              {hasStructuredSummary ? (
                <StructuredSummaryView summary={activeJob.summaryJson!} />
              ) : activeJob.summaryMarkdown ? (
                <MarkdownSummaryView markdown={activeJob.summaryMarkdown} />
              ) : (
                <section className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-6 text-sm leading-7 text-slate-500">
                  纪要尚未生成。请先选择格式并生成纪要。
                </section>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
