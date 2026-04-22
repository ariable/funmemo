"use client";

import { useEffect } from "react";

export function LoginRedirectBanner({
  actionLabel = "立即登录",
  actionUrl,
  autoRedirectUrl,
  delayMs,
  message,
  title = "未登录",
}: {
  actionLabel?: string;
  actionUrl: string;
  autoRedirectUrl?: string;
  delayMs?: number;
  message: string;
  title?: string;
}) {
  useEffect(() => {
    if (!autoRedirectUrl || delayMs === undefined) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.location.assign(autoRedirectUrl);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [autoRedirectUrl, delayMs]);

  return (
    <div className="rounded-[24px] border border-amber-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium text-slate-900">{title}</span>
        <span className="text-slate-500">{message}</span>
        <a
          href={actionUrl}
          className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100"
        >
          {actionLabel}
        </a>
      </div>
    </div>
  );
}
