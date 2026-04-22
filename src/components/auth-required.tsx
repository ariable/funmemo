import Image from "next/image";
import { LoginRedirectBanner } from "@/components/login-redirect-banner";

export function AuthRequired({ returnTo = "/" }: { returnTo?: string }) {
  const loginUrl =
    process.env.AUTH_LOGIN_URL || `/api/auth/sign-in/casdoor?attempt=interactive&returnTo=${encodeURIComponent(returnTo)}`;

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
          <LoginRedirectBanner loginUrl={loginUrl} />
        </header>
      </div>
    </main>
  );
}
