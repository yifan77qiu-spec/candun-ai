import type { Metadata } from "next";
import Link from "next/link";
import { riskCheckProduct } from "@/lib/commerce";
import styles from "./pricing.module.css";

export const metadata: Metadata = {
  title: "餐盾AI｜餐饮风险体检",
  description: "帮助餐饮老板提前发现菜单、外卖文案和宣传内容中的潜在投诉风险。",
};

const deliverables = [
  "菜单风险扫描",
  "外卖商品描述检测",
  "宣传词风险检测",
  "高风险表达提醒",
  "整改建议生成",
  "替换文案推荐",
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
        <Link className={styles.headerLink} href={riskCheckProduct.checkoutHref}>立即检测</Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>餐盾AI · 餐饮风险体检</p>
          <h1>你的菜单，<br /><em>可能藏着投诉风险。</em></h1>
          <p className={styles.subtitle}>
            上传菜单，AI帮你提前发现高风险表达，<br />
            避免因为一句宣传语造成不必要损失。
          </p>
          <Link className={styles.primaryButton} href={riskCheckProduct.checkoutHref}>
            立即检测 <span>→</span>
          </Link>
          <small>无需注册 · 上传后约3分钟生成报告</small>
        </div>

        <aside className={styles.priceCard}>
          <div className={styles.cardHead}>
            <span>首批体验价</span>
            <i>限前100家</i>
          </div>
          <div className={styles.price}>
            <sup>¥</sup><strong>18.8</strong>
            <del>原价 ¥99/次</del>
          </div>
          <p>一次检测，获得一份可以直接整改的餐饮风险合规报告。</p>
          <ul>
            {deliverables.map((item) => <li key={item}>✓ <span>{item}</span></li>)}
          </ul>
          <Link
            className={styles.buyButton}
            href={riskCheckProduct.checkoutHref}
            data-product-id={riskCheckProduct.id}
            data-payment-provider={riskCheckProduct.paymentProvider}
          >
            立即体验 ¥18.8
          </Link>
          <div className={styles.progressText}>
            <span>首批体验用户</span>
            <b>{riskCheckProduct.sold}/{riskCheckProduct.quota}</b>
          </div>
          <div className={styles.progressBar} aria-label={`首批体验用户 ${riskCheckProduct.sold}/${riskCheckProduct.quota}`}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </aside>
      </section>

      <section className={styles.why}>
        <div className={styles.sectionHead}>
          <p>为什么餐饮老板需要？</p>
          <h2>很多风险不在后厨，<br />而藏在菜单的一句话里。</h2>
          <span>这些常见表达并不代表一定存在问题，但可能带来真实性、资质或宣传依据方面的核验风险。</span>
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
        <h2>不是泛泛提醒，而是给你下一步。</h2>
        <div>
          <article><b>01</b><h3>上传内容</h3><span>菜单截图、外卖商品描述或宣传文案</span></article>
          <article><b>02</b><h3>识别风险</h3><span>标出风险等级、可能场景与核验依据</span></article>
          <article><b>03</b><h3>直接整改</h3><span>获得修改建议与可复制的替换文案</span></article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p>首批体验名额 0/100</p>
          <h2>先检查，再上线。</h2>
          <span>花几分钟检查菜单，少留一个可能被投诉的表达。</span>
        </div>
        <Link
          href={riskCheckProduct.checkoutHref}
          data-product-id={riskCheckProduct.id}
          data-payment-provider={riskCheckProduct.paymentProvider}
        >
          立即体验 ¥18.8 <b>→</b>
        </Link>
      </section>

      <footer className={styles.footer}>
        <span>餐盾AI｜餐饮风险体检</span>
        <p>检测内容仅作风险识别参考，不构成正式法律意见。</p>
      </footer>
    </main>
  );
}

