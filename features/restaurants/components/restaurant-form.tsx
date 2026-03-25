"use client";

import { useEffect, useState, type FormEvent } from "react";

import { DEFAULT_RESTAURANT_DRAFT } from "@/lib/constants";
import type { Restaurant, RestaurantDraft } from "@/types";

interface RestaurantFormProps {
  editingRestaurant?: Restaurant | null;
  categories: string[];
  areas: string[];
  onSubmit: (draft: RestaurantDraft) => Promise<void>;
  onCancel: () => void;
}

function toDraft(restaurant?: Restaurant | null): RestaurantDraft {
  if (!restaurant) {
    return DEFAULT_RESTAURANT_DRAFT;
  }

  return {
    id: restaurant.id,
    name: restaurant.name,
    category: restaurant.category,
    area: restaurant.area,
    priceLevel: restaurant.priceLevel,
    dineIn: restaurant.dineIn,
    delivery: restaurant.delivery,
    notes: restaurant.notes,
    isActive: restaurant.isActive,
  };
}

export function RestaurantForm({
  editingRestaurant,
  categories,
  areas,
  onSubmit,
  onCancel,
}: RestaurantFormProps) {
  const [draft, setDraft] = useState<RestaurantDraft>(() => toDraft(editingRestaurant));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(toDraft(editingRestaurant));
    setErrorMessage(null);
  }, [editingRestaurant]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.name.trim()) {
      setErrorMessage("至少先填一个店名。");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        ...draft,
        name: draft.name.trim(),
        category: draft.category.trim(),
        area: draft.area.trim(),
        notes: draft.notes.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="section-heading">
        <h2>{editingRestaurant ? "编辑饭店" : "新增饭店"}</h2>
        <p>只填店名也能先保存，其他字段可以稍后补充。</p>
      </div>

      <label className="field">
        <span>店名 *</span>
        <input
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          placeholder="例如：楼下黄焖鸡"
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>分类</span>
          <input
            list="restaurant-category-options"
            value={draft.category}
            onChange={(event) =>
              setDraft((current) => ({ ...current, category: event.target.value }))
            }
            placeholder="米饭 / 面 / 轻食"
          />
        </label>

        <label className="field">
          <span>区域</span>
          <input
            list="restaurant-area-options"
            value={draft.area}
            onChange={(event) => setDraft((current) => ({ ...current, area: event.target.value }))}
            placeholder="公司附近 / 商场 / 小区"
          />
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>预算</span>
          <select
            value={draft.priceLevel}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                priceLevel: event.target.value as RestaurantDraft["priceLevel"],
              }))
            }
          >
            <option value="low">低预算</option>
            <option value="medium">中预算</option>
            <option value="high">高预算</option>
          </select>
        </label>

        <label className="field">
          <span>状态</span>
          <select
            value={draft.isActive ? "active" : "inactive"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                isActive: event.target.value === "active",
              }))
            }
          >
            <option value="active">启用</option>
            <option value="inactive">停用</option>
          </select>
        </label>
      </div>

      <div className="choice-grid">
        <label className="toggle">
          <input
            type="checkbox"
            checked={draft.dineIn}
            onChange={(event) =>
              setDraft((current) => ({ ...current, dineIn: event.target.checked }))
            }
          />
          <span>支持堂食</span>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={draft.delivery}
            onChange={(event) =>
              setDraft((current) => ({ ...current, delivery: event.target.checked }))
            }
          />
          <span>支持外卖</span>
        </label>
      </div>

      <label className="field">
        <span>备注</span>
        <textarea
          value={draft.notes}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
          placeholder="例如：招牌牛肉饭、午高峰慢一点"
          rows={4}
        />
      </label>

      {errorMessage ? <p className="inline-error">{errorMessage}</p> : null}

      <div className="button-row">
        <button type="submit" className="button button-primary" disabled={isSaving}>
          {isSaving ? "保存中..." : editingRestaurant ? "保存修改" : "添加饭店"}
        </button>
        <button type="button" className="button button-ghost" onClick={onCancel} disabled={isSaving}>
          {editingRestaurant ? "取消编辑" : "清空表单"}
        </button>
      </div>

      <datalist id="restaurant-category-options">
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <datalist id="restaurant-area-options">
        {areas.map((area) => (
          <option key={area} value={area} />
        ))}
      </datalist>
    </form>
  );
}
