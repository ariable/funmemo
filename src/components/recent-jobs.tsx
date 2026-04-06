"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteJobAction } from "@/app/actions";
import type { JobCard } from "@/lib/types";

const stepLabels = {
  upload: "上传",
  transcription: "转录",
  annotation: "标注",
  summary: "纪要",
  export: "纪要",
} as const;

export function RecentJobs() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmingJobId, setConfirmingJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const response = await fetch("/api/jobs-list", { cache: "no-store" });
      const result = (await response.json()) as
        | { items?: JobCard[]; message?: string }
        | undefined;

      if (!response.ok) {
        setError(result?.message ?? "读取任务列表失败");
        setLoading(false);
        return;
      }

      setJobs(result?.items ?? []);
      setLoading(false);
    };

    void run();
  }, []);

  if (loading) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm leading-7 text-slate-500">
        正在加载任务列表...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[24px] border border-dashed border-rose-200 bg-rose-50/70 p-8 text-center text-sm leading-7 text-rose-600">
        {error}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm leading-7 text-slate-500">
        还没有任务。
      </div>
    );
  }

  return (
    <>
      {jobs.map((job) => (
        <article
          key={job.id}
          className="rounded-[24px] border border-slate-200/80 bg-white/85 p-5 transition hover:border-cyan-200 hover:shadow-[0_16px_40px_rgba(8,145,178,0.08)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link
              href={`/jobs/${job.id}`}
              className="block flex-1 transition hover:-translate-y-0.5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-950">
                      {job.title}
                    </h3>
                    <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                      {job.statusLabel}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {job.sourceFilename}
                    {job.meetingAtText ? ` · 会议时间 ${job.meetingAtText}` : ""}
                    {job.meetingLocation ? ` · 会议地点 ${job.meetingLocation}` : ""}
                    {` · 创建于 ${job.createdAtText}`}
                  </p>
                </div>
                <div className="min-w-48">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{stepLabels[job.currentStep]}</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2 self-start md:self-center">
              {confirmingJobId === job.id ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      setDeletingJobId(job.id);
                      const result = await deleteJobAction(job.id);
                      if (result?.error) {
                        setError(result.error);
                        setDeletingJobId(null);
                        return;
                      }

                      setJobs((current) => current.filter((item) => item.id !== job.id));
                      setConfirmingJobId(null);
                      setDeletingJobId(null);
                    }}
                    disabled={deletingJobId === job.id}
                    className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    {deletingJobId === job.id ? "删除中..." : "确认删除"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingJobId(null)}
                    disabled={deletingJobId === job.id}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 disabled:opacity-60"
                  >
                    取消
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingJobId(job.id)}
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                >
                  删除
                </button>
              )}
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
