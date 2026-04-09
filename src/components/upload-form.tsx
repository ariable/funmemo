"use client";

import { uploadJobAction } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";

export function UploadForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(uploadJobAction, undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (state?.id) {
      router.push(`/jobs/${state.id}`);
      router.refresh();
    }
  }, [router, state?.id]);

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
    }
    setFileName(file.name);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0] ?? null;
      handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  return (
    <form action={formAction}>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
        新建会议纪要
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        上传会议录音，自动完成转录、发言人识别与纪要生成
      </p>

      <div className="mt-6">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition ${
            dragging
              ? "border-cyan-400 bg-cyan-50/50"
              : fileName
                ? "border-cyan-300 bg-cyan-50/30"
                : "border-slate-300 bg-slate-50 hover:border-cyan-300 hover:bg-cyan-50/30"
          }`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${fileName ? "bg-cyan-100" : "bg-slate-100"}`}>
            {fileName ? (
              <svg className="h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          {fileName ? (
            <>
              <p className="mt-3 text-sm font-medium text-slate-700">{fileName}</p>
              <p className="mt-1 text-xs text-slate-400">点击重新选择</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-slate-600">
                拖拽音频文件到此处，或 <span className="font-medium text-cyan-700">点击选择</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                支持 MP3、WAV、M4A、AAC、FLAC、WebM，最大 2 GB
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            required
            name="file"
            type="file"
            accept=".mp3,.wav,.m4a,.mp4,.aac,.flac,.webm"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <label className="grid gap-1.5 text-sm text-slate-600">
          <span>会议标题</span>
          <input
            name="title"
            placeholder="例如：产品周会 - 2026-03-15"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-300 focus:bg-white"
          />
        </label>

        <label className="grid gap-1.5 text-sm text-slate-600">
          <span>会议时间</span>
          <input
            name="meetingAt"
            type="datetime-local"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-300 focus:bg-white"
          />
        </label>

        <label className="grid gap-1.5 text-sm text-slate-600">
          <span>会议地点</span>
          <input
            name="meetingLocation"
            placeholder="例如：上海 · 8F 大会议室"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-300 focus:bg-white"
          />
        </label>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="soft-ring inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "处理中..." : "上传并开始转录"}
        </button>
        {isPending ? (
          <p className="text-sm font-medium text-amber-700">
            正在进行转录，请几分钟后刷新页面从下方记录进入。
          </p>
        ) : null}
        {state?.error ? (
          <p role="alert" className="text-sm text-rose-600">{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
