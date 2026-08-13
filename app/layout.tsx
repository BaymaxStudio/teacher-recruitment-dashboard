import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "广东民办中学 2027 秋招决策台",
  description: "广州、顺德、深圳及广东湾区民办中学教师招聘检索、筛选与比较。",
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
