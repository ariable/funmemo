import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "惟觉智能会议助手",
  description: "惟觉智能会议助手，面向中文会议转录、标注与纪要生成。",
  icons: {
    icon: "/w.svg",
    shortcut: "/w.svg",
    apple: "/w.svg",
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
