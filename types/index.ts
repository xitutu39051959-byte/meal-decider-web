export type PriceLevel = "low" | "medium" | "high";

export type MealType = "lunch" | "dinner";

export type DiningMode = "dine-in" | "delivery" | "any";

export type SessionSource = "home-lunch" | "home-dinner" | "home-random";

export type SessionFeedbackReason =
  | "skip"
  | "too_expensive"
  | "too_far"
  | "not_this_category";

export interface Restaurant {
  id: string;
  name: string;
  category: string;
  area: string;
  priceLevel: PriceLevel;
  dineIn: boolean;
  delivery: boolean;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantDraft {
  id?: string;
  name: string;
  category: string;
  area: string;
  priceLevel: PriceLevel;
  dineIn: boolean;
  delivery: boolean;
  notes: string;
  isActive: boolean;
}

export interface MealRecord {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantCategory: string;
  date: string;
  mealType: MealType;
  acceptedFromRecommendation: boolean;
  createdAt: string;
}

export interface UserPreference {
  defaultMealType: MealType;
  defaultBudget: PriceLevel;
  defaultMode: DiningMode;
  cooldownDaysRestaurant: number;
  cooldownDaysCategory: number;
}

export interface SessionFeedbackEntry {
  restaurantId: string;
  restaurantName: string;
  reason: SessionFeedbackReason;
  createdAt: string;
}

export interface RecommendationSession {
  id: string;
  source: SessionSource;
  mealType: MealType;
  budget: PriceLevel;
  mode: DiningMode;
  excludedRestaurantIds: string[];
  excludedCategories: string[];
  excludedAreas: string[];
  rejectedReasons: SessionFeedbackEntry[];
  alreadyRecommendedIds: string[];
  startedAt: string;
  updatedAt: string;
  currentRestaurantId: string | null;
  acceptedRestaurantId: string | null;
  isCompleted: boolean;
}

export interface SessionSeed {
  source: SessionSource;
  mealType: MealType;
  budget: PriceLevel;
  mode: DiningMode;
}

export interface RecommendationExplanation {
  headline: string;
  details: string[];
  activeFilters: string[];
}

export interface RecommendationOutcome {
  restaurant: Restaurant | null;
  explanation: RecommendationExplanation;
  candidateCount: number;
}

export type RestaurantImportDuplicateStrategy = "skip" | "overwrite" | "keep-both";

export type RestaurantImportRowStatus = "ready" | "duplicate" | "error";

export interface RestaurantImportPreviewRow {
  rowNumber: number;
  status: RestaurantImportRowStatus;
  normalizedKey: string;
  draft: RestaurantDraft | null;
  sourceValues: Record<string, string>;
  errors: string[];
  duplicateReason: string | null;
  duplicateRestaurantId: string | null;
}

export interface RestaurantImportPreview {
  fileName: string;
  totalRecords: number;
  importableRecords: number;
  errorRecords: number;
  duplicateRecords: number;
  rows: RestaurantImportPreviewRow[];
}
