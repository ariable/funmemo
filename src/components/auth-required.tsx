import Image from "next/image";
import { cookies } from "next/headers";
import { getAuthBannerState, SKIP_SILENT_LOGIN_COOKIE_NAME } from "@/lib/auth-login";
import { LoginRedirectBanner } from "@/components/login-redirect-banner";
import type { AuthAttempt } from "@/lib/server/auth-redirect";

export async function AuthRequired({
  authAttempt,
  returnTo = "/",
}: {
  authAttempt?: AuthAttempt | null;
  returnTo?: string;
}) {
  const cookieStore = await cookies();
  const skipSilent = cookieStore.get(SKIP_SILENT_LOGIN_COOKIE_NAME)?.value === "1";
  const banner = getAuthBannerState({ returnTo, authAttempt: authAttempt ?? null, skipSilent });

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
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
          <LoginRedirectBanner
            actionLabel={banner.actionLabel}
            actionUrl={banner.actionUrl}
            autoRedirectUrl={banner.autoRedirectUrl}
            delayMs={banner.delayMs}
            message={banner.message}
            title={banner.title}
          />
        </header>
      </div>
    </main>
  );
}
