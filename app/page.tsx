"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";

type ToolKey = "menu" | "complaint" | "regulator" | "copy";
type Risk = {
  level: "high" | "medium" | "low";
  item: string;
  reason: string;
  suggestion: string;
  legalReference: string;
};
type Analysis = {
  score: number;
  summary: string;
  risks: Risk[];
};

const tools: {
  key: ToolKey;
  index: string;
  title: string;
  description: string;
  action: string;
  accept: string;
}[] = [
  {
    key: "menu",
    index: "01",
    title: "菜单体检",
    description: "检查菜名、原料描述、图片与规格，提前发现容易被投诉的表述。",
    action: "上传菜单",
    accept: "菜单截图、美团或饿了么页面",
  },
  {
    key: "complaint",
    index: "02",
    title: "我被投诉了",
    description: "看懂对方的主张，整理证据，并生成稳妥的沟通建议。",
    action: "上传投诉记录",
    accept: "聊天截图、投诉内容或平台通知",
  },
  {
    key: "regulator",
    index: "03",
    title: "市场监管联系我了",
    description: "快速梳理情况、应备材料和沟通要点，避免慌乱回应。",
    action: "上传通知",
    accept: "通知截图、短信或通话记录摘要",
  },
  {
    key: "copy",
    index: "04",
    title: "宣传文案检测",
    description: "识别极限词、功效承诺与缺少依据的宣传，给出安全改写。",
    action: "粘贴或上传文案",
    accept: "海报、朋友圈、小红书或短视频文案",
  },
];

const exampleByTool: Record<ToolKey, string> = {
  menu: "例如：菜单写“蟹肉棒”，实际使用产品包装名称为“蟹味棒”。",
  complaint: "请补充订单金额、对方诉求，以及目前是否已由平台或监管介入。",
  regulator: "请写下对方单位、联系时间、要求提供的材料和是否收到正式文书。",
  copy: "例如：泉州百年老字号，0 添加、全上海最好吃的面线糊。",
};

