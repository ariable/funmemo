"use client";

import { generateSummaryAction } from "@/app/actions";
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

  async function generateSummary() {
    setError("");
    try {
      await generateSummaryAction(jobId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "纪要生成失败。");
      return;
    }

    startTransition(() => {
      router.refresh();
      void onComplete?.();
    });
  }

  return (
    <div className="space-y-3">
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
