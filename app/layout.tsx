import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Noto_Sans_SC } from "next/font/google";

import { AppDataProvider } from "@/components/providers/app-data-provider";

import "./globals.css";

const bodyFont = Noto_Sans_SC({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Meal Decider Web",
    template: "%s | Meal Decider Web",
  },
  description: "一个本地优先的吃饭决策系统，帮助你在饭点快速决定吃什么。",
  applicationName: "Meal Decider Web",
  keywords: ["meal decider", "吃饭决策", "Next.js", "IndexedDB"],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Meal Decider Web",
    description: "一个本地优先的吃饭决策系统，帮助你在饭点快速决定吃什么。",
    url: appUrl,
    siteName: "Meal Decider Web",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Meal Decider Web",
    description: "一个本地优先的吃饭决策系统，帮助你在饭点快速决定吃什么。",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${bodyFont.variable} ${monoFont.variable}`}>
      <body>
        <AppDataProvider>{children}</AppDataProvider>
      </body>
    </html>
  );
}
