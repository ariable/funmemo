import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { getAuthBannerState, parseAuthAttempt } from "@/lib/auth-login";
import { LoginRedirectBanner } from "@/components/login-redirect-banner";
import { RecentJobs } from "@/components/recent-jobs";
import { UploadForm } from "@/components/upload-form";
import { UserBadge } from "@/components/user-badge";
import { getCurrentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const currentUser = await getCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const authAttempt = parseAuthAttempt(resolvedSearchParams?.authAttempt);
  const banner = getAuthBannerState({ returnTo: "/", authAttempt });

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <Image
              src="/w.svg"
              alt="惟觉智能会议助手"
              width={40}
              height={40}
              className="h-10 w-10 rounded-2xl"
            />
            <p className="text-sm font-semibold tracking-wide text-slate-900">
              惟觉智能会议助手
            </p>
          </div>
          {currentUser ? (
            <>
              <Link
                href="/settings"
                className="rounded-full border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
              >
                设置
              </Link>
              <UserBadge user={currentUser} />
            </>
          ) : (
            <LoginRedirectBanner
              actionLabel={banner.actionLabel}
              actionUrl={banner.actionUrl}
              autoRedirectUrl={banner.autoRedirectUrl}
              delayMs={banner.delayMs}
              message={banner.message}
              title={banner.title}
            />
          )}
        </header>

        <section className="glass-panel rounded-[28px] p-6 md:p-8">
          <UploadForm preview={!currentUser} />
        </section>

        <section id="recent-jobs" className="glass-panel rounded-[28px] p-6">
          <p className="section-title">历史任务</p>
          <div className="mt-4 space-y-4">
            <RecentJobs preview={!currentUser} />
          </div>
        </section>
      </div>
    </main>
  );
}
