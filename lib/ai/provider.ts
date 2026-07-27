import "server-only";

import { OpenAIProvider } from "./providers/openai";
import { QwenProvider } from "./providers/qwen";
import { AIProviderError, type AIProvider } from "./types";

export type AIProviderName = "openai" | "qwen" | "deepseek";

export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER?.trim().toLowerCase() || "qwen") as AIProviderName;

  if (provider === "qwen") return new QwenProvider();
  if (provider === "openai") return new OpenAIProvider();
  if (provider === "deepseek") {
    throw new AIProviderError(
      "DeepSeek Provider 尚未接入图片理解能力，请选择 qwen 或 openai。",
      "config_missing",
    );
  }
  throw new AIProviderError(`不支持的 AI_PROVIDER：${provider}`, "config_missing");
}
