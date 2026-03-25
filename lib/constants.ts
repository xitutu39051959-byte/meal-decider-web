import type {
  DiningMode,
  MealType,
  PriceLevel,
  SessionFeedbackReason,
  SessionSource,
  UserPreference,
} from "@/types";

export const APP_NAME = "Meal Decider Web";

export const ACTIVE_SESSION_ID = "active-session";

export const DEFAULT_PREFERENCES: UserPreference = {
  defaultMealType: "lunch",
  defaultBudget: "medium",
  defaultMode: "any",
  cooldownDaysRestaurant: 3,
  cooldownDaysCategory: 2,
};

export const DEFAULT_RESTAURANT_DRAFT = {
  name: "",
  category: "",
  area: "",
  priceLevel: "medium" as PriceLevel,
  dineIn: true,
  delivery: true,
  notes: "",
  isActive: true,
};

export const PRICE_LEVEL_LABELS: Record<PriceLevel, string> = {
  low: "低预算",
  medium: "中预算",
  high: "高预算",
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  lunch: "午饭",
  dinner: "晚饭",
};

export const DINING_MODE_LABELS: Record<DiningMode, string> = {
  "dine-in": "堂食",
  delivery: "外卖",
  any: "不限",
};

export const SESSION_SOURCE_LABELS: Record<SessionSource, string> = {
  "home-lunch": "决定午饭",
  "home-dinner": "决定晚饭",
  "home-random": "纯随机来一个",
};

export const FEEDBACK_REASON_LABELS: Record<SessionFeedbackReason, string> = {
  skip: "换一个",
  too_expensive: "太贵",
  too_far: "太远",
  not_this_category: "不想吃这类",
};
