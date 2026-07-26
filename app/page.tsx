"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";

type ToolKey = "menu" | "complaint" | "regulator" | "copy";
type Risk = {
  level: "高风险" | "中风险" | "建议关注";
  title: string;
  detail: string;
  suggestion: string;
};
type Analysis = {
  score: number;
  summary: string;
  risks: Risk[];
  nextSteps: string[];
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

const mockResults: Record<ToolKey, Analysis> = {
  menu: {
    score: 68,
    summary: "发现 2 处可能引起消费者误解的菜单表述，建议在再次上线前完成修改。",
    risks: [
      {
        level: "高风险",
        title: "“蟹肉棒”可能与实际产品名称不一致",
        detail: "如包装标注为“蟹味棒”或“风味蟹柳”，消费者可能理解为含有真实蟹肉。",
        suggestion: "按照外包装名称改为“蟹味棒”，并保存包装、配料表及进货凭证。",
      },
      {
        level: "中风险",
        title: "菜品原料描述缺少可核验依据",
        detail: "“纯手工”“现熬”等表述需要与门店实际制作流程保持一致。",
        suggestion: "不能持续证明的表述建议删除，改为客观口味或制作方式描述。",
      },
    ],
    nextSteps: ["核对所有原料外包装名称", "同步修改外卖平台与店内菜单", "留存修改前后截图和进货凭证"],
  },
  complaint: {
    score: 57,
    summary: "当前属于消费争议沟通阶段。先核实事实和诉求，不要急于承认欺诈或支付款项。",
    risks: [
      {
        level: "高风险",
        title: "对方援引法律并要求立即赔偿",
        detail: "赔偿主张不等于已经被认定违法，需区分消费者诉求、行政调解与正式处罚。",
        suggestion: "请对方明确事实、金额和依据；所有协商尽量留在书面渠道。",
      },
      {
        level: "建议关注",
        title: "现有证据可能不完整",
        detail: "订单、页面原文、产品包装及双方沟通记录会影响后续判断。",
        suggestion: "暂不删除或改动原记录，先完整截图，再进行页面整改。",
      },
    ],
    nextSteps: ["保存订单和完整聊天记录", "核对商品与宣传事实", "通过平台或监管渠道确认调解范围"],
  },
  regulator: {
    score: 61,
    summary: "先确认这是投诉调解、举报核查还是已立案调查，再按对方要求准备真实材料。",
    risks: [
      {
        level: "高风险",
        title: "尚未确认程序性质",
        detail: "电话沟通、行政调解、询问通知和责令改正的法律意义不同。",
        suggestion: "礼貌询问承办单位、工作人员、事项编号及需要配合的具体内容。",
      },
      {
        level: "中风险",
        title: "口头说明容易出现偏差",
        detail: "未经核实就表态，可能与采购凭证或平台页面不一致。",
        suggestion: "按时间线整理事实，只陈述能由材料证明的内容，并记录已完成的整改。",
      },
    ],
    nextSteps: ["确认承办信息和程序阶段", "整理营业资质、订单、进货与整改材料", "重要沟通后做书面确认"],
  },
  copy: {
    score: 52,
    summary: "文案中存在缺少证明的资历描述和绝对化表达，建议发布前改为客观描述。",
    risks: [
      {
        level: "高风险",
        title: "“老字号”“百年”需要充分依据",
        detail: "这类资历、历史和荣誉表述应有真实、可核验的证明材料。",
        suggestion: "如无证明，改为“闽南传统风味”或直接描述产品特点。",
      },
      {
        level: "高风险",
        title: "“最好吃”属于绝对化表达",
        detail: "无法客观验证的最高级描述容易触发广告宣传风险。",
        suggestion: "改为“招牌推荐”“店内人气口味”等非绝对化表达。",
      },
    ],
    nextSteps: ["删除无依据的历史和荣誉表述", "替换绝对化用语", "发布前保存最终审核版本"],
  },
};

export default function Home() {
  const [active, setActive] = useState<ToolKey | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
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
    window.setTimeout(() => document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((file) => file.type.startsWith("image/")).slice(0, 6);
    setFiles((current) => [...current, ...next].slice(0, 6));
  }

  async function analyze() {
    if (!active || (!files.length && !note.trim())) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: active, note, fileCount: files.length }),
      });
      const data = (await response.json()) as { result?: Analysis };
      setResult(data.result ?? mockResults[active]);
    } catch {
      setResult(mockResults[active]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setActive(null);
    setResult(null);
    setFiles([]);
    setNote("");
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
        <div className="eyebrow"><span>AI</span> 餐饮风险助手</div>
        <h1>开店有风险，<br /><em>餐盾先帮你看一遍。</em></h1>
        <p>上传菜单、投诉记录或宣传文案，快速发现风险，获得下一步可执行建议。</p>
        <div className="trust-row">
          <span>不替代律师意见</span>
          <span>不自动保存原图</span>
          <span>结果附整改步骤</span>
        </div>
      </section>

      <section className="tool-section">
        <div className="section-heading">
          <div>
            <p>从你现在遇到的问题开始</p>
            <h2>今天需要处理什么？</h2>
          </div>
          <span>选择一个入口</span>
        </div>
        <div className="tool-grid">
          {tools.map((tool) => (
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
                  {loading ? <><i /> 正在整理风险点…</> : <>开始分析 <span>→</span></>}
                </button>
                <p className="privacy-note">请先遮盖身份证号、手机号等不必要的个人信息。</p>
              </div>
            </div>
          ) : (
            <ResultView result={result} title={selectedTool.title} onAgain={() => setResult(null)} />
          )}
        </section>
      )}

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
  return (
    <div className="result-view">
      <div className="result-hero">
        <div className={`score-ring ${tone}`}>
          <strong>{result.score}</strong><span>风险评分</span>
        </div>
        <div>
          <span className="step-label">分析完成 / {title}</span>
          <h2>{result.score >= 80 ? "整体风险较低" : result.score >= 60 ? "有几处需要尽快调整" : "建议先处理高风险项"}</h2>
          <p>{result.summary}</p>
        </div>
      </div>
      <div className="result-columns">
        <div>
          <h3 className="result-title">发现的风险 <span>{result.risks.length}</span></h3>
          <div className="risk-list">
            {result.risks.map((risk, index) => (
              <article className="risk-card" key={risk.title}>
                <div className="risk-card-head">
                  <span className={`risk-badge risk-${risk.level}`}>{risk.level}</span>
                  <small>问题 {String(index + 1).padStart(2, "0")}</small>
                </div>
                <h4>{risk.title}</h4>
                <p>{risk.detail}</p>
                <div className="suggestion"><b>建议处理</b><span>{risk.suggestion}</span></div>
              </article>
            ))}
          </div>
        </div>
        <aside className="next-steps">
          <span className="step-label">行动清单</span>
          <h3>接下来这样做</h3>
          {result.nextSteps.map((step, index) => (
            <label key={step}><input type="checkbox" /><span><b>{index + 1}</b>{step}</span></label>
          ))}
          <button onClick={() => window.print()}>保存 / 打印报告</button>
          <button className="again-button" onClick={onAgain}>重新分析</button>
        </aside>
      </div>
    </div>
  );
}
