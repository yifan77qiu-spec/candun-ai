import type { Metadata } from "next";
import Link from "next/link";
import { riskCheckProduct } from "@/lib/commerce";
import styles from "./pricing.module.css";

export const metadata: Metadata = {
  title: "餐盾｜餐厅经营风险体检",
  description: "帮助餐饮老板免费发现菜单宣传、外卖页面、劳动用工、食品安全、资质与门店安全风险。",
};

const fullReportItems = [
  "全部风险项与风险等级",
  "可能遇到的投诉场景",
  "相关法规依据",
  "逐项整改建议",
  "可直接使用的替换文案",
  "建议准备的证明材料",
];

const riskWords = ["最好吃", "第一", "0添加", "百年老字号", "纯手工", "祖传秘方"];

export default function PricingPage() {
  const progress = Math.min(100, Math.round((riskCheckProduct.sold / riskCheckProduct.quota) * 100));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="返回餐盾首页">
          <span>餐</span>
          <b>餐盾</b>
        </Link>
        <Link className={styles.headerLink} href={riskCheckProduct.detectionHref}>免费体检</Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>经营风险体检免费 · 完整改方案按次解锁</p>
          <h1>免费发现风险，<br /><em>再决定是否整改。</em></h1>
          <p className={styles.subtitle}>
            免费完成 1 次餐厅经营风险体检，查看综合评分、模块状态和部分风险案例。<br />
            发现问题后，18.8 元获取完整整改方案。
          </p>
          <Link className={styles.primaryButton} href={riskCheckProduct.detectionHref}>
            立即免费体检 <span>→</span>
          </Link>
          <small>无需注册 · 首次免费体验 · 约3分钟出结果</small>
        </div>

        <aside className={styles.priceCard} id="unlock">
          <div className={styles.cardHead}>
            <span>完整报告解锁价</span>
            <i>限前100家</i>
          </div>
          <div className={styles.price}>
            <sup>¥</sup><strong>18.8</strong>
            <del>原价 ¥99/次</del>
          </div>
          <p>先免费发现风险。确认有需要后，再解锁全部风险详情与可执行整改方案。</p>
          <ul>
            {fullReportItems.map((item) => <li key={item}>✓ <span>{item}</span></li>)}
          </ul>
          <Link
            className={styles.buyButton}
            href={riskCheckProduct.detectionHref}
            data-product-id={riskCheckProduct.id}
            data-payment-provider={riskCheckProduct.paymentProvider}
            data-membership-provider={riskCheckProduct.membershipProvider}
            data-entitlement={riskCheckProduct.entitlements.paid}
          >
            先免费检测
          </Link>
          <small className={styles.unlockNote}>检测完成后，可选择 ¥18.8 解锁完整报告</small>
          <div className={styles.progressText}>
            <span>首批体验用户</span>
            <b>{riskCheckProduct.sold}/{riskCheckProduct.quota}</b>
          </div>
          <div className={styles.progressBar} aria-label={`首批体验用户 ${riskCheckProduct.sold}/${riskCheckProduct.quota}`}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </aside>
      </section>

      <section className={styles.access}>
        <div className={styles.sectionHead}>
          <p>先体验，再付费</p>
          <h2>免费知道有没有问题，<br />付费拿到怎么解决。</h2>
        </div>
        <div className={styles.accessGrid}>
          <article>
            <span>免费体验</span>
            <h3>1 次餐厅经营风险体检</h3>
            <ul>
              <li>风险评分</li>
              <li>七类经营风险模块状态</li>
              <li>问题名称与一个菜单风险示例</li>
            </ul>
            <Link href={riskCheckProduct.detectionHref}>立即免费体检 →</Link>
          </article>
          <article className={styles.paidAccess}>
            <span>¥18.8 解锁</span>
            <h3>完整餐盾整改方案</h3>
            <ul>
              <li>全部问题详情、原因与可能场景</li>
              <li>法规依据、具体步骤和替换文案</li>
              <li>整改优先级与证明材料清单</li>
            </ul>
            <Link href={riskCheckProduct.detectionHref}>先免费发现风险 →</Link>
          </article>
        </div>
      </section>

      <section className={styles.why}>
        <div className={styles.sectionHead}>
          <p>为什么餐饮老板需要？</p>
          <h2>很多风险藏在<br />老板平时注意不到的地方。</h2>
          <span>菜单表达只是其中一类。用工、证照、食品安全和门店安全也需要定期检查；基础问卷不替代专业审核。</span>
        </div>
        <div className={styles.wordGrid}>
          {riskWords.map((word, index) => (
            <article key={word}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <h3>“{word}”</h3>
              <p>可能涉及宣传依据或证明材料，建议在上线前先行核验。</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.process}>
        <p>从发现问题到完成整改</p>
        <h2>先看风险，再决定要不要解锁方案。</h2>
        <div>
          <article><b>01</b><h3>免费问卷</h3><span>按门店实际经营情况完成基础体检</span></article>
          <article><b>02</b><h3>查看概览</h3><span>免费查看综合评分、模块状态与问题名称</span></article>
          <article><b>03</b><h3>解锁整改</h3><span>需要时支付 18.8 元，获得完整整改报告</span></article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p>首次经营风险体检免费</p>
          <h2>免费发现风险，18.8 元获取完整整改方案。</h2>
          <span>先发现自己的餐厅哪里需要关注，再决定要不要解锁完整整改方案。</span>
        </div>
        <Link
          href={riskCheckProduct.detectionHref}
          data-product-id={riskCheckProduct.id}
          data-payment-provider={riskCheckProduct.paymentProvider}
          data-membership-provider={riskCheckProduct.membershipProvider}
          data-entitlement={riskCheckProduct.entitlements.free}
        >
          立即免费体检 <b>→</b>
        </Link>
      </section>

      <footer className={styles.footer}>
        <span>餐盾｜餐厅经营风险体检平台</span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
          沪ICP备2026040092号-1
        </a>
        <p>检测内容仅作风险识别参考，不构成正式法律意见。</p>
      </footer>
    </main>
  );
}
