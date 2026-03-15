import Link from "next/link";
import { connection } from "next/server";
import { RecentJobs } from "@/components/recent-jobs";
import { UploadForm } from "@/components/upload-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  await connection();

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="glass-panel relative overflow-hidden rounded-[32px] px-6 py-6 md:px-8 md:py-8">
          <div className="absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.18),transparent_68%)]" />
          <div className="relative flex flex-col gap-6">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-white/70 px-3 py-1 text-xs font-medium tracking-[0.2em] text-cyan-700 uppercase">
                FunMemo 工作台
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  面向中文会议的转录、标注与纪要生成
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                  以任务为中心管理音频上传、说话人修正和会议纪要，适配长任务恢复与历史追踪，不侵入底层
                  `funasr-api`。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/settings"
                  className="soft-ring inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  打开设置
                </Link>
                <Link
                  href="/#recent-jobs"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
                >
                  查看最近任务
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div id="recent-jobs" className="glass-panel rounded-[28px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-title">最近任务</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  当前工作流
                </h2>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                中文界面
              </span>
            </div>
            <div className="mt-6 space-y-4">
              <RecentJobs />
            </div>
          </div>

          <div className="grid gap-6">
            <UploadForm />
          </div>
        </section>
      </div>
    </main>
  );
}
