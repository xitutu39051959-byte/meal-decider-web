"use client";

import { useEffect, useState, type FormEvent } from "react";

import { AppFrame } from "@/components/app-frame";
import { useAppData } from "@/components/providers/app-data-provider";
import { DEFAULT_PREFERENCES } from "@/lib/constants";
import type { UserPreference } from "@/types";

export function SettingsForm() {
  const { isReady, errorMessage, preferences, savePreferences } = useAppData();
  const [draft, setDraft] = useState<UserPreference>(DEFAULT_PREFERENCES);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await savePreferences(draft);
    setStatusMessage("默认偏好已保存。");
  }

  return (
    <AppFrame
      title="默认偏好"
      description="把常用预算、堂食方式和冷却规则存到本地，下一次直接带入。"
    >
      <div className="single-column-grid">
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="section-heading">
            <h2>推荐默认值</h2>
            <p>首页发起新一轮推荐时，会优先使用这些设置。</p>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>默认餐别</span>
              <select
                value={draft.defaultMealType}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    defaultMealType: event.target.value as UserPreference["defaultMealType"],
                  }))
                }
              >
                <option value="lunch">午饭</option>
                <option value="dinner">晚饭</option>
              </select>
            </label>

            <label className="field">
              <span>默认预算</span>
              <select
                value={draft.defaultBudget}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    defaultBudget: event.target.value as UserPreference["defaultBudget"],
                  }))
                }
              >
                <option value="low">低预算</option>
                <option value="medium">中预算</option>
                <option value="high">高预算</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>默认方式</span>
            <select
              value={draft.defaultMode}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  defaultMode: event.target.value as UserPreference["defaultMode"],
                }))
              }
            >
              <option value="any">不限</option>
              <option value="dine-in">堂食</option>
              <option value="delivery">外卖</option>
            </select>
          </label>

          <div className="field-grid">
            <label className="field">
              <span>同店冷却天数</span>
              <input
                type="number"
                min={0}
                max={30}
                value={draft.cooldownDaysRestaurant}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    cooldownDaysRestaurant: Number(event.target.value) || 0,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>同分类冷却天数</span>
              <input
                type="number"
                min={0}
                max={30}
                value={draft.cooldownDaysCategory}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    cooldownDaysCategory: Number(event.target.value) || 0,
                  }))
                }
              />
            </label>
          </div>

          {errorMessage ? <p className="inline-error">{errorMessage}</p> : null}
          {!isReady ? <p className="muted-copy">正在读取本地偏好...</p> : null}
          {statusMessage ? <p className="inline-success">{statusMessage}</p> : null}

          <div className="button-row">
            <button type="submit" className="button button-primary">
              保存偏好
            </button>
          </div>
        </form>
      </div>
    </AppFrame>
  );
}
