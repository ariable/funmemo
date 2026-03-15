"use client";

import { saveSpeakersAction } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SpeakerProfileInput } from "@/lib/types";

export function SpeakerEditor({
  jobId,
  initialProfiles,
  onComplete,
}: {
  jobId: string;
  initialProfiles: SpeakerProfileInput[];
  onComplete?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState(initialProfiles);

  function updateProfile(index: number, key: "speakerName" | "speakerRole", value: string) {
    setProfiles((current) =>
      current.map((profile, currentIndex) =>
        currentIndex === index ? { ...profile, [key]: value } : profile,
      ),
    );
  }

  async function saveProfiles() {
    setError("");
    try {
      await saveSpeakersAction(jobId, profiles);
    } catch (error) {
      setError(error instanceof Error ? error.message : "保存失败。");
      return;
    }

    startTransition(() => {
      router.refresh();
      void onComplete?.();
    });
  }

  return (
    <div className="space-y-3">
      {profiles.map((profile, index) => (
        <div
          key={profile.speakerId}
          className="rounded-[22px] border border-slate-200/80 bg-white/85 p-4"
        >
          <div className="mb-3 text-sm font-medium text-slate-500">{profile.speakerId}</div>
          <div className="grid gap-3">
            <input
              value={profile.speakerName ?? ""}
              onChange={(event) => updateProfile(index, "speakerName", event.target.value)}
              placeholder="姓名"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-300 focus:bg-white"
            />
            <input
              value={profile.speakerRole ?? ""}
              onChange={(event) => updateProfile(index, "speakerRole", event.target.value)}
              placeholder="职务"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-300 focus:bg-white"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={saveProfiles}
        disabled={isPending}
        className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "保存中..." : "保存发言人信息"}
      </button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