export default function Home() {
  const [active, setActive] = useState<ToolKey | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const selectedTool = tools.find((tool) => tool.key === active);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  function openTool(key: ToolKey) {
    setActive(key);
    setFiles([]);
    setNote("");
    setResult(null);
    setError("");
    window.setTimeout(() => document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError("");
    const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
    const incoming = Array.from(list);
    const invalid = incoming.find((file) => !allowed.has(file.type));
    const oversized = incoming.find((file) => file.size > 8 * 1024 * 1024);
    if (invalid) {
      setError("仅支持 JPG、PNG、WebP 格式的菜单图片。");
      return;
    }
    if (oversized) {
      setError(`图片“${oversized.name}”超过 8MB，请压缩后再上传。`);
      return;
    }
    const next = incoming.slice(0, 6);
    setFiles((current) => [...current, ...next].slice(0, 6));
  }

  async function analyze() {
    if (!active || (!files.length && !note.trim())) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const form = new FormData();
      form.append("type", active);
      form.append("note", note);
      files.forEach((file) => form.append("images", file));
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { result?: Analysis; error?: string };
      if (!response.ok || !data.result) {
        throw new Error(data.error || "检测失败，请稍后重试。");
      }
      setResult(data.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "网络连接失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setActive(null);
    setResult(null);
    setFiles([]);
    setNote("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#" onClick={reset} aria-label="餐盾首页">
          <span className="brand-mark">餐</span>
          <span>餐盾</span>
        </a>
        <div className="header-status"><span /> 当前为体验版</div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span>免费</span> 餐饮菜单风险体检</div>
          <h1>约3分钟，检查你的菜单<br /><em>是否存在投诉与处罚风险</em></h1>
          <p>上传菜单，我们会检查命名、宣传用语、商品描述等内容，并给出可直接使用的整改建议和法规依据。</p>
          <button className="hero-cta" onClick={() => openTool("menu")}>免费检测菜单 <b>→</b></button>
          <small className="hero-note">无需注册 · 首次免费体验</small>
        </div>
        <div className="hero-report report-placeholder" aria-label="菜单检测报告内容预览">
          <div className="preview-head"><b>你的菜单检测报告</b><span>检测后生成</span></div>
          <p className="placeholder-intro">上传菜单并完成检测后，这里将展示基于实际内容生成的风险报告。</p>
          <div className="placeholder-list">
            <div><b>01</b><span><strong>风险评分</strong><small>根据本次菜单内容综合呈现</small></span><em>待检测</em></div>
            <div><b>02</b><span><strong>高风险项目</strong><small>标出需要优先处理的具体位置</small></span><em>待检测</em></div>
            <div><b>03</b><span><strong>修改建议</strong><small>提供可以直接使用的整改文案</small></span><em>待检测</em></div>
            <div><b>04</b><span><strong>法规依据</strong><small>说明建议所对应的规范依据</small></span><em>待检测</em></div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div><b>法</b><span><strong>引用真实法规</strong>不是AI猜测，每条建议均对应法规依据</span></div>
        <div><b>诉</b><span><strong>聚焦真实风险</strong>覆盖餐饮商家高频投诉与处罚场景</span></div>
        <div><b>改</b><span><strong>可直接整改</strong>不仅指出问题，还提供建议文案</span></div>
      </section>

      <section className="why-section">
        <div className="content-heading">
          <p>菜单表达也需要合规</p>
          <h2>为什么现在就应该检查菜单？</h2>
          <span>很多处罚不是因为食品安全，而是因为菜单表达。</span>
        </div>
        <div className="example-grid">
          <article>
            <span>商品名称</span>
            <div className="example-flow"><b>蟹肉棒</b><i>→</i><strong>商品名称争议</strong></div>
            <p>建议改为：蟹味棒</p>
          </article>
          <article>
            <span>制作描述</span>
            <div className="example-flow"><b>纯手工</b><i>→</i><strong>缺乏依据</strong></div>
            <p>删除或保留证明材料</p>
          </article>
          <article>
            <span>宣传用语</span>
            <div className="example-flow"><b>最好吃</b><i>→</i><strong>绝对化宣传</strong></div>
            <p>修改描述</p>
          </article>
        </div>
      </section>

      <section className="tool-section">
        <div className="section-heading">
          <div>
            <p>最适合第一次体验</p>
            <h2>先把整份菜单检查一遍</h2>
          </div>
          <span>优先入口</span>
        </div>
        <button className="menu-feature" onClick={() => openTool("menu")}>
          <div className="menu-feature-index">01</div>
          <div>
            <span>免费菜单体检</span>
            <h3>把容易引发投诉的菜名和宣传，提前找出来</h3>
            <p>支持上传菜单截图或粘贴文字。检查命名、原料描述、宣传用语和规格信息，生成一份可以直接照着改的报告。</p>
            <ul><li>标出具体问题</li><li>展示法规依据</li><li>一键复制整改文案</li></ul>
          </div>
          <strong>免费检测菜单 →</strong>
        </button>
        <small className="menu-feature-note">无需注册 · 首次免费体验</small>
        <div className="secondary-heading">
          <div><p>遇到具体问题时</p><h2>其他风险处理工具</h2></div>
          <span>先解决最急的事，再补上风险漏洞</span>
        </div>
        <div className="tool-grid secondary-tools">
          {tools.filter((tool) => tool.key !== "menu").map((tool) => (
            <button className={`tool-card tool-${tool.key}`} key={tool.key} onClick={() => openTool(tool.key)}>
              <div className="tool-top">
                <span className="tool-index">{tool.index}</span>
                <span className="tool-arrow">↗</span>
              </div>
              <div>
                <h3>{tool.title}</h3>
                <p>{tool.description}</p>
              </div>
              <span className="tool-action">{tool.action} <b>→</b></span>
            </button>
          ))}
        </div>
      </section>

      {selectedTool && (
        <section className="workspace" id="workspace">
          <div className="workspace-head">
            <button onClick={reset} className="back-button">← 返回</button>
            <span>餐盾分析工作台</span>
          </div>

          {!result ? (
            <div className="workspace-grid">
              <div className="workspace-copy">
                <span className="step-label">当前任务 / {selectedTool.index}</span>
                <h2>{selectedTool.title}</h2>
                <p>{selectedTool.description}</p>
                <ol>
                  <li><b>上传材料</b><span>截图最多 6 张，按发生顺序上传更准确</span></li>
                  <li><b>补充情况</b><span>写清事实、金额、时间与当前进展</span></li>
                  <li><b>查看建议</b><span>先核实风险，再按步骤处理</span></li>
                </ol>
              </div>
              <div className="upload-panel">
                <label>上传截图 <span>可选</span></label>
                <button
                  className={`dropzone ${dragging ? "dragging" : ""}`}
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(event: DragEvent) => { event.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event: DragEvent) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
                >
                  <span className="upload-icon">＋</span>
                  <b>点击上传或拖入图片</b>
                  <small>{selectedTool.accept}</small>
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  hidden
                  onChange={(event: ChangeEvent<HTMLInputElement>) => addFiles(event.target.files)}
                />
                {previews.length > 0 && (
                  <div className="preview-strip">
                    {previews.map(({ file, url }, index) => (
                      <div className="preview-item" key={`${file.name}-${index}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`已上传 ${file.name}`} />
                        <button onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} aria-label="删除图片">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <label htmlFor="note">补充说明 <span>建议填写</span></label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={exampleByTool[selectedTool.key]}
                  rows={5}
                />
                <button className="analyze-button" disabled={loading || (!files.length && !note.trim())} onClick={analyze}>
                  {loading ? <><i /> 正在整理风险点…</> : <>{active === "menu" ? "免费检测菜单" : "开始分析"} <span>→</span></>}
                </button>
                {error && <p className="analysis-error" role="alert">{error}</p>}
                {active === "menu" && <p className="cta-note">无需注册 · 首次免费体验</p>}
                <p className="privacy-note">请先遮盖身份证号、手机号等不必要的个人信息。</p>
              </div>
            </div>
          ) : (
            <ResultView result={result} title={selectedTool.title} onAgain={() => setResult(null)} />
          )}
        </section>
      )}

      <section className="deliverables">
        <div className="content-heading">
          <p>一份可以直接行动的报告</p>
          <h2>检测完成后，你将获得</h2>
        </div>
        <div className="deliverable-grid">
          <article><b>01</b><h3>风险评分</h3><p>快速了解当前菜单的整体风险情况。</p></article>
          <article><b>02</b><h3>高风险位置</h3><p>准确定位需要优先处理的菜名和描述。</p></article>
          <article><b>03</b><h3>法规依据</h3><p>查看每项判断所对应的规范依据。</p></article>
          <article><b>04</b><h3>整改建议</h3><p>获得可复制、可直接使用的建议文案。</p></article>
        </div>
        <button className="section-cta" onClick={() => openTool("menu")}>免费检测菜单 <b>→</b></button>
        <small className="section-cta-note">无需注册 · 首次免费体验</small>
      </section>

      <section className="promise">
        <p>餐盾的方法</p>
        <h2>不制造恐慌，只把风险和下一步说清楚。</h2>
        <div className="promise-grid">
          <div><b>01</b><h3>先看事实</h3><p>区分正常客诉、调解与正式调查，不轻易下结论。</p></div>
          <div><b>02</b><h3>再看证据</h3><p>告诉你该保留什么、该核对什么，减少沟通偏差。</p></div>
          <div><b>03</b><h3>最后行动</h3><p>给出可执行的整改清单和沟通要点，而不是泛泛而谈。</p></div>
        </div>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark">餐</span><span>餐盾</span></div>
        <p>餐饮老板的 AI 风险助手</p>
        <p>体验版内容仅作风险识别参考，不构成正式法律意见。</p>
      </footer>
    </main>
  );
}

function ResultView({ result, title, onAgain }: { result: Analysis; title: string; onAgain: () => void }) {
  const tone = result.score >= 80 ? "safe" : result.score >= 60 ? "medium" : "high";
  const [copied, setCopied] = useState<number | "all" | null>(null);
  const levelLabel = { high: "高风险", medium: "中风险", low: "低风险" } as const;
  const counts = {
    high: result.risks.filter((risk) => risk.level === "high").length,
    medium: result.risks.filter((risk) => risk.level === "medium").length,
    low: result.risks.filter((risk) => risk.level === "low").length,
  };
  const estimatedMinutes = Math.max(4, result.risks.length * 3);

  async function copySuggestion(text: string, key: number | "all") {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  }

  const allSuggestions = result.risks
    .map((risk, index) => `${index + 1}. ${risk.item}\n整改建议：${risk.suggestion}`)
    .join("\n\n");
  const nextSteps = result.risks.length
    ? result.risks.map((risk) => risk.suggestion)
    : ["保存本次检测报告", "上线前再次核对菜单与实际原料", "新增菜品后重新检测"];

  return (
    <div className="result-view">
      <div className="result-hero">
        <div className={`score-ring ${tone}`}>
          <strong>{result.score}</strong><span>风险评分</span>
        </div>
        <div>
          <span className="step-label">分析完成 / {title}</span>
          <h2>《餐盾风险体检报告》</h2>
          <p>{result.summary}</p>
        </div>
      </div>
      <div className="report-stats">
        <div className="report-stat stat-high"><span>高风险</span><strong>{counts.high}</strong><small>建议立即处理</small></div>
        <div className="report-stat stat-medium"><span>中风险</span><strong>{counts.medium}</strong><small>建议本周处理</small></div>
        <div className="report-stat stat-low"><span>低风险</span><strong>{counts.low}</strong><small>建议顺手优化</small></div>
        <div className="report-stat stat-time"><span>预计整改时间</span><strong>{estimatedMinutes} 分钟</strong><small>按建议逐项修改</small></div>
      </div>
      <div className="result-columns">
        <div>
          <h3 className="result-title">具体问题与整改建议 <span>{result.risks.length}</span></h3>
          <div className="risk-list">
            {result.risks.map((risk, index) => (
              <article className="risk-card" key={`${risk.item}-${index}`}>
                <div className="risk-card-head">
                  <span className={`risk-badge risk-${risk.level}`}>{levelLabel[risk.level]}</span>
                  <small>问题 {String(index + 1).padStart(2, "0")}</small>
                </div>
                <h4>{risk.item}</h4>
                <p>{risk.reason}</p>
                <div className="legal-basis"><b>法规 / 判断依据</b><span>{risk.legalReference}</span></div>
                <div className="suggestion">
                  <div><b>建议处理</b><span>{risk.suggestion}</span></div>
                  <button onClick={() => copySuggestion(risk.suggestion, index)}>{copied === index ? "✓ 已复制" : "复制整改文案"}</button>
                </div>
              </article>
            ))}
          </div>
        </div>
        <aside className="next-steps">
          <span className="step-label">行动清单</span>
          <h3>接下来这样做</h3>
          {nextSteps.map((step, index) => (
            <label key={step}><input type="checkbox" /><span><b>{index + 1}</b>{step}</span></label>
          ))}
          <button className="copy-all-button" onClick={() => copySuggestion(allSuggestions, "all")}>{copied === "all" ? "✓ 已复制全部整改文案" : "一键复制全部整改文案"}</button>
          <button onClick={() => window.print()}>保存 / 打印报告</button>
          <button className="again-button" onClick={onAgain}>重新分析</button>
        </aside>
      </div>
    </div>
  );
}
