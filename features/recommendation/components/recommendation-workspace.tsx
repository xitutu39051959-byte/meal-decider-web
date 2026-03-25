"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AppFrame } from "@/components/app-frame";
import { useAppData } from "@/components/providers/app-data-provider";
import {
  DINING_MODE_LABELS,
  FEEDBACK_REASON_LABELS,
  MEAL_TYPE_LABELS,
  PRICE_LEVEL_LABELS,
  SESSION_SOURCE_LABELS,
} from "@/lib/constants";
import { buildFilterSummary, buildRecommendationExplanation } from "@/lib/recommendation/engine";
import { formatDateTime } from "@/lib/utils";
import type { SessionSeed, UserPreference } from "@/types";

type RecommendIntent = "lunch" | "dinner" | "random" | null;

interface RecommendationWorkspaceProps {
  intent: RecommendIntent;
}

function resolveSeed(intent: Exclude<RecommendIntent, null>, preferences: UserPreference): SessionSeed {
  if (intent === "lunch") {
    return {
      source: "home-lunch",
      mealType: "lunch",
      budget: preferences.defaultBudget,
      mode: preferences.defaultMode,
    };
  }

  if (intent === "dinner") {
    return {
      source: "home-dinner",
      mealType: "dinner",
      budget: preferences.defaultBudget,
      mode: preferences.defaultMode,
    };
  }

  return {
    source: "home-random",
    mealType: preferences.defaultMealType,
    budget: "high",
    mode: "any",
  };
}

