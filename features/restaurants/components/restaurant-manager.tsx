"use client";

import { useDeferredValue, useState } from "react";

import { AppFrame } from "@/components/app-frame";
import { useAppData } from "@/components/providers/app-data-provider";
import { PRICE_LEVEL_LABELS } from "@/lib/constants";
import { joinClasses } from "@/lib/utils";
import type { Restaurant } from "@/types";

import { RestaurantForm } from "./restaurant-form";
import { RestaurantImportPanel } from "./restaurant-import-panel";

export function RestaurantManager() {
  const { isReady, errorMessage, restaurants, upsertRestaurant, removeRestaurant } = useAppData();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [formNonce, setFormNonce] = useState(0);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const categoryOptions = Array.from(
    new Set(
      restaurants
        .map((restaurant) => restaurant.category)
        .filter((category) => Boolean(category.trim())),
    ),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));

  const areaOptions = Array.from(
    new Set(
      restaurants
        .map((restaurant) => restaurant.area)
        .filter((area) => Boolean(area.trim())),
    ),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const matchesSearch =
      !deferredSearchTerm.trim() ||
      `${restaurant.name} ${restaurant.category} ${restaurant.area} ${restaurant.notes}`
        .toLowerCase()
        .includes(deferredSearchTerm.trim().toLowerCase());

    const matchesCategory = categoryFilter === "all" || restaurant.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  async function handleDelete(restaurant: Restaurant) {
    const confirmed = window.confirm(`确认删除“${restaurant.name}”吗？`);
    if (!confirmed) {
      return;
    }

    await removeRestaurant(restaurant.id);
    if (editingRestaurant?.id === restaurant.id) {
      setEditingRestaurant(null);
      setFormNonce((current) => current + 1);
    }
  }

  async function handleToggleActive(restaurant: Restaurant) {
    await upsertRestaurant({
      id: restaurant.id,
      name: restaurant.name,
      category: restaurant.category,
      area: restaurant.area,
      priceLevel: restaurant.priceLevel,
      dineIn: restaurant.dineIn,
      delivery: restaurant.delivery,
      notes: restaurant.notes,
      isActive: !restaurant.isActive,
    });
  }

  return (
    <AppFrame
      title="饭店管理"
      description="录入、编辑、搜索、批量导入导出都集中在这里，先保证常用操作低摩擦。"
    >
      <div className="two-column-grid">
        <RestaurantForm
          key={`${editingRestaurant?.id ?? "new"}-${formNonce}`}
          editingRestaurant={editingRestaurant}
          categories={categoryOptions}
          areas={areaOptions}
          onSubmit={async (draft) => {
            await upsertRestaurant(draft);
            setEditingRestaurant(null);
            setFormNonce((current) => current + 1);
          }}
          onCancel={() => {
            setEditingRestaurant(null);
            setFormNonce((current) => current + 1);
          }}
        />

        <div className="stack-panel">
          <RestaurantImportPanel />

          <div className="card">
            <div className="section-heading">
              <h2>饭店列表</h2>
              <p>{restaurants.length} 家已收录，支持搜索、分类筛选和启停。</p>
            </div>

            <div className="field-grid compact-gap">
              <label className="field">
                <span>搜索</span>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="按店名 / 分类 / 区域搜索"
                />
              </label>

              <label className="field">
                <span>分类筛选</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">全部分类</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {errorMessage ? <p className="inline-error">{errorMessage}</p> : null}
            {!isReady ? <p className="muted-copy">正在读取本地饭店库...</p> : null}

            {isReady && filteredRestaurants.length === 0 ? (
              <div className="empty-state">
                <h3>还没有符合条件的饭店</h3>
                <p>先新增几家常吃的店，后续就能直接一键决定午饭或晚饭。</p>
              </div>
            ) : null}

            <div className="stack-list">
              {filteredRestaurants.map((restaurant) => (
                <article
                  key={restaurant.id}
                  className={joinClasses("restaurant-card", !restaurant.isActive && "is-muted")}
                >
                  <div className="restaurant-header">
                    <div>
                      <h3>{restaurant.name}</h3>
                      <div className="chip-row">
                        <span className="chip">{restaurant.category || "未分类"}</span>
                        <span className="chip">{restaurant.area || "区域未填"}</span>
                        <span className="chip">{PRICE_LEVEL_LABELS[restaurant.priceLevel]}</span>
                        <span className="chip">{restaurant.isActive ? "启用中" : "已停用"}</span>
                      </div>
                    </div>
                    <div className="chip-row">
                      <span className="chip subtle">{restaurant.dineIn ? "堂食" : "不堂食"}</span>
                      <span className="chip subtle">{restaurant.delivery ? "外卖" : "不外卖"}</span>
                    </div>
                  </div>

                  {restaurant.notes ? <p className="card-copy">{restaurant.notes}</p> : null}

                  <div className="button-row">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setEditingRestaurant(restaurant)}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => void handleToggleActive(restaurant)}
                    >
                      {restaurant.isActive ? "停用" : "启用"}
                    </button>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() => void handleDelete(restaurant)}
                    >
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
