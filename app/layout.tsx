import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "餐盾｜餐饮老板的 AI 风险助手",
  description: "上传菜单、投诉记录或宣传文案，快速发现风险并获得可执行的整改建议。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
