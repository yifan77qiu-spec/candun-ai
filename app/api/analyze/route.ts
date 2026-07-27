import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getAIProvider } from "@/lib/ai/provider";
import { AIProviderError, type MenuImage } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 180;

const MAX_FILES = 6;
const MAX_FILE_BYTES = 7 * 1024 * 1024;
const MAX_TOTAL_BYTES = 24 * 1024 * 1024;
const TARGET_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function compressMenuImage(image: File): Promise<MenuImage> {
  const original = Buffer.from(await image.arrayBuffer());
  let output = await sharp(original)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  if (output.byteLength > TARGET_IMAGE_BYTES) {
    output = await sharp(original)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();
  }
  if (output.byteLength > TARGET_IMAGE_BYTES) {
    throw new Error(`图片“${image.name}”压缩后仍超过 2MB`);
  }

  return {
    name: image.name,
    bytes: output.byteLength,
    originalBytes: image.size,
    dataUrl: `data:image/jpeg;base64,${output.toString("base64")}`,
  };
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestStartedAt = Date.now();
  console.info("[menu-analysis] request-start", {
    requestId,
    startedAt: new Date(requestStartedAt).toISOString(),
  });

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
      return apiError(`图片“${image.name}”过大，请压缩至 7MB 以内后重试。`, 413);
    }
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return apiError("全部图片合计不能超过 24MB，请减少图片或压缩后重试。", 413);
  }

  try {
    const compressionStartedAt = Date.now();
    const menuImages: MenuImage[] = [];
    for (const image of images) {
      menuImages.push(await compressMenuImage(image));
    }
    console.info("[menu-analysis] images-ready", {
      requestId,
      compressionMs: Date.now() - compressionStartedAt,
      images: menuImages.map(({ name, originalBytes, bytes }) => ({
        name,
        originalBytes,
        compressedBytes: bytes,
      })),
    });

    const provider = getAIProvider();
    const analysis = await provider.analyzeMenuImages({ images: menuImages, note });
    if (analysis.report.summary.startsWith("无法识别菜单文字")) {
      return apiError("图片中无法识别出菜单文字，请上传清晰、正向、光线充足的图片。", 422);
    }
    return NextResponse.json({
      result: analysis.report,
      provider: analysis.provider,
      model: analysis.model,
    });
  } catch (error) {
    console.error("[menu-analysis] request-failed", {
      requestId,
      durationMs: Date.now() - requestStartedAt,
      reason: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof AIProviderError) {
      if (error.code === "config_missing") {
        return apiError("AI 服务尚未完成配置，请联系管理员。", 503);
      }
      if (error.code === "timeout") {
        return apiError("AI 检测超时，请检查网络或减少图片数量后重试。", 504);
      }
      if (error.code === "invalid_response") {
        return apiError("AI 报告格式异常，请重新检测。", 502);
      }
    }
    if (error instanceof Error && error.message.includes("压缩后仍超过 2MB")) {
      return apiError(`${error.message}，请裁剪后重新上传。`, 413);
    }
    return apiError("AI 检测暂时不可用，请稍后重试。", 502);
  }
}
