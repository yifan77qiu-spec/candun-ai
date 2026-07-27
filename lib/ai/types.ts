export type RiskLevel = "high" | "medium" | "low";

export type MenuRisk = {
  title: string;
  originalText: string;
  riskLevel: RiskLevel;
  riskCategory: string;
  reason: string;
  complaintScenario: string;
  legalBasis: string;
  suggestions: string[];
  replacementCopy: string;
  evidenceNeeded: string[];
};

export type MenuRiskReport = {
  score: number;
  summary: string;
  risks: MenuRisk[];
};

export type MenuImage = {
  bytes: number;
  dataUrl: string;
  name: string;
  originalBytes: number;
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
  required: ["summary", "risks"],
  properties: {
    summary: { type: "string", minLength: 1 },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "originalText", "riskLevel", "riskCategory", "reason", "complaintScenario", "legalBasis", "suggestions", "replacementCopy", "evidenceNeeded"],
        properties: {
          title: { type: "string", minLength: 1 },
          originalText: { type: "string", minLength: 1 },
          riskLevel: { type: "string", enum: ["high", "medium", "low"] },
          riskCategory: { type: "string", minLength: 1 },
          reason: { type: "string", minLength: 1 },
          complaintScenario: { type: "string", minLength: 1 },
          legalBasis: { type: "string", minLength: 1 },
          suggestions: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
          replacementCopy: { type: "string", minLength: 1 },
          evidenceNeeded: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
        },
      },
    },
  },
} as const;

export function isMenuRiskReport(value: unknown): value is MenuRiskReport {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { summary?: unknown; risks?: unknown };
  return (
    typeof candidate.summary === "string" &&
    candidate.summary.length > 0 &&
    Array.isArray(candidate.risks) &&
    candidate.risks.every(
      (risk: MenuRisk) =>
        risk &&
        ["high", "medium", "low"].includes(risk.riskLevel) &&
        ["title", "originalText", "riskCategory", "reason", "complaintScenario", "legalBasis", "replacementCopy"].every(
          (key) => typeof risk[key as keyof MenuRisk] === "string",
        ) &&
        Array.isArray(risk.suggestions) &&
        risk.suggestions.length > 0 &&
        risk.suggestions.every((item) => typeof item === "string") &&
        Array.isArray(risk.evidenceNeeded) &&
        risk.evidenceNeeded.length > 0 &&
        risk.evidenceNeeded.every((item) => typeof item === "string"),
    )
  );
}

export function calculateRiskScore(risks: MenuRisk[]) {
  const deductions = risks.reduce((total, risk) => {
    if (risk.riskLevel === "high") return total + 20;
    if (risk.riskLevel === "medium") return total + 10;
    return total + 5;
  }, 0);
  return Math.max(0, 100 - deductions);
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
  return { ...value, score: calculateRiskScore(value.risks) };
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
