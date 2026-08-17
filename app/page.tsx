"use client";

import Link from "next/link";
import Image from "next/image";
import { ChangeEvent, DragEvent, FormEvent, useMemo, useRef, useState } from "react";

type Risk = {
  title: string;
  originalText: string;
  riskLevel: "high" | "medium" | "low";
  riskCategory: string;
  reason: string;
  complaintScenario: string;
  legalBasis: string;
  suggestions: string[];
  replacementCopy: string;
  evidenceNeeded: string[];
};

type Analysis = { score: number; summary: string; risks: Risk[] };
type Status = "high" | "medium" | "pass" | "pending";
type CheckMethod = "AI深度检测" | "基础问卷检查" | "待人工核验";
type RestaurantCategory = "" | "snack" | "chinese" | "hotpot" | "beverage" | "bakery" | "seafood" | "deli" | "other";
type CategoryAnswer = "" | "yes" | "no" | "unsure";
type ModuleResult = {
  key: string;
  title: string;
  status: Status;
  statusLabel: string;
  method: CheckMethod;
  issue: string;
};

type Answers = {
  storeName: string;
  category: RestaurantCategory;
  categoryChecks: Record<string, CategoryAnswer>;
  businessType: "" | "dinein" | "delivery" | "both";
  employeeCount: string;
  laborContracts: "" | "all" | "partial" | "none" | "na";
  socialInsurance: "" | "all" | "partial" | "none" | "na";
  foodLicense: "" | "yes" | "no" | "unsure";
  riskyPromotion: "" | "yes" | "no" | "unsure";
  recentComplaint: "" | "yes" | "no";
  uploadMenu: "" | "yes" | "no";
};

type RestaurantReport = {
  score: number;
  modules: ModuleResult[];
  missingMaterials: string[];
  menuAnalysis: Analysis | null;
};

const initialAnswers: Answers = {
  storeName: "",
  category: "",
  categoryChecks: {},
  businessType: "",
  employeeCount: "",
  laborContracts: "",
  socialInsurance: "",
  foodLicense: "",
  riskyPromotion: "",
  recentComplaint: "",
  uploadMenu: "",
};

const categoryProfiles = {
  snack: {
    label: "小吃快餐",
    questions: [
      ["ingredientNames", "菜名是否包含需要核对真实原料的表达？", "例如蟹肉、牛肉、鲜虾、鲍鱼、手打等"],
      ["portionClaims", "是否使用大份、超值、足量等分量描述？", "需要确保图片、克重和实际出品基本一致"],
      ["preparedFood", "是否使用预制、复热或外购半成品？", "建议核对菜单描述与实际制作方式是否一致"],
    ],
  },
  chinese: {
    label: "中餐／正餐",
    questions: [
      ["signatureClaims", "是否使用招牌、正宗、祖传或秘制等表达？", "建议核验品牌、传承和制作依据"],
      ["marketPrice", "是否存在时价、称重或另收加工费的菜品？", "价格和计价方式需要提前清晰展示"],
      ["coldDishes", "是否制作凉菜、生食或自制饮品？", "可能需要进一步核验许可范围和操作条件"],
    ],
  },
  hotpot: {
    label: "火锅／烧烤",
    questions: [
      ["openFlame", "门店是否使用燃气、炭火或其他明火？", "需要进一步核验燃气、排烟和消防管理"],
      ["rawFood", "是否由顾客接触或自行烹饪生肉、生海鲜？", "建议核验生熟分区、夹具和食用提示"],
      ["homemadeSauce", "是否提供自制蘸料、饮品或腌制食品？", "建议核验储存、保质和过敏原提示"],
    ],
  },
  beverage: {
    label: "奶茶／咖啡／饮品",
    questions: [
      ["healthClaims", "是否使用0糖、减肥、养生、纯天然等表达？", "此类表达通常需要重点核验依据和适用条件"],
      ["freshClaims", "是否使用鲜榨、现切、现煮或当天制作等表达？", "需要确保门店实际制作流程能够支持宣传"],
      ["selfMadeIce", "是否使用自制冰块、鲜切水果或自制小料？", "建议进一步核验制冰、冷藏和保存管理"],
    ],
  },
  bakery: {
    label: "烘焙／甜品",
    questions: [
      ["additiveClaims", "是否使用0添加、无糖、低脂或纯手工等表达？", "建议核对配料、工艺和检测或证明材料"],
      ["shelfLife", "是否销售短保、冷藏或当天制作产品？", "需要明确保存条件、制作日期和食用期限"],
      ["allergens", "产品是否含坚果、乳制品、鸡蛋等常见过敏原？", "建议检查菜单和包装是否提供必要提示"],
    ],
  },
  seafood: {
    label: "海鲜／水产",
    questions: [
      ["speciesNames", "菜单是否明确海鲜品种和商品名称？", "俗称、图片和实际品种需要保持一致"],
      ["weighing", "是否按斤、只、份或时价进行计价？", "建议明确单位、价格和称重确认方式"],
      ["processingFee", "是否另收加工费、调料费或服务费？", "额外费用应在消费前清晰告知"],
    ],
  },
  deli: {
    label: "熟食／卤味",
    questions: [
      ["bulkFood", "是否销售散装、称重熟食？", "建议核验名称、价格、制作或分装信息"],
      ["storage", "产品是否需要冷藏、热藏或限时食用？", "需要明确保存条件和建议食用时间"],
      ["onsiteProduction", "菜单是否使用现卤、当天现做或纯手工等表达？", "需要确保实际制作和记录能够支持宣传"],
    ],
  },
  other: {
    label: "其他餐饮",
    questions: [
      ["specialClaims", "是否使用第一、正宗、老字号、非遗等特殊宣传？", "建议核验宣传依据和授权材料"],
      ["specialProcess", "是否涉及生食、冷食、自制饮品或特殊加工？", "可能需要进一步核验许可范围和操作条件"],
      ["extraFees", "是否存在称重、时价或额外服务费用？", "计价规则和额外费用应提前明确展示"],
    ],
  },
} as const;

