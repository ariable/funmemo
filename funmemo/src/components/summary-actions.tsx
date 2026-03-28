"use client";

import { generateSummaryAction } from "@/app/actions";
import type { SummaryOutputFormat } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SummaryActions({
  jobId,
  onComplete,
}: {
  jobId: string;
  onComplete?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [format, setFormat] = useState<SummaryOutputFormat>("json");

  async function generateSummary() {
    setError("");
    try {
      await generateSummaryAction(jobId, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : "纪要生成失败。");
      return;
    }

    startTransition(() => {
      router.refresh();
      void onComplete?.();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 p-1">
        <button
          type="button"
          onClick={() => setFormat("json")}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
            format === "json"
              ? "bg-slate-950 text-white"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          结构化
        </button>
        <button
          type="button"
          onClick={() => setFormat("markdown")}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
            format === "markdown"
              ? "bg-slate-950 text-white"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Markdown
        </button>
      </div>
      <button
        type="button"
        onClick={generateSummary}
        disabled={isPending}
        className="w-full rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? "生成中..." : "生成会议纪要"}
      </button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
