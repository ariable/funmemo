"use client";

import { useEffect } from "react";

export function LoginRedirectBanner({
  loginUrl,
  delayMs = 2000,
}: {
  loginUrl: string;
  delayMs?: number;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.assign(loginUrl);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, loginUrl]);

  return (
    <div className="rounded-[24px] border border-amber-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium text-slate-900">未登录</span>
        <span className="text-slate-500">2 秒后自动跳转登录</span>
        <a
          href={loginUrl}
          className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100"
        >
          立即登录
        </a>
      </div>
    </div>
  );
}
