import Image from "next/image";
import { getAuthBannerState } from "@/lib/auth-login";
import { LoginRedirectBanner } from "@/components/login-redirect-banner";

export default async function LoggedOutPage() {
  const banner = getAuthBannerState({
    authAttempt: "interactive",
    returnTo: "/",
  });

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
            actionLabel="重新登录"
            actionUrl={banner.actionUrl}
            message="已退出登录。"
            title="已退出"
          />
        </header>

        <section className="glass-panel rounded-[32px] p-8 md:p-10">
          <div className="max-w-2xl">
            <p className="section-title">退出完成</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              你已安全退出当前账号
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              如需继续使用会议转录、标注和纪要生成功能，请重新登录。
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={banner.actionUrl}
                className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-medium text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100"
              >
                重新登录
              </a>
              <a
                href="/"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700"
              >
                返回首页
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
