import type { Transcript } from "@/lib/types";
import { getAppConfig } from "@/lib/server/config";
import { formatTranscriptForSummary } from "@/lib/server/transcript";

const LANGUAGE_LABELS: Record<string, string> = {
  zh: "中文",
  en: "英文",
};

function getLanguageLabel(code: string | undefined) {
  if (!code) {
    return "中文";
  }

  return LANGUAGE_LABELS[code] ?? code;
}

export function buildChineseSummaryPrompts(transcript: Transcript) {
  const transcriptText = formatTranscriptForSummary(transcript);
  const languageLabel = getLanguageLabel(transcript.language);

  const systemPrompt = [
    "你是一名严谨的中文会议纪要助手，负责将会议转录整理为可直接分发的纪要。",
    `当前会议语言以${languageLabel}为主，输出必须使用简体中文。`,
    "你必须严格遵守以下规则：",
    "1. 只能基于 transcript 中真实出现的信息总结，不得补充、猜测或合理化未出现内容。",
    "2. 人名、职务、说话人标识必须与 transcript 中提供的一致，不得改写或杜撰。",
    "3. 如果 transcript 没有明确结论、负责人、截止时间，就明确写“未明确”或不写该项，不得脑补。",
    "4. 输出使用 Markdown，不要使用代码块。",
    "5. 尽量提炼中文会议最有价值的信息：背景、结论、风险、待办、责任人、时间点。",
    "6. 表述保持简洁、正式、可执行，适合发给团队成员直接阅读。",
  ].join("\n");

  const userPrompt = [
    "请分析下面的会议 transcript，并输出一份结构化纪要。",
    "优先使用以下结构；如果某一部分没有信息，可以省略该节：",
    "## 会议概述",
    "## 关键结论",
    "## 风险与分歧",
    "## 待办事项",
    "",
    "其中“待办事项”尽量写成“事项 | 负责人 | 时间”风格的条目；如果负责人或时间不明确，明确标注“未明确”。",
    "如果 transcript 中存在说话人职务信息，请在必要时保留，以帮助读者理解上下文。",
    "",
    "Transcript:",
    transcriptText,
  ].join("\n");

  return { systemPrompt, userPrompt };
}

export async function generateMeetingSummary(
  transcript: Transcript,
  overrides?: {
    customPrompt?: string;
    systemPrompt?: string;
  },
) {
  const config = await getAppConfig();
  const llmBaseUrl = config.llmApiBaseUrl;
  const llmModel = config.llmModel;

  if (!llmBaseUrl || !llmModel) {
    throw new Error("LLM_API_BASE_URL and LLM_MODEL must be configured before generating summaries.");
  }

  const defaultPrompts = buildChineseSummaryPrompts(transcript);
  const systemPrompt = overrides?.systemPrompt?.trim() || defaultPrompts.systemPrompt;
  const userPrompt = overrides?.customPrompt?.trim()
    ? `${overrides.customPrompt.trim()}\n\n${formatTranscriptForSummary(transcript)}`
    : defaultPrompts.userPrompt;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (config.llmApiKey) {
    headers.Authorization = `Bearer ${config.llmApiKey}`;
  }

  const response = await fetch(`${llmBaseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: llmModel,
      temperature: 0.2,
      max_tokens: 3000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`LLM summary failed: ${response.status} ${message}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const summary = data.choices?.[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error("LLM returned empty summary content.");
  }

  return summary;
}
