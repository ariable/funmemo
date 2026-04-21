"use client";

import type { CurrentUser } from "@/lib/server/auth-shared";

export function UserBadge({ user }: { user: CurrentUser }) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <span>
        当前用户
        <span className="ml-2 font-semibold text-slate-900">{user.displayName}</span>
      </span>
      <a
        href="/api/auth/logout?returnTo=/"
        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-cyan-300 hover:text-cyan-700"
      >
        退出
      </a>
    </div>
  );
}
