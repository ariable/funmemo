"use client";

import { saveSettingsAction } from "@/app/actions";
import { useActionState } from "react";
import type { AppConfigDTO } from "@/lib/server/config";

export function SettingsForm({ initialConfig }: { initialConfig: AppConfigDTO }) {
  const [state, formAction, isPending] = useActionState(saveSettingsAction, undefined);

  return (
    <form action={formAction} className="grid gap-6">
      <section className="glass-panel rounded-[28px] p-6">
        <p className="section-title">转录服务</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          FunASR API 设置
        </h2>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm text-slate-600">
            <span>转录 API 地址</span>
            <input
              name="transcriptionApiBaseUrl"
              defaultValue={initialConfig.transcriptionApiBaseUrl}
              placeholder="例如：http://127.0.0.1:17003"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-300 focus:bg-white"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            <span>转录模型</span>
            <input
              name="transcriptionModel"
              defaultValue={initialConfig.transcriptionModel}
              placeholder="例如：qwen3-asr"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-300 focus:bg-white"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            <span>转录 Token</span>
            <input
              name="transcriptionApiToken"
              type="password"
              defaultValue={initialConfig.transcriptionApiToken}
              placeholder="没有可留空"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-300 focus:bg-white"
            />
          </label>
        </div>
      </section>

      <section className="glass-panel rounded-[28px] p-6">
        <p className="section-title">纪要服务</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          LLM API 设置
        </h2>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm text-slate-600">
            <span>LLM API 地址</span>
            <input
              name="llmApiBaseUrl"
              defaultValue={initialConfig.llmApiBaseUrl}
              placeholder="例如：https://api.openai.com"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-300 focus:bg-white"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            <span>LLM 模型</span>
            <input
              name="llmModel"
              defaultValue={initialConfig.llmModel}
              placeholder="例如：gpt-4o-mini"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-300 focus:bg-white"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            <span>LLM API Key</span>
            <input
              name="llmApiKey"
              type="password"
              defaultValue={initialConfig.llmApiKey}
              placeholder="没有可留空"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-300 focus:bg-white"
            />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? "保存中..." : "保存设置"}
        </button>
        {state?.success ? <span className="text-sm text-emerald-600">设置已保存</span> : null}
        {state?.error ? <span className="text-sm text-rose-600">{state.error}</span> : null}
      </div>
    </form>
  );
}
