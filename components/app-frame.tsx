"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { APP_NAME } from "@/lib/constants";
import { joinClasses } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/restaurants", label: "管理饭店" },
  { href: "/history", label: "历史记录" },
  { href: "/settings", label: "设置" },
];

interface AppFrameProps {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppFrame({ title, description, actions, children }: AppFrameProps) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-block">
          <Link href="/" className="brand-mark">
            {APP_NAME}
          </Link>
          <p className="brand-subtitle">本地优先，低摩擦决定今天吃什么。</p>
        </div>
        <nav className="top-nav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={joinClasses("nav-link", pathname === item.href && "nav-link-active")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="page-shell">
        <section className="page-hero">
          <div>
            <p className="eyebrow">Meal Decider</p>
            <h1>{title}</h1>
            <p className="page-description">{description}</p>
          </div>
          {actions ? <div className="page-actions">{actions}</div> : null}
        </section>

        <section className="page-content">{children}</section>
      </main>
    </div>
  );
}
