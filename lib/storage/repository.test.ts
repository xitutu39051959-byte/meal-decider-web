import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { ACTIVE_SESSION_ID, DEFAULT_PREFERENCES } from "@/lib/constants";
import { destroyMealDeciderDb } from "@/lib/storage/db";
import {
  clearRecommendationSession,
  getRecommendationSession,
  getUserPreferences,
  listRestaurants,
  saveRecommendationSession,
  saveRestaurant,
  saveUserPreferences,
} from "@/lib/storage/repository";
import type { RecommendationSession, Restaurant } from "@/types";

const restaurant: Restaurant = {
  id: "rest-1",
  name: "测试餐厅",
  category: "米饭",
  area: "一区",
  priceLevel: "medium",
  dineIn: true,
  delivery: true,
  notes: "",
  isActive: true,
  createdAt: "2026-03-24T09:00:00.000Z",
  updatedAt: "2026-03-24T10:00:00.000Z",
};

beforeEach(async () => {
  await destroyMealDeciderDb();
});

describe("storage repository", () => {
  it("returns default preferences before anything is saved", async () => {
    const preferences = await getUserPreferences();
    expect(preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it("persists preferences and restaurant data in IndexedDB", async () => {
    await saveUserPreferences({
      defaultMealType: "dinner",
      defaultBudget: "high",
      defaultMode: "delivery",
      cooldownDaysRestaurant: 5,
      cooldownDaysCategory: 4,
    });
    await saveRestaurant(restaurant);

    const preferences = await getUserPreferences();
    const restaurants = await listRestaurants();

    expect(preferences.defaultMealType).toBe("dinner");
    expect(restaurants).toHaveLength(1);
    expect(restaurants[0].name).toBe("测试餐厅");
  });

  it("hides completed sessions from active session retrieval", async () => {
    const activeSession: RecommendationSession = {
      id: ACTIVE_SESSION_ID,
      source: "home-lunch",
      mealType: "lunch",
      budget: "medium",
      mode: "any",
      excludedRestaurantIds: [],
      excludedCategories: [],
      excludedAreas: [],
      rejectedReasons: [],
      alreadyRecommendedIds: [],
      startedAt: "2026-03-24T09:00:00.000Z",
      updatedAt: "2026-03-24T09:00:00.000Z",
      currentRestaurantId: "rest-1",
      acceptedRestaurantId: null,
      isCompleted: false,
    };

    await saveRecommendationSession(activeSession);
    expect(await getRecommendationSession()).not.toBeNull();

    await saveRecommendationSession({
      ...activeSession,
      acceptedRestaurantId: "rest-1",
      isCompleted: true,
    });
    expect(await getRecommendationSession()).toBeNull();

    await clearRecommendationSession();
    expect(await getRecommendationSession()).toBeNull();
  });
});
