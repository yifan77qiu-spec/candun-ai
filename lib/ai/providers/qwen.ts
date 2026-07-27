import { buildMenuRiskPrompt } from "../prompt";
import {
  AIProviderError,
  parseMenuRiskReport,
  type AIProvider,
  type AnalyzeMenuInput,
  type ProviderResult,
} from "../types";

type QwenResponse = {
  error?: { message?: string };
  choices?: Array<{
    message?: { content?: string };
  }>;
};

export class QwenProvider implements AIProvider {
  readonly name = "qwen";

  async analyzeMenuImages(input: AnalyzeMenuInput): Promise<ProviderResult> {
    const apiKey = process.env.QWEN_API_KEY?.trim();
    const model = process.env.QWEN_MODEL?.trim() || "qwen-vl-plus";
    const baseUrl =
      process.env.QWEN_BASE_URL?.trim() ||
      "https://dashscope.aliyuncs.com/compatible-mode/v1";
    if (!apiKey) {
      throw new AIProviderError("缺少 QWEN_API_KEY。", "config_missing");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: "user",
            content: [
              ...input.images.map((image) => ({
                type: "image_url",
                image_url: { url: image.dataUrl },
              })),
              { type: "text", text: buildMenuRiskPrompt(input) },
            ],
          }],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as QwenResponse;
      if (!response.ok) {
        console.error("Qwen provider failed", response.status, payload.error?.message);
        throw new AIProviderError("通义千问请求失败。", "request_failed", response.status);
      }
      const text = payload.choices?.[0]?.message?.content;
      if (!text) {
        throw new AIProviderError("通义千问未返回报告内容。", "invalid_response");
      }
      return { provider: this.name, model, report: parseMenuRiskReport(text) };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AIProviderError("通义千问请求超时。", "timeout");
      }
      throw new AIProviderError("通义千问网络请求失败。", "request_failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}
