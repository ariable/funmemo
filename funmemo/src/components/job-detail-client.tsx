"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SpeakerEditor } from "@/components/speaker-editor";
import { SummaryActions } from "@/components/summary-actions";
import { splitSummaryBlocks } from "@/lib/server/transcript";
import type { JobDetail } from "@/lib/types";

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

const stepSequence = ["upload", "transcription", "annotation", "summary", "export"] as const;

const stepLabels = {
  upload: "上传",
  transcription: "转录",
  annotation: "标注",
  summary: "纪要",
  export: "导出",
} as const;

function formatTimeline(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remain = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remain}`;
}

export function JobDetailClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadJob = useCallback(async () => {
    const response = await fetch(`/api/job-detail?jobId=${encodeURIComponent(jobId)}`, {
      cache: "no-store",
    });
    const result = (await response.json()) as JobDetail | { message?: string };

    if (!response.ok) {
      setError("message" in result ? result.message ?? "任务加载失败" : "任务加载失败");
      setJob(null);
      setLoading(false);
      return;
    }

    setJob(result as JobDetail);
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    const run = async () => {
      setError("");
      const response = await fetch(`/api/job-detail?jobId=${encodeURIComponent(jobId)}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as JobDetail | { message?: string };

      if (!response.ok) {
        setError("message" in result ? result.message ?? "任务加载失败" : "任务加载失败");
        setJob(null);
        setLoading(false);
        return;
      }

      setJob(result as JobDetail);
      setLoading(false);
    };

    void run();
  }, [jobId, loadJob]);

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
          <Link href="/" className="text-sm text-cyan-700">
            返回工作台
          </Link>
          <p className="mt-4 text-sm text-rose-600">{error || "任务不存在。"}</p>
        </div>
      </main>
    );
  }

  const currentStepIndex = stepSequence.indexOf(job.currentStep);
  const summaryBlocks = job.summaryMarkdown ? splitSummaryBlocks(job.summaryMarkdown) : [];

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="glass-panel rounded-[32px] p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-700"
              >
                返回工作台
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusTone[job.status]}`}>
                  {job.statusLabel}
                </span>
                <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-sm text-slate-500">
                  {job.durationText}
                </span>
                <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-sm text-slate-500">
                  {job.language ?? "中文"}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                  {job.title}
                </h1>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {job.sourceFilename}
                  {job.meetingAtText ? ` · 会议时间 ${job.meetingAtText}` : ""}
                  {` · 创建于 ${job.createdAtText} · 已识别 ${job.speakerCount} 位发言人`}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "当前进度", value: `${job.progress}%` },
                { label: "发言人数", value: `${job.speakerCount}` },
                { label: "语言", value: job.language ?? "中文" },
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

          <div className="mt-8 grid gap-4 md:grid-cols-5">
            {stepSequence.map((step, index) => {
              const active = index <= currentStepIndex;

              return (
                <div
                  key={step}
                  className={`rounded-[22px] border px-4 py-4 ${
                    active
                      ? "border-cyan-200 bg-cyan-50/80"
                      : "border-slate-200 bg-white/65"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      {stepLabels[step]}
                    </span>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        active
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="glass-panel rounded-[28px] p-5">
            <p className="section-title">发言人</p>
            <div className="mt-5">
              {job.transcript ? (
                <SpeakerEditor
                  jobId={job.id}
                  initialProfiles={job.transcript.speakerProfiles}
                  onComplete={async () => {
                    setLoading(true);
                    setError("");
                    await loadJob();
                  }}
                />
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/70 p-5 text-sm text-slate-500">
                  还没有 transcript，可先返回首页上传音频。
                </div>
              )}
            </div>
          </aside>

          <section className="glass-panel rounded-[28px] p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-title">Transcript</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  时间线与分段内容
                </h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm text-slate-500">
                真实 transcript
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {job.transcript ? job.transcript.segments.map((segment) => (
                <article
                  key={segment.id}
                  className="grid gap-4 rounded-[24px] border border-slate-200/80 bg-white/82 p-4 md:grid-cols-[88px_minmax(0,1fr)]"
                >
                  <div className="rounded-2xl bg-slate-950 px-3 py-3 text-center text-white">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-300">
                      时间
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {formatTimeline(segment.start)}
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                        {segment.speakerName ?? segment.speaker ?? segment.speakerId}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                        {segment.speakerRole ?? "待补充职务"}
                      </span>
                    </div>
                    <p className="mt-3 text-[15px] leading-7 text-slate-700">
                      {segment.text}
                    </p>
                  </div>
                </article>
              )) : (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
                  transcript 暂不可用。
                </div>
              )}
            </div>
          </section>

          <aside className="glass-panel rounded-[28px] p-5">
            <p className="section-title">会议纪要</p>
            <div className="mt-4">
              <SummaryActions
                jobId={job.id}
                onComplete={async () => {
                  setLoading(true);
                  setError("");
                  await loadJob();
                }}
              />
            </div>
            <div className="mt-6 space-y-4">
              {summaryBlocks.length > 0 ? summaryBlocks.map((block) => (
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
              )) : (
                <section className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-5 text-sm leading-7 text-slate-500">
                  纪要尚未生成。完成发言人修正后，点击上方按钮即可基于真实 transcript 调用 LLM 生成中文纪要。
                </section>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
