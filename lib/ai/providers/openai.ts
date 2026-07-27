import { buildMenuRiskPrompt } from "../prompt";
import {
  AIProviderError,
  menuRiskReportSchema,
  parseMenuRiskReport,
  type AIProvider,
  type AnalyzeMenuInput,
  type ProviderResult,
} from "../types";

type OpenAIResponse = {
  error?: { message?: string };
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  async analyzeMenuImages(input: AnalyzeMenuInput): Promise<ProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
    if (!apiKey) {
      throw new AIProviderError("缺少 OPENAI_API_KEY。", "config_missing");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          store: false,
          input: [{
            role: "user",
            content: [
              { type: "input_text", text: buildMenuRiskPrompt(input) },
              ...input.images.map((image) => ({
                type: "input_image",
                detail: "high",
                image_url: image.dataUrl,
              })),
            ],
          }],
          text: {
            format: {
              type: "json_schema",
              name: "menu_risk_report",
              strict: true,
              schema: menuRiskReportSchema,
            },
          },
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as OpenAIResponse;
      if (!response.ok) {
        console.error("OpenAI provider failed", response.status, payload.error?.message);
        throw new AIProviderError("OpenAI 请求失败。", "request_failed", response.status);
      }
      const text = payload.output
        ?.flatMap((item) => item.content ?? [])
        .find((content) => content.type === "output_text")
        ?.text;
      if (!text) {
        throw new AIProviderError("OpenAI 未返回报告内容。", "invalid_response");
      }
      return { provider: this.name, model, report: parseMenuRiskReport(text) };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AIProviderError("OpenAI 请求超时。", "timeout");
      }
      throw new AIProviderError("OpenAI 网络请求失败。", "request_failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}
