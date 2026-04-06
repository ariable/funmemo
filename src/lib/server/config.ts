import { prisma } from "@/lib/prisma";

export type AppConfigDTO = {
  transcriptionApiBaseUrl: string;
  transcriptionApiToken: string;
  transcriptionModel: string;
  llmApiBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
};

export const defaultAppConfig: AppConfigDTO = {
  transcriptionApiBaseUrl: process.env.FUNASR_API_BASE_URL ?? "http://127.0.0.1:17003",
  transcriptionApiToken: process.env.FUNASR_API_TOKEN ?? "",
  transcriptionModel: process.env.FUNASR_MODEL ?? "qwen3-asr",
  llmApiBaseUrl: process.env.LLM_API_BASE_URL ?? "",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "",
};

export async function getAppConfig(): Promise<AppConfigDTO> {
  const config = await prisma.appConfig.findUnique({
    where: { id: "default" },
  });

  if (!config) {
    return defaultAppConfig;
  }

  return {
    transcriptionApiBaseUrl:
      config.transcriptionApiBaseUrl?.trim() || defaultAppConfig.transcriptionApiBaseUrl,
    transcriptionApiToken: config.transcriptionApiToken ?? defaultAppConfig.transcriptionApiToken,
    transcriptionModel: config.transcriptionModel?.trim() || defaultAppConfig.transcriptionModel,
    llmApiBaseUrl: config.llmApiBaseUrl?.trim() || defaultAppConfig.llmApiBaseUrl,
    llmApiKey: config.llmApiKey ?? defaultAppConfig.llmApiKey,
    llmModel: config.llmModel?.trim() || defaultAppConfig.llmModel,
  };
}

export async function saveAppConfig(input: Partial<AppConfigDTO>) {
  return prisma.appConfig.upsert({
    where: { id: "default" },
    update: {
      transcriptionApiBaseUrl: input.transcriptionApiBaseUrl?.trim(),
      transcriptionApiToken: input.transcriptionApiToken ?? "",
      transcriptionModel: input.transcriptionModel?.trim(),
      llmApiBaseUrl: input.llmApiBaseUrl?.trim(),
      llmApiKey: input.llmApiKey ?? "",
      llmModel: input.llmModel?.trim(),
    },
    create: {
      id: "default",
      transcriptionApiBaseUrl: input.transcriptionApiBaseUrl?.trim(),
      transcriptionApiToken: input.transcriptionApiToken ?? "",
      transcriptionModel: input.transcriptionModel?.trim(),
      llmApiBaseUrl: input.llmApiBaseUrl?.trim(),
      llmApiKey: input.llmApiKey ?? "",
      llmModel: input.llmModel?.trim(),
    },
  });
}
