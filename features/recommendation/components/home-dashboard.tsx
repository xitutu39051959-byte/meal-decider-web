"use client";

import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { useAppData } from "@/components/providers/app-data-provider";
import {
  DINING_MODE_LABELS,
  MEAL_TYPE_LABELS,
  PRICE_LEVEL_LABELS,
  SESSION_SOURCE_LABELS,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const ENTRY_POINTS = [
  { href: "/recommend?intent=lunch", label: "决定午饭", tone: "warm" },
  { href: "/recommend?intent=dinner", label: "决定晚饭", tone: "accent" },
  { href: "/recommend?intent=random", label: "纯随机来一个", tone: "neutral" },
  { href: "/restaurants", label: "管理饭店", tone: "soft" },
  { href: "/history", label: "历史记录", tone: "soft" },
  { href: "/settings", label: "设置", tone: "soft" },
] as const;

export function HomeDashboard() {
  const { isReady, restaurants, records, preferences, session } = useAppData();
  const activeRestaurantCount = restaurants.filter((restaurant) => restaurant.isActive).length;
  const activeSession = session && !session.isCompleted ? session : null;

  return (
    <AppFrame
      title="吃饭决策系统"
      description="一次只给一个建议。你只需要点按钮，不需要来回比较清单。"
      actions={
        activeSession ? (
          <Link href="/recommend" className="button button-secondary">
            恢复当前这一轮
          </Link>
        ) : null
      }
    >
      <div className="dashboard-grid">
        <section className="feature-card hero-card">
          <p className="eyebrow">高频入口</p>
          <div className="entry-grid">
            {ENTRY_POINTS.map((entry) => (
              <Link key={entry.href} href={entry.href} className={`entry-link tone-${entry.tone}`}>
                <span>{entry.label}</span>
                <small>直接进入</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="feature-card">
          <p className="eyebrow">当前数据</p>
          <div className="stats-grid">
            <div className="stat-card">
              <strong>{activeRestaurantCount}</strong>
              <span>启用饭店</span>
            </div>
            <div className="stat-card">
              <strong>{restaurants.length}</strong>
              <span>总饭店数</span>
            </div>
            <div className="stat-card">
              <strong>{records.length}</strong>
              <span>历史记录</span>
            </div>
          </div>
          {!isReady ? <p className="muted-copy">正在读取本地数据...</p> : null}
        </section>

        <section className="feature-card">
          <p className="eyebrow">默认偏好</p>
          <div className="chip-row wrap-row">
            <span className="chip">{MEAL_TYPE_LABELS[preferences.defaultMealType]}</span>
            <span className="chip">{PRICE_LEVEL_LABELS[preferences.defaultBudget]}</span>
            <span className="chip">{DINING_MODE_LABELS[preferences.defaultMode]}</span>
            <span className="chip">同店冷却 {preferences.cooldownDaysRestaurant} 天</span>
            <span className="chip">同类冷却 {preferences.cooldownDaysCategory} 天</span>
          </div>
        </section>

        <section className="feature-card">
          <p className="eyebrow">本轮状态</p>
          {activeSession ? (
            <div className="session-summary">
              <h2>{SESSION_SOURCE_LABELS[activeSession.source]}</h2>
              <p className="card-copy">
                已推荐 {activeSession.alreadyRecommendedIds.length} 家，开始于{" "}
                {formatDateTime(activeSession.startedAt)}。
              </p>
            </div>
          ) : (
            <div className="session-summary">
              <h2>当前没有进行中的 session</h2>
              <p className="card-copy">从上面的任一入口开始，系统会自动记住本轮上下文。</p>
            </div>
          )}
        </section>
      </div>
    </AppFrame>
  );
}
