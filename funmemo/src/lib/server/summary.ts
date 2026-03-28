import type { StructuredSummary, SummaryOutputFormat, Transcript } from "@/lib/types";
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

const STRUCTURED_JSON_SCHEMA = {
  attendees: [{ name: "姓名", role: "职务" }],
  overview: "一段话概括会议内容",
  topics: [{ title: "议题名称", points: ["讨论要点"], conclusion: "该议题结论（可选）" }],
  decisions: ["决议内容"],
  actionItems: [{ owner: "负责人", task: "待办内容", deadline: "截止时间（没有则填待确认）" }],
  risks: ["风险或遗留问题"],
};

export function buildChineseSummaryPrompts(transcript: Transcript, format: SummaryOutputFormat = "markdown") {
  const transcriptText = formatTranscriptForSummary(transcript);
  const languageLabel = getLanguageLabel(transcript.language);

  const baseRules = [
    "# 角色",
    "你是一名严谨的中文会议纪要助手。你的任务是将会议转录稿整理为可直接分发给团队的正式纪要。",
    "",
    "# 语言",
    `当前会议语言以${languageLabel}为主，全部输出必须使用简体中文。`,
    "",
    "# 核心原则：禁止编造",
    "这是最重要的规则，违反任何一条都会导致纪要不可用：",
    "- 所有内容必须且只能来源于下方提供的转录稿原文，不得补充、推测、合理化任何未出现的信息。",
    "- 人名、职务、发言人标识必须与转录稿中完全一致，不得改写、合并或杜撰。",
    "- 如果转录稿中没有明确提及结论、负责人或截止时间，必须标注为「未明确」，绝对不得自行补充。",
    "- 不得添加转录稿中未出现的背景信息、因果关系或假设性分析。",
    "",
    "# 内容要求",
    "- 提炼会议中最有价值的信息：背景、结论、风险、待办、责任人、时间节点。",
    "- 表述简洁、正式、可执行，适合直接发给团队成员阅读。",
    "- 待办事项必须落实到具体负责人。如果转录稿中未指定负责人，标注「未明确」。",
    "- 如果转录稿中包含发言人职务信息，在必要时保留以帮助读者理解上下文。",
  ];

  if (format === "json") {
    const systemPrompt = [
      ...baseRules,
      "",
      "# 输出格式",
      "严格输出合法 JSON，不要包含 markdown 标记、代码块或任何非 JSON 内容。",
      "必须严格遵循以下结构，所有字段都必须存在（没有内容的字段使用空数组或空字符串）：",
      "",
      "```",
      JSON.stringify(STRUCTURED_JSON_SCHEMA, null, 2),
      "```",
      "",
      "# 字段说明",
      "- attendees：从转录稿中提取所有出现过的发言人及其职务。",
      "- overview：用一段话概括本次会议的主要内容。",
      "- topics：按会议讨论的议题分组归纳，每个议题包含讨论要点和结论（如果有的话）。",
      "- decisions：明确达成的决议。",
      "- actionItems：每条必须有 owner（负责人），deadline 未提及则填「待确认」。",
      "- risks：未达成共识的问题、潜在风险或需要后续跟进的遗留事项。",
    ].join("\n");

    const userPrompt = [
      "请根据以下会议转录稿生成结构化纪要。只输出 JSON，不要输出任何其他内容。",
      "",
      "转录稿：",
      transcriptText,
    ].join("\n");

    return { systemPrompt, userPrompt };
  }

  const systemPrompt = [
    ...baseRules,
    "",
    "# 输出格式",
    "使用 Markdown 格式输出，不要使用代码块。",
  ].join("\n");

  const userPrompt = [
    "请根据以下会议转录稿生成一份正式纪要。",
    "按以下结构组织，如果某部分没有相关信息可省略：",
    "",
    "## 会议概述",
    "## 议题讨论",
    "## 决议事项",
    "## 待办事项",
    "## 风险与遗留",
    "",
    "其中「待办事项」请使用「事项 | 负责人 | 截止时间」的格式，未明确的字段标注「未明确」。",
    "",
    "转录稿：",
    transcriptText,
  ].join("\n");

  return { systemPrompt, userPrompt };
}