export function RecommendationWorkspace({ intent }: RecommendationWorkspaceProps) {
  const {
    isReady,
    restaurants,
    records,
    preferences,
    session,
    startSession,
    cycleRecommendation,
    acceptRecommendation,
    resetSession,
  } = useAppData();
  const [busyReason, setBusyReason] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!isReady || initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    if (!intent) {
      return;
    }

    const seed = resolveSeed(intent, preferences);
    setBusyReason("正在开始新一轮...");
    void startSession(seed).finally(() => {
      router.replace("/recommend");
      setBusyReason(null);
    });
  }, [intent, isReady, preferences, router, startSession]);

  const currentRestaurant = session?.currentRestaurantId
    ? restaurants.find((restaurant) => restaurant.id === session.currentRestaurantId) ?? null
    : null;
  const explanation =
    session && currentRestaurant
      ? buildRecommendationExplanation(currentRestaurant, session, records, preferences)
      : null;
  const activeSession = session && !session.isCompleted ? session : null;
  const availableRestaurantCount = restaurants.filter((restaurant) => restaurant.isActive).length;

  async function handleFeedback(reason: "skip" | "too_expensive" | "too_far" | "not_this_category") {
    setBusyReason(FEEDBACK_REASON_LABELS[reason]);
    try {
      await cycleRecommendation(reason);
    } finally {
      setBusyReason(null);
    }
  }

  async function handleAccept() {
    setBusyReason("正在写入记录...");
    try {
      await acceptRecommendation();
    } finally {
      setBusyReason(null);
    }
  }

  return (
    <AppFrame
      title="推荐进行中"
      description="系统会记住本轮已经试过的店和你给过的拒绝理由，刷新后也能恢复。"
      actions={
        activeSession ? (
          <button type="button" className="button button-ghost" onClick={() => void resetSession()}>
            结束本轮
          </button>
        ) : null
      }
    >
      <div className="single-column-grid">
        {!isReady ? (
          <div className="card">
            <p className="muted-copy">正在读取本地 session...</p>
          </div>
        ) : null}

        {isReady && availableRestaurantCount === 0 ? (
          <div className="empty-state card">
            <h2>先添加饭店，再开始推荐</h2>
            <p>当前饭店库为空或全部停用。先去录入几家常吃的店，推荐页才有候选。</p>
            <Link href="/restaurants" className="button button-primary">
              去管理饭店
            </Link>
          </div>
        ) : null}

        {isReady && !session && !intent && availableRestaurantCount > 0 ? (
          <div className="empty-state card">
            <h2>没有进行中的 session</h2>
            <p>从首页进入“决定午饭 / 晚饭 / 纯随机来一个”，系统会自动开启新一轮。</p>
            <Link href="/" className="button button-primary">
              返回首页
            </Link>
          </div>
        ) : null}

        {session?.isCompleted && currentRestaurant ? (
          <div className="recommend-card accepted-state">
            <p className="eyebrow">已确认</p>
            <h2>今天就吃 {currentRestaurant.name}</h2>
            <p className="card-copy">
              已写入 {MEAL_TYPE_LABELS[session.mealType]} 历史记录，下一次推荐会自动参考这次选择。
            </p>
            <div className="chip-row wrap-row">
              <span className="chip">{currentRestaurant.category || "未分类"}</span>
              <span className="chip">{currentRestaurant.area || "区域未填"}</span>
              <span className="chip">{PRICE_LEVEL_LABELS[currentRestaurant.priceLevel]}</span>
            </div>
            <div className="button-row">
              <Link href="/" className="button button-primary">
                返回首页
              </Link>
              <Link href="/history" className="button button-secondary">
                查看历史
              </Link>
            </div>
          </div>
        ) : null}

        {activeSession && currentRestaurant ? (
          <div className="recommend-card">
            <div className="recommendation-header">
              <div>
                <p className="eyebrow">{SESSION_SOURCE_LABELS[activeSession.source]}</p>
                <h2>{currentRestaurant.name}</h2>
                <p className="card-copy">{explanation?.headline}</p>
              </div>
              <div className="chip-row wrap-row">
                <span className="chip">{MEAL_TYPE_LABELS[activeSession.mealType]}</span>
                <span className="chip">{DINING_MODE_LABELS[activeSession.mode]}</span>
                <span className="chip">{PRICE_LEVEL_LABELS[activeSession.budget]}</span>
              </div>
            </div>

            <div className="meta-grid">
              <div className="meta-card">
                <h3>推荐理由</h3>
                <ul className="text-list">
                  {explanation?.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </div>

              <div className="meta-card">
                <h3>当前过滤摘要</h3>
                <ul className="text-list">
                  {buildFilterSummary(activeSession).map((filter) => (
                    <li key={filter}>{filter}</li>
                  ))}
                </ul>
                <p className="meta-copy">
                  本轮开始于 {formatDateTime(activeSession.startedAt)}，已试过{" "}
                  {activeSession.alreadyRecommendedIds.length} 家。
                </p>
              </div>
            </div>

            <div className="feedback-grid">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => void handleFeedback("skip")}
                disabled={Boolean(busyReason)}
              >
                换一个
              </button>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => void handleFeedback("too_expensive")}
                disabled={Boolean(busyReason)}
              >
                太贵
              </button>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => void handleFeedback("too_far")}
                disabled={Boolean(busyReason)}
              >
                太远
              </button>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => void handleFeedback("not_this_category")}
                disabled={Boolean(busyReason)}
              >
                不想吃这类
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => void handleAccept()}
                disabled={Boolean(busyReason)}
              >
                今天就吃这个
              </button>
            </div>

            {busyReason ? <p className="meta-copy">处理中：{busyReason}</p> : null}
          </div>
        ) : null}

        {activeSession && !currentRestaurant ? (
          <div className="empty-state card">
            <h2>可选项不多，请放宽条件</h2>
            <p>当前预算、区域、分类、冷却规则和本轮已拒绝项叠加后，已经没有新的候选店了。</p>
            <div className="chip-row wrap-row">
              {buildFilterSummary(activeSession).map((filter) => (
                <span key={filter} className="chip">
                  {filter}
                </span>
              ))}
            </div>
            <div className="button-row">
              <Link href="/" className="button button-primary">
                重新开始
              </Link>
              <Link href="/restaurants" className="button button-secondary">
                去补充饭店
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </AppFrame>
  );
}
