import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILES = 6;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 24 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";

const reportSchema = {
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

type OpenAIResponse = {
  error?: { message?: string };
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

type Analysis = {
  score: number;
  summary: string;
  risks: Array<{
    level: "high" | "medium" | "low";
    item: string;
    reason: string;
    suggestion: string;
    legalReference: string;
  }>;
};

function responseText(response: OpenAIResponse) {
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")
    ?.text;
}

function isAnalysis(value: unknown): value is Analysis {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Analysis>;
  return (
    typeof candidate.score === "number" &&
    candidate.score >= 0 &&
    candidate.score <= 100 &&
    typeof candidate.summary === "string" &&
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

function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return apiError("AI 服务尚未配置，请联系管理员配置 OPENAI_API_KEY。", 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("上传内容无法读取，请重新选择图片后再试。", 400);
  }

  const type = form.get("type");
  const note = String(form.get("note") ?? "").trim();
  const images = form.getAll("images").filter((entry): entry is File => entry instanceof File);

  if (type !== "menu") {
    return apiError("当前真实 AI 检测阶段仅开放菜单体检。", 400);
  }
  if (!images.length && !note) {
    return apiError("请上传菜单图片，或粘贴菜单文字后再检测。", 400);
  }
  if (images.length > MAX_FILES) {
    return apiError(`一次最多上传 ${MAX_FILES} 张菜单图片。`, 400);
  }

  let totalBytes = 0;
  for (const image of images) {
    totalBytes += image.size;
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return apiError("仅支持 JPG、PNG、WebP 格式的菜单图片。", 415);
    }
    if (image.size > MAX_FILE_BYTES) {
      return apiError(`图片“${image.name}”超过 8MB，请压缩后重试。`, 413);
    }
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return apiError("全部图片合计不能超过 24MB，请减少图片或压缩后重试。", 413);
  }

  const imageInputs = await Promise.all(
    images.map(async (image) => ({
      type: "input_image" as const,
      detail: "high" as const,
      image_url: `data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`,
    })),
  );

  const prompt = `你是一名谨慎的中国餐饮食品合规风险审核专家。

任务：
1. 先从全部图片中识别菜单文字，并结合商家补充说明理解商品名称和描述。
2. 检查：商品名称风险、宣传用语风险、原料描述风险、绝对化宣传风险、虚假宣传风险、可能引起消费者误解的表达。
3. 生成结构化风险报告。score 是“合规安全评分”：0 表示风险极高，100 表示未发现明显风险。

判断原则：
- 只根据图片中能够识别的文字与补充说明判断，不猜测商家实际原料或制作过程。
- 每个风险 item 必须引用菜单中的具体原文；suggestion 必须给出可直接使用的改写。
- 只有在确信法律名称与条文准确时，才写入 legalReference。
- 无法确认具体法规依据时，legalReference 必须严格返回“需要人工确认”，禁止编造法规、条款、案例或处罚结论。
- 如果图片模糊、没有菜单文字且补充说明也没有可分析的菜单内容，summary 必须以“无法识别菜单文字”开头，risks 返回空数组，score 返回 0。
- 如果没有发现明显风险，risks 返回空数组，并在 summary 中明确说明本次识别范围与仍需人工核对的事项。

商家补充说明：
${note || "无"}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: prompt }, ...imageInputs],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "menu_risk_report",
            strict: true,
            schema: reportSchema,
          },
        },
      }),
      signal: controller.signal,
    });

    const payload = (await openAIResponse.json()) as OpenAIResponse;
    if (!openAIResponse.ok) {
      console.error("OpenAI request failed", openAIResponse.status, payload.error?.message);
      return apiError("AI 检测暂时不可用，请稍后重试。", 502);
    }

    const text = responseText(payload);
    if (!text) {
      return apiError("AI 未能生成检测报告，请换一张更清晰的菜单图片重试。", 502);
    }

    let result: unknown;
    try {
      result = JSON.parse(text);
    } catch {
      return apiError("AI 返回内容无法解析，请重新检测。", 502);
    }

    if (!isAnalysis(result)) {
      return apiError("AI 报告格式异常，请重新检测。", 502);
    }
    if (result.summary.startsWith("无法识别菜单文字")) {
      return apiError("图片中无法识别出菜单文字，请上传清晰、正向、光线充足的图片。", 422);
    }

    return NextResponse.json({ result, model: MODEL });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return apiError("AI 检测超时，请检查网络或减少图片数量后重试。", 504);
    }
    console.error("Analyze route failed", error);
    return apiError("网络连接失败，请稍后重试。", 502);
  } finally {
    clearTimeout(timeout);
  }
}
