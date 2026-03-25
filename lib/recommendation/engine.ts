import { ACTIVE_SESSION_ID, DINING_MODE_LABELS, PRICE_LEVEL_LABELS } from "@/lib/constants";
import { uniqueValues } from "@/lib/utils";
import type {
  MealRecord,
  PriceLevel,
  RecommendationExplanation,
  RecommendationOutcome,
  RecommendationSession,
  Restaurant,
  SessionFeedbackReason,
  SessionSeed,
  UserPreference,
} from "@/types";

const PRICE_RANK: Record<PriceLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const NEXT_LOWER_BUDGET: Record<PriceLevel, PriceLevel | null> = {
  low: null,
  medium: "low",
  high: "medium",
};

function differenceInDays(now: Date, dateString: string) {
  const target = new Date(dateString);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((now.getTime() - target.getTime()) / msPerDay);
}

function findLatestRestaurantRecord(records: MealRecord[], restaurantId: string) {
  return records.find((record) => record.restaurantId === restaurantId) ?? null;
}

function findLatestCategoryRecord(records: MealRecord[], category: string) {
  if (!category.trim()) {
    return null;
  }

  return records.find((record) => record.restaurantCategory === category) ?? null;
}

function isWithinBudget(priceLevel: PriceLevel, budget: PriceLevel) {
  return PRICE_RANK[priceLevel] <= PRICE_RANK[budget];
}

function scoreRestaurant(
  restaurant: Restaurant,
  session: RecommendationSession,
  records: MealRecord[],
  preferences: UserPreference,
  now: Date,
) {
  let weight = 100;

  if (restaurant.priceLevel === session.budget) {
    weight += 18;
  } else if (PRICE_RANK[restaurant.priceLevel] < PRICE_RANK[session.budget]) {
    weight += 10;
  }

  if (session.mode === "dine-in" && restaurant.dineIn) {
    weight += 16;
  }

  if (session.mode === "delivery" && restaurant.delivery) {
    weight += 16;
  }

  if (session.mode === "any" && restaurant.dineIn && restaurant.delivery) {
    weight += 10;
  }

  const latestRestaurantRecord = findLatestRestaurantRecord(records, restaurant.id);
  if (latestRestaurantRecord) {
    const daysSinceLastRestaurant = differenceInDays(now, latestRestaurantRecord.createdAt);
    weight -= Math.max(0, 18 - daysSinceLastRestaurant);
  }

  const latestCategoryRecord = findLatestCategoryRecord(records, restaurant.category);
  if (latestCategoryRecord) {
    const daysSinceLastCategory = differenceInDays(now, latestCategoryRecord.createdAt);
    weight -= Math.max(0, 10 - daysSinceLastCategory);
  }

  if (preferences.defaultMealType === session.mealType) {
    weight += 4;
  }

  return Math.max(weight, 1);
}

export function buildFilterSummary(session: RecommendationSession) {
  const filters = [`预算：${PRICE_LEVEL_LABELS[session.budget]}及以下`];
  filters.push(`方式：${DINING_MODE_LABELS[session.mode]}`);

  if (session.excludedCategories.length > 0) {
    filters.push(`排除分类：${session.excludedCategories.join(" / ")}`);
  }

  if (session.excludedAreas.length > 0) {
    filters.push(`排除区域：${session.excludedAreas.join(" / ")}`);
  }

  if (session.alreadyRecommendedIds.length > 0) {
    filters.push(`本轮已试过 ${session.alreadyRecommendedIds.length} 家`);
  }

  return filters;
}

export function buildRecommendationExplanation(
  restaurant: Restaurant,
  session: RecommendationSession,
  records: MealRecord[],
  preferences: UserPreference,
): RecommendationExplanation {
  const now = new Date();
  const latestRestaurantRecord = findLatestRestaurantRecord(records, restaurant.id);
  const latestCategoryRecord = findLatestCategoryRecord(records, restaurant.category);
  const details = [
    restaurant.category.trim() ? `分类：${restaurant.category}` : "分类可自定义，先按店名试试",
    restaurant.area.trim() ? `区域：${restaurant.area}` : "区域未填写，适合纯随机决策",
    `预算匹配：${PRICE_LEVEL_LABELS[restaurant.priceLevel]}，当前上限为 ${PRICE_LEVEL_LABELS[session.budget]}`,
  ];

  if (!latestRestaurantRecord) {
    details.push("最近没吃过这家，重复概率低。");
  } else {
    details.push(`上次吃这家是 ${differenceInDays(now, latestRestaurantRecord.createdAt)} 天前。`);
  }

  if (!latestCategoryRecord) {
    details.push("最近这类店出现不多，适合换换口味。");
  }

  if (restaurant.notes.trim()) {
    details.push(`备注：${restaurant.notes}`);
  }

  if (preferences.cooldownDaysRestaurant > 0 || preferences.cooldownDaysCategory > 0) {
    details.push(
      `已避开 ${preferences.cooldownDaysRestaurant} 天内同店和 ${preferences.cooldownDaysCategory} 天内同分类的强重复。`,
    );
  }

  return {
    headline: `今天先看 ${restaurant.name}`,
    details,
    activeFilters: buildFilterSummary(session),
  };
}

