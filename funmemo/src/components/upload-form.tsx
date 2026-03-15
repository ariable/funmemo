"use client";

import { uploadJobAction } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

export function UploadForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(uploadJobAction, undefined);

  useEffect(() => {
    if (state?.id) {
      router.push(`/jobs/${state.id}`);
      router.refresh();
    }
  }, [router, state?.id]);

  return (
    <form
      action={formAction}
      className="rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
    >
      <p className="section-title">上传音频</p>
      <div className="mt-4 grid gap-4">
        <div className="rounded-[24px] border border-slate-200/80 bg-white/75 p-4">
          <p className="text-sm font-medium text-slate-900">会议基础信息</p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-600">
              <span>会议标题</span>
              <input
                name="title"
                placeholder="例如：产品周会 - 2026-03-15"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-300 focus:bg-white"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-600">
              <span>会议时间</span>
              <input
                name="meetingAt"
                type="datetime-local"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-300 focus:bg-white"
              />
            </label>
          </div>
        </div>

        <label className="grid gap-2 text-sm text-slate-600">
          <span>音频文件</span>
          <input
            required
            name="file"
            type="file"
            accept=".mp3,.wav,.m4a,.mp4,.aac,.flac,.webm"
            className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="soft-ring inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "处理中..." : "上传并开始转录"}
        </button>

        {state?.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
      </div>
    </form>
  );
}
