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
    const model = process.env.QWEN_MODEL?.trim() || "qwen3-vl-flash";
    const baseUrl =
      process.env.QWEN_BASE_URL?.trim() ||
      "https://dashscope.aliyuncs.com/compatible-mode/v1";
    if (!apiKey) {
      throw new AIProviderError("缺少 QWEN_API_KEY。", "config_missing");
    }

    const requestStartedAt = Date.now();
    const totalImageBytes = input.images.reduce((sum, image) => sum + image.bytes, 0);
    console.info("[qwen-provider] request-start", {
      startedAt: new Date(requestStartedAt).toISOString(),
      model,
      imageCount: input.images.length,
      totalImageBytes,
      images: input.images.map(({ name, bytes }) => ({ name, bytes })),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);
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
                max_pixels: 2_621_440,
              })),
              { type: "text", text: buildMenuRiskPrompt(input) },
            ],
          }],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 1800,
          enable_thinking: false,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as QwenResponse;
      const responseMs = Date.now() - requestStartedAt;
      const requestId =
        response.headers.get("x-request-id") ||
        response.headers.get("x-dashscope-request-id");
      console.info("[qwen-provider] response", {
        model,
        status: response.status,
        responseMs,
        requestId,
      });

      if (!response.ok) {
        const reason = payload.error?.message || `HTTP ${response.status}`;
        console.error("[qwen-provider] api-error", {
          model,
          status: response.status,
          responseMs: Date.now() - requestStartedAt,
          requestId,
          reason,
        });
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
        console.error("[qwen-provider] timeout", {
          model,
          responseMs: Date.now() - requestStartedAt,
          totalImageBytes,
        });
        throw new AIProviderError("通义千问请求超时。", "timeout");
      }
      console.error("[qwen-provider] network-error", {
        model,
        responseMs: Date.now() - requestStartedAt,
        reason: error instanceof Error ? error.message : String(error),
      });
      throw new AIProviderError("通义千问网络请求失败。", "request_failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}
