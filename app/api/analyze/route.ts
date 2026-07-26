import { NextRequest, NextResponse } from "next/server";

const allowedTypes = new Set(["menu", "complaint", "regulator", "copy"]);

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    type?: string;
    note?: string;
    fileCount?: number;
  };

  if (!body.type || !allowedTypes.has(body.type)) {
    return NextResponse.json({ error: "不支持的分析类型" }, { status: 400 });
  }

  if (!body.note?.trim() && !body.fileCount) {
    return NextResponse.json({ error: "请上传图片或补充说明" }, { status: 400 });
  }

  // AI 接口预留：
  // 1. 将图片上传至对象存储并取得受控 URL；
  // 2. 根据 type 选择场景化系统提示词；
  // 3. 调用模型的图像理解 / 文本分析接口；
  // 4. 校验模型输出后，以 Analysis 结构返回。
  //
  // MVP 目前由前端展示对应场景的示例结果，以便先验证完整产品流程。
  await new Promise((resolve) => setTimeout(resolve, 900));
  return NextResponse.json({ mode: "demo", result: null });
}
