import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FunMemo",
  description: "中文会议转录与纪要工作台",
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