const categoryOptions = Object.entries(categoryProfiles).map(([value, profile]) => [value, profile.label] as const);

const riskModules = [
  ["menu", "菜单与宣传风险", "AI深度检测", "检查菜名、原料描述与宣传表达"],
  ["delivery", "外卖页面风险", "基础问卷检查", "了解外卖经营及页面资料情况"],
  ["complaint", "消费投诉风险", "基础问卷检查", "了解近期消费者、平台或监管反馈"],
  ["labor", "劳动用工风险", "基础问卷检查", "了解劳动合同与社保基础情况"],
  ["food", "食品安全风险", "待人工核验", "提示需要进一步核验的经营资料"],
  ["license", "营业资质风险", "基础问卷检查", "了解食品经营许可证现状"],
  ["safety", "消防与门店安全风险", "待人工核验", "提示后续应完成的现场检查"],
] as const;

const UPLOAD_LIMITS = {
  free: { maxFiles: 2, maxTotalBytes: 4 * 1024 * 1024 },
  paid: { maxFiles: 6, maxTotalBytes: 12 * 1024 * 1024 },
} as const;
const ACTIVE_UPLOAD_TIER: keyof typeof UPLOAD_LIMITS = "free";
const TARGET_IMAGE_BYTES = 1.1 * 1024 * 1024;

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片转换失败"))),
      "image/jpeg",
      quality,
    );
  });
}

