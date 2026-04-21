export function AuthRequired() {
  const loginUrl = process.env.AUTH_LOGIN_URL || "/api/auth/sign-in/casdoor?attempt=interactive&returnTo=/";

  return (
    <main className="min-h-screen px-4 py-10 md:px-8 lg:px-10">
      <section className="mx-auto max-w-2xl rounded-[28px] border border-amber-200 bg-white/90 p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <p className="section-title">需要登录</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          请先通过统一登录入口访问系统
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          当前没有有效登录会话，系统无法判断任务归属，因此已拒绝访问。
        </p>
        <a
          href={loginUrl}
          className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          前往登录
        </a>
      </section>
    </main>
  );
}
