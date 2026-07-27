export type RiskLevel = "high" | "medium" | "low";

export type MenuRisk = {
  level: RiskLevel;
  item: string;
  reason: string;
  suggestion: string;
  legalReference: string;
};

export type MenuRiskReport = {
  score: number;
  summary: string;
  risks: MenuRisk[];
};

export type MenuImage = {
  dataUrl: string;
  name: string;
};

export type AnalyzeMenuInput = {
  images: MenuImage[];
  note: string;
};

export type ProviderResult = {
  model: string;
  provider: string;
  report: MenuRiskReport;
};

export interface AIProvider {
  readonly name: string;
  analyzeMenuImages(input: AnalyzeMenuInput): Promise<ProviderResult>;
}

export const menuRiskReportSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "summary", "risks"],
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    summary: { type: "string", minLength: 1 },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["level", "item", "reason", "suggestion", "legalReference"],
        properties: {
          level: { type: "string", enum: ["high", "medium", "low"] },
          item: { type: "string", minLength: 1 },
          reason: { type: "string", minLength: 1 },
          suggestion: { type: "string", minLength: 1 },
          legalReference: { type: "string", minLength: 1 },
        },
      },
    },
  },
} as const;

export function isMenuRiskReport(value: unknown): value is MenuRiskReport {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MenuRiskReport>;
  return (
    typeof candidate.score === "number" &&
    candidate.score >= 0 &&
    candidate.score <= 100 &&
    typeof candidate.summary === "string" &&
    candidate.summary.length > 0 &&
    Array.isArray(candidate.risks) &&
    candidate.risks.every(
      (risk) =>
        risk &&
        ["high", "medium", "low"].includes(risk.level) &&
        ["item", "reason", "suggestion", "legalReference"].every(
          (key) => typeof risk[key as keyof typeof risk] === "string",
        ),
    )
  );
}

export function parseMenuRiskReport(text: string): MenuRiskReport {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new AIProviderError("AI 返回内容不是有效 JSON。", "invalid_response");
  }

  if (!isMenuRiskReport(value)) {
    throw new AIProviderError("AI 返回的报告结构不符合要求。", "invalid_response");
  }
  return value;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "config_missing"
      | "invalid_response"
      | "request_failed"
      | "timeout",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
