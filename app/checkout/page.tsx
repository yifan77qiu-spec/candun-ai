import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { riskCheckProduct } from "@/lib/commerce";
import styles from "./checkout.module.css";

export const metadata: Metadata = {
  title: "付款解锁完整整改报告｜餐盾",
  description: "支付体验价后，由餐盾人工核验并交付完整餐饮风险整改报告。",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store } = await searchParams;
  const storeName = store?.trim() || "未填写门店";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/"><span>餐</span><b>餐盾</b></Link>
        <Link href="/pricing">查看服务说明</Link>
      </header>

      <section className={styles.checkout}>
        <div className={styles.summary}>
          <p className={styles.eyebrow}>完整整改报告 · 人工核验交付</p>
          <h1>扫码支付 <em>¥{riskCheckProduct.experiencePrice}</em></h1>
          <p className={styles.lead}>付款成功后，请保留付款截图。我们核验后为你交付完整餐饮风险整改报告。</p>

          <div className={styles.orderCard}>
            <span>本次门店</span>
            <strong>{storeName}</strong>
            <small>付款备注建议填写：{storeName} + 联系手机号</small>
          </div>

          <ol className={styles.steps}>
            <li><b>01</b><span><strong>扫描右侧收款码</strong>支持微信、支付宝、云闪付等方式</span></li>
            <li><b>02</b><span><strong>支付 ¥{riskCheckProduct.experiencePrice}</strong>备注门店名称与联系手机号</span></li>
            <li><b>03</b><span><strong>发送付款截图</strong>回到与餐盾沟通的原渠道，发送截图和门店名称</span></li>
          </ol>
        </div>

        <aside className={styles.payCard}>
          <div className={styles.price}><small>应付</small><span>¥</span><strong>{riskCheckProduct.experiencePrice}</strong></div>
          <div className={styles.qrWrap}>
            <Image src="/payment/candun-merchant-qr.png" alt="餐盾完整整改报告付款收款码" width={1002} height={1392} priority unoptimized />
          </div>
          <p>请使用微信或支付宝扫码付款</p>
          <small>收款方：上海餐帮品牌营销<br />付款后请回到原沟通渠道发送付款凭证</small>
          <Link className={styles.backButton} href="/">返回免费体检结果</Link>
        </aside>
      </section>

      <footer className={styles.footer}>
        <span>当前为人工核验交付，不会自动续费或自动扣款。</span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">沪ICP备2026040092号-1</a>
      </footer>
    </main>
  );
}
