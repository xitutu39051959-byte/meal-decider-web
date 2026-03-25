import { describe, expect, it } from "vitest";

import {
  applyFeedbackToSession,
  attachRecommendedRestaurant,
  createRecommendationSession,
  recommendRestaurant,
} from "@/lib/recommendation/engine";
import type { MealRecord, Restaurant, UserPreference } from "@/types";

const restaurants: Restaurant[] = [
  {
    id: "r1",
    name: "米饭一号",
    category: "米饭",
    area: "A区",
    priceLevel: "medium",
    dineIn: true,
    delivery: true,
    notes: "",
    isActive: true,
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z",
  },
  {
    id: "r2",
    name: "面馆二号",
    category: "面",
    area: "B区",
    priceLevel: "low",
    dineIn: true,
    delivery: false,
    notes: "",
    isActive: true,
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z",
  },
  {
    id: "r3",
    name: "轻食三号",
    category: "轻食",
    area: "C区",
    priceLevel: "high",
    dineIn: false,
    delivery: true,
    notes: "",
    isActive: true,
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z",
  },
];

const preferences: UserPreference = {
  defaultMealType: "lunch",
  defaultBudget: "medium",
  defaultMode: "any",
  cooldownDaysRestaurant: 2,
  cooldownDaysCategory: 2,
};

describe("recommendation engine", () => {
  it("does not recommend the same restaurant twice in one session", () => {
    const now = new Date("2026-03-24T12:00:00.000Z");
    let session = createRecommendationSession(
      {
        source: "home-lunch",
        mealType: "lunch",
        budget: "medium",
        mode: "any",
      },
      now,
    );

    const firstResult = recommendRestaurant({
      restaurants,
      records: [],
      preferences,
      session,
      now,
      random: () => 0,
    });
    expect(firstResult.restaurant?.id).toBe("r1");

    session = attachRecommendedRestaurant(session, firstResult.restaurant?.id ?? null, now);
    session = applyFeedbackToSession(session, firstResult.restaurant!, "skip", now);

    const secondResult = recommendRestaurant({
      restaurants,
      records: [],
      preferences,
      session,
      now,
      random: () => 0,
    });

    expect(secondResult.restaurant?.id).toBe("r2");
  });

  it("excludes a category after not_this_category feedback", () => {
    const now = new Date("2026-03-24T12:00:00.000Z");
    let session = createRecommendationSession(
      {
        source: "home-lunch",
        mealType: "lunch",
        budget: "high",
        mode: "any",
      },
      now,
    );

    session = attachRecommendedRestaurant(session, "r1", now);
    session = applyFeedbackToSession(session, restaurants[0], "not_this_category", now);

    const result = recommendRestaurant({
      restaurants: [
        restaurants[0],
        {
          ...restaurants[1],
          id: "r4",
          name: "米饭四号",
          category: "米饭",
        },
        restaurants[2],
      ],
      records: [],
      preferences,
      session,
      now,
      random: () => 0,
    });

    expect(result.restaurant?.category).not.toBe("米饭");
  });

  it("filters out candidates blocked by cooldown and returns empty result", () => {
    const now = new Date("2026-03-24T12:00:00.000Z");
    const records: MealRecord[] = [
      {
        id: "m1",
        restaurantId: "r1",
        restaurantName: "米饭一号",
        restaurantCategory: "米饭",
        date: "2026-03-23",
        mealType: "lunch",
        acceptedFromRecommendation: true,
        createdAt: "2026-03-23T12:00:00.000Z",
      },
      {
        id: "m2",
        restaurantId: "r2",
        restaurantName: "面馆二号",
        restaurantCategory: "面",
        date: "2026-03-23",
        mealType: "lunch",
        acceptedFromRecommendation: true,
        createdAt: "2026-03-23T12:00:00.000Z",
      },
    ];
    const strictPreferences: UserPreference = {
      ...preferences,
      cooldownDaysRestaurant: 3,
      cooldownDaysCategory: 3,
    };
    const session = createRecommendationSession(
      {
        source: "home-lunch",
        mealType: "lunch",
        budget: "medium",
        mode: "dine-in",
      },
      now,
    );

    const result = recommendRestaurant({
      restaurants: restaurants.slice(0, 2),
      records,
      preferences: strictPreferences,
      session,
      now,
      random: () => 0,
    });

    expect(result.restaurant).toBeNull();
    expect(result.candidateCount).toBe(0);
    expect(result.explanation.headline).toContain("可选项不多");
  });
});
