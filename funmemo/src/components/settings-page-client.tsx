"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SettingsForm } from "@/components/settings-form";
import type { AppConfigDTO } from "@/lib/server/config";

export function SettingsPageClient() {
  const [config, setConfig] = useState<AppConfigDTO | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const result = (await response.json()) as AppConfigDTO | { message?: string };

      if (!response.ok) {
        setError("message" in result ? result.message ?? "读取设置失败" : "读取设置失败");
        return;
      }

      setConfig(result as AppConfigDTO);
    };

    void run();
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="glass-panel rounded-[32px] p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-700"
              >
                返回工作台
              </Link>
              <p className="section-title mt-4">系统设置</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                连接转录与纪要服务
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                这里填写 FunASR 转录 API 地址和 LLM API 地址。后续上传音频与生成纪要都会优先使用这里的配置。
              </p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600">
              配置保存在 SQLite
            </div>
          </div>
        </section>

        {config ? (
          <SettingsForm initialConfig={config} />
        ) : (
          <section className="glass-panel rounded-[28px] p-6 text-sm text-slate-500">
            {error || "正在加载设置..."}
          </section>
        )}
      </div>
    </main>
  );
}
