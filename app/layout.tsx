import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://guangdong-teacher-jobs-2027.baymax1001.chatgpt.site"),
  title: "十四城中学教师招聘决策台",
  description: "广东、浙江、江苏十四城民办初高中与重点公办高中教师招聘检索、筛选和证据追踪。",
  openGraph: {
    title: "十四城中学教师招聘决策台",
    description: "广东、浙江、江苏十四城民办初高中与重点公办高中教师招聘证据台。",
    type: "website",
    locale: "zh_CN",
    images: [{ url: "/social-preview.png", width: 1536, height: 1024, alt: "十四城中学教师招聘决策台界面预览" }],
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