export function recommendRestaurant(params: {
  restaurants: Restaurant[];
  records: MealRecord[];
  session: RecommendationSession;
  preferences: UserPreference;
  now?: Date;
  random?: () => number;
}): RecommendationOutcome {
  const { restaurants, records, session, preferences } = params;
  const now = params.now ?? new Date();
  const random = params.random ?? Math.random;

  const candidates = restaurants
    .filter((restaurant) => restaurant.isActive)
    .filter((restaurant) => !session.excludedRestaurantIds.includes(restaurant.id))
    .filter((restaurant) => !session.alreadyRecommendedIds.includes(restaurant.id))
    .filter((restaurant) => !session.excludedCategories.includes(restaurant.category))
    .filter((restaurant) => !session.excludedAreas.includes(restaurant.area))
    .filter((restaurant) => isWithinBudget(restaurant.priceLevel, session.budget))
    .filter((restaurant) => {
      if (session.mode === "dine-in") {
        return restaurant.dineIn;
      }

      if (session.mode === "delivery") {
        return restaurant.delivery;
      }

      return true;
    })
    .filter((restaurant) => {
      const latestRestaurantRecord = findLatestRestaurantRecord(records, restaurant.id);
      if (!latestRestaurantRecord) {
        return true;
      }

      return differenceInDays(now, latestRestaurantRecord.createdAt) >= preferences.cooldownDaysRestaurant;
    })
    .filter((restaurant) => {
      const latestCategoryRecord = findLatestCategoryRecord(records, restaurant.category);
      if (!latestCategoryRecord) {
        return true;
      }

      return differenceInDays(now, latestCategoryRecord.createdAt) >= preferences.cooldownDaysCategory;
    })
    .map((restaurant) => ({
      restaurant,
      weight: scoreRestaurant(restaurant, session, records, preferences, now),
    }));

  if (candidates.length === 0) {
    return {
      restaurant: null,
      candidateCount: 0,
      explanation: {
        headline: "可选项不多，请放宽条件",
        details: [
          "当前预算、区域、分类或冷却规则已经把候选集压到 0。",
          "可以返回首页重新开一轮，或去管理饭店补充更多选项。",
        ],
        activeFilters: buildFilterSummary(session),
      },
    };
  }

  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  let target = random() * totalWeight;
  let selected = candidates[candidates.length - 1].restaurant;

  for (const candidate of candidates) {
    target -= candidate.weight;
    if (target <= 0) {
      selected = candidate.restaurant;
      break;
    }
  }

  return {
    restaurant: selected,
    candidateCount: candidates.length,
    explanation: buildRecommendationExplanation(selected, session, records, preferences),
  };
}

export function createRecommendationSession(
  seed: SessionSeed,
  now = new Date(),
): RecommendationSession {
  const timestamp = now.toISOString();

  return {
    id: ACTIVE_SESSION_ID,
    source: seed.source,
    mealType: seed.mealType,
    budget: seed.budget,
    mode: seed.mode,
    excludedRestaurantIds: [],
    excludedCategories: [],
    excludedAreas: [],
    rejectedReasons: [],
    alreadyRecommendedIds: [],
    startedAt: timestamp,
    updatedAt: timestamp,
    currentRestaurantId: null,
    acceptedRestaurantId: null,
    isCompleted: false,
  };
}

export function attachRecommendedRestaurant(
  session: RecommendationSession,
  restaurantId: string | null,
  now = new Date(),
): RecommendationSession {
  if (!restaurantId) {
    return {
      ...session,
      currentRestaurantId: null,
      updatedAt: now.toISOString(),
    };
  }

  return {
    ...session,
    currentRestaurantId: restaurantId,
    alreadyRecommendedIds: uniqueValues([...session.alreadyRecommendedIds, restaurantId]),
    updatedAt: now.toISOString(),
  };
}

export function applyFeedbackToSession(
  session: RecommendationSession,
  restaurant: Restaurant,
  reason: SessionFeedbackReason,
  now = new Date(),
): RecommendationSession {
  const nextBudget = NEXT_LOWER_BUDGET[restaurant.priceLevel];

  return {
    ...session,
    budget:
      reason === "too_expensive" && nextBudget && PRICE_RANK[nextBudget] < PRICE_RANK[session.budget]
        ? nextBudget
        : session.budget,
    excludedRestaurantIds: uniqueValues([...session.excludedRestaurantIds, restaurant.id]),
    excludedCategories:
      reason === "not_this_category" && restaurant.category.trim()
        ? uniqueValues([...session.excludedCategories, restaurant.category])
        : session.excludedCategories,
    excludedAreas:
      reason === "too_far" && restaurant.area.trim()
        ? uniqueValues([...session.excludedAreas, restaurant.area])
        : session.excludedAreas,
    rejectedReasons: [
      ...session.rejectedReasons,
      {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        reason,
        createdAt: now.toISOString(),
      },
    ],
    currentRestaurantId: null,
    updatedAt: now.toISOString(),
  };
}

export function completeRecommendationSession(
  session: RecommendationSession,
  restaurantId: string,
  now = new Date(),
): RecommendationSession {
  return {
    ...session,
    acceptedRestaurantId: restaurantId,
    currentRestaurantId: restaurantId,
    isCompleted: true,
    updatedAt: now.toISOString(),
  };
}