async function compressImageForUpload(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法处理图片");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob = await canvasToJpeg(canvas, 0.82);
    for (const quality of [0.74, 0.66, 0.58]) {
      if (blob.size <= TARGET_IMAGE_BYTES) break;
      blob = await canvasToJpeg(canvas, quality);
    }
    if (blob.size > 1.2 * 1024 * 1024) {
      throw new Error(`图片“${file.name}”压缩后仍过大，请裁剪后重试。`);
    }
    const stem = file.name.replace(/\.[^.]+$/, "") || "menu";
    return new File([blob], `${stem}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

function menuStatus(analysis: Analysis | null, riskyPromotion: Answers["riskyPromotion"]): Pick<ModuleResult, "status" | "statusLabel" | "issue"> {
  if (!analysis && riskyPromotion === "yes") return { status: "medium", statusLabel: "中风险", issue: "问卷显示正在使用高频风险宣传表达，建议上传菜单核验" };
  if (!analysis && riskyPromotion === "unsure") return { status: "pending", statusLabel: "待补充资料", issue: "宣传表达尚不明确，建议上传菜单或外卖页面" };
  if (!analysis) return { status: "pending", statusLabel: "待补充资料", issue: "尚未上传菜单或外卖页面" };
  const high = analysis.risks.filter((risk) => risk.riskLevel === "high").length;
  const medium = analysis.risks.filter((risk) => risk.riskLevel === "medium").length;
  if (high) return { status: "high", statusLabel: "高风险", issue: `识别到 ${high} 项高风险表达` };
  if (medium) return { status: "medium", statusLabel: "中风险", issue: `识别到 ${medium} 项中风险表达` };
  return { status: "pass", statusLabel: "未见明显高频风险", issue: "仍建议人工核对实际商品与宣传依据" };
}

function buildRestaurantReport(answers: Answers, menuAnalysis: Analysis | null): RestaurantReport {
  const employeeCount = Math.max(0, Number.parseInt(answers.employeeCount || "0", 10) || 0);
  const hasDelivery = answers.businessType === "delivery" || answers.businessType === "both";
  const menu = menuStatus(menuAnalysis, answers.riskyPromotion);
  const categoryProfile = answers.category ? categoryProfiles[answers.category] : null;
  const categoryAnswers = Object.values(answers.categoryChecks);
  const categoryNeedsReview = categoryAnswers.filter((answer) => answer === "yes" || answer === "unsure").length;
  const categoryLabel = categoryProfile?.label || "当前品类";
  const modules: ModuleResult[] = [
    { key: "menu", title: "菜单与宣传风险", method: menuAnalysis ? "AI深度检测" : "基础问卷检查", ...menu },
    hasDelivery
      ? { key: "delivery", title: "外卖页面风险", method: "基础问卷检查", status: menuAnalysis ? "medium" : "pending", statusLabel: menuAnalysis ? "基础检查完成" : "待补充资料", issue: menuAnalysis ? "已检查上传内容，完整外卖页面仍待人工核验" : "尚未上传完整外卖页面" }
      : { key: "delivery", title: "外卖页面风险", method: "基础问卷检查", status: "pass", statusLabel: "当前不适用", issue: "问卷显示当前未经营外卖" },
    answers.recentComplaint === "yes"
      ? { key: "complaint", title: "消费投诉风险", method: "基础问卷检查", status: "high", statusLabel: "高风险", issue: "近期收到过消费者、平台或监管投诉" }
      : { key: "complaint", title: "消费投诉风险", method: "基础问卷检查", status: "pass", statusLabel: "基础检查通过", issue: "问卷显示近期未收到投诉" },
    employeeCount === 0 || answers.laborContracts === "na"
      ? { key: "labor", title: "劳动用工风险", method: "基础问卷检查", status: "pass", statusLabel: "当前不适用", issue: "问卷显示当前没有员工" }
      : answers.laborContracts === "none" || answers.socialInsurance === "none"
        ? { key: "labor", title: "劳动用工风险", method: "基础问卷检查", status: "high", statusLabel: "高风险", issue: "存在未签劳动合同或未缴社保的情况" }
        : answers.laborContracts === "partial" || answers.socialInsurance === "partial"
          ? { key: "labor", title: "劳动用工风险", method: "基础问卷检查", status: "medium", statusLabel: "中风险", issue: "部分员工资料或社保状态需要补充核验" }
          : { key: "labor", title: "劳动用工风险", method: "基础问卷检查", status: "pass", statusLabel: "基础检查通过", issue: "问卷显示合同与社保基础事项已完成，内容仍待人工核验" },
    categoryNeedsReview > 0
      ? { key: "food", title: "食品安全风险", method: "基础问卷检查", status: "medium", statusLabel: "中风险", issue: `${categoryLabel}专项问卷发现 ${categoryNeedsReview} 项需要进一步核验` }
      : { key: "food", title: "食品安全风险", method: "待人工核验", status: "pending", statusLabel: "待核验", issue: `${categoryLabel}专项问卷未见明显提示，仍需核验进货、健康证、后厨与储存情况` },
    answers.foodLicense === "yes"
      ? { key: "license", title: "营业资质风险", method: "基础问卷检查", status: "pass", statusLabel: "基础检查通过", issue: "已确认持证，证照有效期与经营范围仍待人工核验" }
      : answers.foodLicense === "no"
        ? { key: "license", title: "营业资质风险", method: "基础问卷检查", status: "high", statusLabel: "高风险", issue: "问卷显示尚未取得食品经营许可证，建议尽快人工确认" }
        : { key: "license", title: "营业资质风险", method: "基础问卷检查", status: "pending", statusLabel: "待上传证照", issue: "许可证状态尚不明确" },
    { key: "safety", title: "消防与门店安全风险", method: "待人工核验", status: "pending", statusLabel: "待完成检查", issue: "需进行门店现场、消防通道与设备检查" },
  ];

  const high = modules.filter((module) => module.status === "high").length;
  const medium = modules.filter((module) => module.status === "medium").length;
  const pending = modules.filter((module) => module.status === "pending").length;
  const score = Math.max(0, 100 - high * 15 - medium * 8 - pending * 3);
  const missingMaterials = [
    !menuAnalysis && "菜单或外卖页面截图",
    categoryNeedsReview > 0 && `${categoryLabel}专项经营资料与现场记录`,
    answers.foodLicense !== "yes" && "食品经营许可证",
    employeeCount > 0 && "劳动合同与社保缴纳记录",
    "食品进货台账、员工健康证与后厨检查资料",
    "消防设施与门店安全检查记录",
  ].filter(Boolean) as string[];

  return { score, modules, missingMaterials, menuAnalysis };
}

export default function Home() {
  const [view, setView] = useState<"home" | "questionnaire" | "report">("home");
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<RestaurantReport | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  const selectedCategoryProfile = answers.category ? categoryProfiles[answers.category] : null;

  function startCheck() {
    setView("questionnaire");
    setError("");
    window.setTimeout(() => document.getElementById("questionnaire")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function reset() {
    setView("home");
    setAnswers(initialAnswers);
    setFiles([]);
    setNote("");
    setReport(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setError("");
    const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
    const incoming = Array.from(list);
    if (incoming.some((file) => !allowed.has(file.type))) {
      setError("仅支持 JPG、PNG、WebP 格式的菜单图片。");
      return;
    }
    const limit = UPLOAD_LIMITS[ACTIVE_UPLOAD_TIER];
    const remaining = limit.maxFiles - files.length;
    if (remaining <= 0) {
      setError(`免费体检最多上传 ${limit.maxFiles} 张菜单图片。`);
      return;
    }
    const selected = incoming.slice(0, remaining);
    console.info("[menu-upload] upload-start", { imageCount: selected.length, originalBytes: selected.reduce((sum, file) => sum + file.size, 0) });
    setOptimizing(true);
    try {
      const compressed: File[] = [];
      for (const file of selected) compressed.push(await compressImageForUpload(file));
      const nextFiles = [...files, ...compressed];
      const totalBytes = nextFiles.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > limit.maxTotalBytes) throw new Error("图片压缩后合计仍超过 4MB，请减少图片或裁剪后重试。");
      console.info("[menu-upload] browser-compression-complete", { imageCount: compressed.length, compressedBytes: compressed.reduce((sum, file) => sum + file.size, 0), totalUploadBytes: totalBytes });
      setFiles(nextFiles);
      if (incoming.length > remaining) setError(`免费体检最多上传 ${limit.maxFiles} 张，本次已保留前 ${remaining} 张。`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "图片处理失败，请重新选择。");
    } finally {
      setOptimizing(false);
    }
  }

  async function submitCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedCategoryQuestions = answers.category ? categoryProfiles[answers.category].questions : [];
    const categoryComplete = selectedCategoryQuestions.every(([key]) => Boolean(answers.categoryChecks[key]));
    if (!answers.category || !categoryComplete || !answers.businessType || !answers.employeeCount || !answers.laborContracts || !answers.socialInsurance || !answers.foodLicense || !answers.riskyPromotion || !answers.recentComplaint || !answers.uploadMenu) {
      setError("请完成所有必填问题后再生成体检报告。");
      return;
    }
    if (answers.uploadMenu === "yes" && !files.length && !note.trim()) {
      setError("请选择菜单图片，或在补充说明中粘贴菜单文字。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let menuAnalysis: Analysis | null = null;
      if (answers.uploadMenu === "yes") {
        const form = new FormData();
        const categoryProfile = categoryProfiles[answers.category];
        const answerLabel: Record<Exclude<CategoryAnswer, "">, string> = {
          yes: "有／涉及",
          no: "没有",
          unsure: "不确定",
        };
        const categoryContext = categoryProfile.questions
          .map(([key, title]) => `${title}：${answerLabel[answers.categoryChecks[key] as Exclude<CategoryAnswer, "">]}`)
          .join("\n");
        form.append("type", "menu");
        form.append("note", [
          `门店品类：${categoryProfile.label}`,
          `经营方式：${answers.businessType === "both" ? "堂食＋外卖" : answers.businessType === "delivery" ? "外卖" : "堂食"}`,
          categoryContext,
          note.trim() ? `商家补充说明：${note.trim()}` : "",
        ].filter(Boolean).join("\n"));
        files.forEach((file) => form.append("images", file));
        const response = await fetch("/api/analyze", { method: "POST", body: form });
        const data = (await response.json()) as { result?: Analysis; error?: string };
        if (!response.ok || !data.result) throw new Error(data.error || "菜单检测失败，请稍后重试。");
        menuAnalysis = data.result;
      }
      setReport(buildRestaurantReport(answers, menuAnalysis));
      setView("report");
      window.setTimeout(() => document.getElementById("restaurant-report")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "网络连接失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <button className="brand brand-button" onClick={reset} aria-label="餐盾首页"><span className="brand-mark">餐</span><span>餐盾</span></button>
        <div className="header-status"><span /> 餐厅经营风险体检</div>
      </header>

      {view === "home" && (
        <>
          <section className="hero restaurant-hero">
            <div className="hero-copy">
              <div className="eyebrow"><span>免费</span> 发现门店经营风险</div>
              <h1>给你的餐厅做一次<br /><em>免费风险体检</em></h1>
              <p>餐盾会根据门店经营情况，检查菜单宣传、外卖页面、劳动用工、食品安全、证照与门店安全等风险，帮助老板发现自己没有意识到的问题。</p>
              <button className="hero-cta" onClick={startCheck}>立即免费体检 <b>→</b></button>
              <small className="hero-note">无需注册 · 约3分钟 · 检查免费，整改收费</small>
            </div>
            <div className="hero-report restaurant-preview" aria-label="餐厅经营风险体检报告预览">
              <div className="preview-head"><b>餐厅经营风险体检报告</b><span>问卷后生成</span></div>
              <p className="placeholder-intro">不需要老板先判断问题，餐盾会按经营情况主动引导检查。</p>
              <div className="module-preview-list">
                {riskModules.slice(0, 5).map(([key, title, method]) => (
                  <div key={key}><span className="module-dot" /><strong>{title}</strong><small>{method}</small><em>待体检</em></div>
                ))}
              </div>
              <div className="preview-footer">免费发现问题 <span>·</span> 付费获得完整整改方案</div>
            </div>
          </section>

          <section className="trust-strip platform-trust">
            <div><b>查</b><span><strong>主动引导体检</strong>老板不必先知道该问什么</span></div>
            <div><b>明</b><span><strong>明确检测深度</strong>区分 AI、问卷与人工核验</span></div>
            <div><b>改</b><span><strong>检查免费</strong>需要时再解锁完整整改方案</span></div>
          </section>

          <section className="module-section">
            <div className="content-heading">
              <p>一次看清七类经营风险</p>
              <h2>餐厅经营，不只有菜单需要检查</h2>
              <span>第一版以菜单与宣传为深度检测能力，其余模块通过基础问卷发现线索，并如实提示需要补充的资料。</span>
            </div>
            <div className="risk-module-grid">
              {riskModules.map(([key, title, method, description], index) => (
                <article key={key}>
                  <div><b>{String(index + 1).padStart(2, "0")}</b><span className={`method-tag ${method === "AI深度检测" ? "deep" : method === "基础问卷检查" ? "basic" : "manual"}`}>{method}</span></div>
                  <h3>{title}</h3><p>{description}</p>
                </article>
              ))}
            </div>
            <button className="section-cta" onClick={startCheck}>立即免费体检 <b>→</b></button>
            <small className="section-cta-note">免费查看综合评分、模块状态和问题名称</small>
          </section>

          <section className="model-section">
            <div><p>免费负责发现问题</p><h2>先知道风险在哪里</h2><ul><li>门店综合风险评分</li><li>七类风险模块状态</li><li>高、中风险及待检查数量</li><li>一个菜单风险示例详情</li><li>尚未上传或核验的资料</li></ul></div>
            <div><p>付费负责解决问题</p><h2>¥18.8 获取整改方案</h2><ul><li>全部问题原因与可能场景</li><li>法规依据或人工确认提示</li><li>具体整改步骤与优先级</li><li>可直接复制的替换文案</li><li>需要准备的证明材料</li></ul><Link href="/pricing#unlock">了解完整整改方案 →</Link></div>
          </section>
        </>
      )}

      {view === "questionnaire" && (
        <section className="questionnaire" id="questionnaire">
          <div className="questionnaire-head">
            <button onClick={() => setView("home")}>← 返回首页</button>
            <span>免费经营风险体检</span>
            <em>约3分钟</em>
          </div>
          <div className="questionnaire-intro"><p>餐盾会主动引导</p><h1>先了解你的门店</h1><span>请按真实情况填写。问卷只做初步风险识别，不替代律师、监管部门或专业机构的正式审核。</span></div>
          <form className="check-form" onSubmit={submitCheck}>
            <Question index="01" title="门店名称" optional><input value={answers.storeName} onChange={(event) => setAnswers({ ...answers, storeName: event.target.value })} placeholder="例如：闽秋柒面线糊" /></Question>
            <Question index="02" title="你的门店属于什么品类？" description="选择后，餐盾会结合这个品类追加专项问题"><Choice name="category" value={answers.category} options={categoryOptions} onChange={(value) => setAnswers({ ...answers, category: value as RestaurantCategory, categoryChecks: {} })} /></Question>
            <Question index="03" title="经营类型"><Choice name="businessType" value={answers.businessType} options={[["dinein", "堂食"], ["delivery", "外卖"], ["both", "堂食 + 外卖"]]} onChange={(value) => setAnswers({ ...answers, businessType: value as Answers["businessType"] })} /></Question>

            {selectedCategoryProfile && (
              <div className="category-question-block">
                <div className="category-question-head"><span>品类专项检查</span><h2>{selectedCategoryProfile.label}需要重点了解</h2><p>以下问题只用于发现需要进一步核验的线索，不直接认定违规。</p></div>
                {selectedCategoryProfile.questions.map(([key, title, description], index) => (
                  <Question key={key} index={`S${index + 1}`} title={title} description={description}>
                    <Choice name={`category-${key}`} value={answers.categoryChecks[key] || ""} options={[["yes", "有 / 涉及"], ["no", "没有"], ["unsure", "不确定"]]} onChange={(value) => setAnswers({ ...answers, categoryChecks: { ...answers.categoryChecks, [key]: value as CategoryAnswer } })} />
                  </Question>
                ))}
              </div>
            )}

            <Question index="04" title="员工人数"><input type="number" min="0" inputMode="numeric" value={answers.employeeCount} onChange={(event) => setAnswers({ ...answers, employeeCount: event.target.value })} placeholder="请输入当前员工人数，没有员工填 0" /></Question>
            <Question index="05" title="是否已签劳动合同"><Choice name="laborContracts" value={answers.laborContracts} options={[["all", "全部已签"], ["partial", "部分已签"], ["none", "均未签"], ["na", "没有员工"]]} onChange={(value) => setAnswers({ ...answers, laborContracts: value as Answers["laborContracts"] })} /></Question>
            <Question index="06" title="是否给员工缴纳社保"><Choice name="socialInsurance" value={answers.socialInsurance} options={[["all", "全部已缴"], ["partial", "部分已缴"], ["none", "均未缴"], ["na", "没有员工"]]} onChange={(value) => setAnswers({ ...answers, socialInsurance: value as Answers["socialInsurance"] })} /></Question>
            <Question index="07" title="是否有食品经营许可证"><Choice name="foodLicense" value={answers.foodLicense} options={[["yes", "有"], ["no", "没有"], ["unsure", "不确定 / 待核验"]]} onChange={(value) => setAnswers({ ...answers, foodLicense: value as Answers["foodLicense"] })} /></Question>
            <Question index="08" title="是否使用以下宣传表达" description="第一、最好吃、0添加、纯天然、老字号、非遗、祖传等"><Choice name="riskyPromotion" value={answers.riskyPromotion} options={[["yes", "有使用"], ["no", "没有使用"], ["unsure", "不确定"]]} onChange={(value) => setAnswers({ ...answers, riskyPromotion: value as Answers["riskyPromotion"] })} /></Question>
            <Question index="09" title="近期是否收到投诉" description="包括消费者、外卖平台或市场监管部门的反馈"><Choice name="recentComplaint" value={answers.recentComplaint} options={[["yes", "收到过"], ["no", "没有"]]} onChange={(value) => setAnswers({ ...answers, recentComplaint: value as Answers["recentComplaint"] })} /></Question>
            <Question index="10" title="是否上传菜单或外卖页面进行检查"><Choice name="uploadMenu" value={answers.uploadMenu} options={[["yes", "现在上传，进行 AI 深度检测"], ["no", "暂不上传，先看基础体检"]]} onChange={(value) => setAnswers({ ...answers, uploadMenu: value as Answers["uploadMenu"] })} /></Question>

            {answers.uploadMenu === "yes" && (
              <div className="menu-upload-block">
                <div className="upload-method"><span className="method-tag deep">AI深度检测</span><p>上传内容将调用现有千问视觉识别，免费最多 2 张，浏览器会自动压缩。</p></div>
                <button type="button" className={`dropzone ${dragging ? "dragging" : ""}`} onClick={() => fileInput.current?.click()} onDragOver={(event: DragEvent) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event: DragEvent) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }}>
                  <span className="upload-icon">＋</span><b>{optimizing ? "正在压缩图片…" : "点击上传或拖入图片"}</b><small>菜单截图、美团或饿了么页面</small>
                </button>
                <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(event: ChangeEvent<HTMLInputElement>) => { void addFiles(event.target.files); event.target.value = ""; }} />
                {previews.length > 0 && <div className="preview-strip">{previews.map(({ file, url }, index) => <div className="preview-item" key={`${file.name}-${index}`}><Image src={url} alt={`已上传 ${file.name}`} fill unoptimized sizes="96px" /><button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} aria-label="删除图片">×</button></div>)}</div>}
                <label htmlFor="menu-note">也可以粘贴菜单文字或补充说明</label>
                <textarea id="menu-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：菜单写“蟹肉棒”，实际使用产品包装名称为“蟹味棒”。" rows={4} />
              </div>
            )}

            {error && <p className="analysis-error" role="alert">{error}</p>}
            <button className="submit-check" disabled={loading || optimizing} type="submit">{loading ? <><i /> 正在生成体检报告…</> : <>生成免费体检报告 <span>→</span></>}</button>
            <small className="form-note">检查免费 · 完整改方案按需解锁 · 不会自动扣款</small>
          </form>
        </section>
      )}

      {view === "report" && report && <RestaurantReportView report={report} storeName={answers.storeName} categoryLabel={selectedCategoryProfile?.label || ""} onAgain={() => setView("questionnaire")} />}

      <footer>
        <div className="brand footer-brand"><span className="brand-mark">餐</span><span>餐盾</span></div>
        <p>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
            沪ICP备2026040092号-1
          </a>
        </p>
        <p>体检内容仅作风险识别参考，不构成正式法律意见。</p>
      </footer>
    </main>
  );
}

function Question({ index, title, description, optional, children }: { index: string; title: string; description?: string; optional?: boolean; children: React.ReactNode }) {
  return <fieldset className="question"><legend><b>{index}</b><span><strong>{title}</strong>{description && <small>{description}</small>}</span>{optional && <em>选填</em>}</legend>{children}</fieldset>;
}

function Choice({ name, value, options, onChange }: { name: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return <div className="choice-grid">{options.map(([optionValue, label]) => <label key={optionValue} className={value === optionValue ? "selected" : ""}><input type="radio" name={name} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} /><span>{label}</span></label>)}</div>;
}

function RestaurantReportView({ report, storeName, categoryLabel, onAgain }: { report: RestaurantReport; storeName: string; categoryLabel: string; onAgain: () => void }) {
  const counts = {
    high: report.modules.filter((module) => module.status === "high").length,
    medium: report.modules.filter((module) => module.status === "medium").length,
    pending: report.modules.filter((module) => module.status === "pending").length,
  };
  const previewRisk = report.menuAnalysis?.risks[0];
  const tone = report.score >= 80 ? "safe" : report.score >= 60 ? "medium" : "high";
  return (
    <section className="restaurant-report" id="restaurant-report">
      <div className="report-top">
        <button onClick={onAgain}>← 修改问卷</button><span>免费体检结果</span>
      </div>
      <div className="restaurant-report-hero">
        <div className={`score-ring ${tone}`}><strong>{report.score}</strong><span>综合评分</span></div>
        <div><p>{storeName || "你的门店"}{categoryLabel ? ` · ${categoryLabel}` : ""}</p><h1>餐厅经营风险体检报告</h1><span>这是基于问卷与已上传资料生成的初步结果。模块标签会明确说明检测深度。</span></div>
      </div>
      <div className="report-stats restaurant-stats">
        <div className="report-stat stat-high"><span>高风险</span><strong>{counts.high}</strong><small>建议优先核验</small></div>
        <div className="report-stat stat-medium"><span>中风险</span><strong>{counts.medium}</strong><small>建议近期处理</small></div>
        <div className="report-stat stat-time"><span>待检查</span><strong>{counts.pending}</strong><small>需要补资料</small></div>
        <div className="report-stat stat-low"><span>已检查模块</span><strong>{report.modules.length - counts.pending}</strong><small>共 7 个模块</small></div>
      </div>
      <div className="free-result-note"><span>免费结果</span><p>已展示综合评分、模块状态、问题名称与一个菜单风险示例。完整整改步骤尚未解锁。</p></div>
      <div className="restaurant-report-layout">
        <div>
          <h2 className="report-section-title">七类风险模块</h2>
          <div className="module-result-list">
            {report.modules.map((module) => <article key={module.key} className={`module-result status-${module.status}`}><div><span className={`status-pill ${module.status}`}>{module.statusLabel}</span><span className={`method-tag ${module.method === "AI深度检测" ? "deep" : module.method === "基础问卷检查" ? "basic" : "manual"}`}>{module.method}</span></div><h3>{module.title}</h3><p>{module.issue}</p></article>)}
          </div>

          <h2 className="report-section-title menu-example-title">菜单风险示例</h2>
          {previewRisk ? <article className="risk-card preview-risk-card report-menu-preview"><div className="risk-card-head"><span className={`risk-badge risk-${previewRisk.riskLevel}`}>{previewRisk.riskLevel === "high" ? "★★★★★ 高风险" : previewRisk.riskLevel === "medium" ? "★★★ 中风险" : "★ 低风险"}</span><small>AI深度检测 · 部分案例</small></div><h4>{previewRisk.title}</h4><div className="risk-meta"><span><b>原始表述</b>{previewRisk.originalText}</span><span><b>风险类型</b>{previewRisk.riskCategory}</span></div><div className="risk-detail"><b>风险原因</b><p>{previewRisk.reason}</p></div></article> : <article className="risk-card preview-risk-card report-menu-preview"><h4>{report.menuAnalysis ? "未识别到明显高频风险表达" : "尚未进行菜单深度检测"}</h4><p>{report.menuAnalysis ? "仍建议人工核对实际商品、原料与宣传依据。" : "返回问卷并上传菜单或外卖页面，即可调用现有 AI 深度检测能力。"}</p></article>}
        </div>
        <aside className="report-sidebar">
          <div className="missing-materials"><span className="step-label">尚未上传或核验</span><h3>待补充资料</h3><ul>{report.missingMaterials.map((material) => <li key={material}>{material}</li>)}</ul></div>
          <div className="unlock-report restaurant-unlock"><span className="step-label">完整整改方案</span><h3>¥18.8 解锁</h3><p>免费体检负责发现问题，完整报告负责告诉你怎么改。</p><ul><li>全部问题详情与风险原因</li><li>可能投诉或处罚场景</li><li>法规依据或人工确认提示</li><li>具体整改步骤与优先级</li><li>替换文案与证明材料清单</li></ul><Link href="/pricing#unlock" data-product-id="candun-risk-check-v1" data-payment-provider="reserved-wechat-pay" data-membership-provider="reserved-membership" data-entitlement="full-compliance-report">¥18.8 解锁完整整改方案</Link><small>支付尚未接入，点击进入销售说明页，不会自动扣款</small><button className="again-button" onClick={onAgain}>重新体检</button></div>
        </aside>
      </div>
    </section>
  );
}