function validateStructuredSummary(parsed: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (!Array.isArray(parsed.attendees)) {
    errors.push("缺少 attendees 字段或格式不正确");
  }
  if (typeof parsed.overview !== "string") {
    errors.push("缺少 overview 字段或格式不正确");
  }
  if (!Array.isArray(parsed.topics)) {
    errors.push("缺少 topics 字段或格式不正确");
  }
  if (!Array.isArray(parsed.decisions)) {
    errors.push("缺少 decisions 字段或格式不正确");
  }
  if (!Array.isArray(parsed.actionItems)) {
    errors.push("缺少 actionItems 字段或格式不正确");
  }
  if (!Array.isArray(parsed.risks)) {
    errors.push("缺少 risks 字段或格式不正确");
  }

  return errors;
}

function parseStructuredSummary(raw: string): StructuredSummary {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error("纪要生成失败：模型返回的内容不是合法 JSON，请重试。");
  }

  const validationErrors = validateStructuredSummary(parsed);
  if (validationErrors.length > 0) {
    throw new Error(`纪要格式校验失败：${validationErrors.join("；")}。请重试。`);
  }

  const attendees = (parsed.attendees as Array<Record<string, unknown>>).map((a) => ({
    name: String(a.name ?? ""),
    role: String(a.role ?? ""),
  }));

  const overview = parsed.overview as string;

  const topics = (parsed.topics as Array<Record<string, unknown>>).map((t) => ({
    title: String(t.title ?? ""),
    points: Array.isArray(t.points) ? (t.points as unknown[]).map(String) : [],
    conclusion: typeof t.conclusion === "string" ? t.conclusion : undefined,
  }));

  const decisions = (parsed.decisions as unknown[]).map(String);

  const actionItems = (parsed.actionItems as Array<Record<string, unknown>>).map((a) => ({
    owner: String(a.owner ?? "未明确"),
    task: String(a.task ?? ""),
    deadline: typeof a.deadline === "string" ? a.deadline : undefined,
  }));

  const risks = (parsed.risks as unknown[]).map(String);

  return { attendees, overview, topics, decisions, actionItems, risks };
}

export type SummaryResult =
  | { format: "markdown"; markdown: string }
  | { format: "json"; markdown: string; structured: StructuredSummary };

export async function generateMeetingSummary(
  transcript: Transcript,
  format: SummaryOutputFormat = "markdown",
  overrides?: {
    customPrompt?: string;
    systemPrompt?: string;
  },
): Promise<SummaryResult> {
  const config = await getAppConfig();
  const llmBaseUrl = config.llmApiBaseUrl;
  const llmModel = config.llmModel;

  if (!llmBaseUrl || !llmModel) {
    throw new Error("请先在设置页配置 LLM API 地址和模型。");
  }

  const defaultPrompts = buildChineseSummaryPrompts(transcript, format);
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

  const body: Record<string, unknown> = {
    model: llmModel,
    temperature: 0.2,
    max_tokens: 3000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (format === "json") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${llmBaseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`纪要生成失败（${response.status}）：${message}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("纪要生成失败：模型返回内容为空，请重试。");
  }

  if (format === "json") {
    const structured = parseStructuredSummary(content);
    const markdown = structuredToMarkdown(structured);
    return { format: "json", markdown, structured };
  }

  return { format: "markdown", markdown: content };
}

function structuredToMarkdown(summary: StructuredSummary): string {
  const lines: string[] = [];

  if (summary.attendees.length > 0) {
    lines.push("## 参会人");
    for (const a of summary.attendees) {
      lines.push(`- ${a.name}${a.role ? `（${a.role}）` : ""}`);
    }
    lines.push("");
  }

  if (summary.overview) {
    lines.push("## 会议概述");
    lines.push(summary.overview);
    lines.push("");
  }

  for (const topic of summary.topics) {
    lines.push(`## ${topic.title}`);
    for (const point of topic.points) {
      lines.push(`- ${point}`);
    }
    if (topic.conclusion) {
      lines.push(`\n**结论：** ${topic.conclusion}`);
    }
    lines.push("");
  }

  if (summary.decisions.length > 0) {
    lines.push("## 决议事项");
    for (const d of summary.decisions) {
      lines.push(`- ${d}`);
    }
    lines.push("");
  }

  if (summary.actionItems.length > 0) {
    lines.push("## 待办事项");
    lines.push("| 事项 | 负责人 | 截止时间 |");
    lines.push("| --- | --- | --- |");
    for (const item of summary.actionItems) {
      lines.push(`| ${item.task} | ${item.owner} | ${item.deadline ?? "待确认"} |`);
    }
    lines.push("");
  }

  if (summary.risks.length > 0) {
    lines.push("## 风险与遗留");
    for (const r of summary.risks) {
      lines.push(`- ${r}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
