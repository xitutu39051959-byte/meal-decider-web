"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { DEFAULT_PREFERENCES } from "@/lib/constants";
import {
  applyFeedbackToSession,
  attachRecommendedRestaurant,
  completeRecommendationSession,
  createRecommendationSession,
  recommendRestaurant,
} from "@/lib/recommendation/engine";
import {
  clearRecommendationSession,
  deleteRestaurant as deleteStoredRestaurant,
  getRecommendationSession,
  getUserPreferences,
  listMealRecords,
  listRestaurants,
  saveMealRecord,
  saveRecommendationSession,
  saveRestaurant as saveStoredRestaurant,
  saveUserPreferences,
} from "@/lib/storage/repository";
import { createId, formatDayKey, sortByCreatedAtDesc, sortByUpdatedAtDesc } from "@/lib/utils";
import type {
  MealRecord,
  RecommendationSession,
  Restaurant,
  RestaurantDraft,
  SessionFeedbackReason,
  SessionSeed,
  UserPreference,
} from "@/types";

interface AppDataContextValue {
  isReady: boolean;
  errorMessage: string | null;
  restaurants: Restaurant[];
  records: MealRecord[];
  preferences: UserPreference;
  session: RecommendationSession | null;
  upsertRestaurant: (draft: RestaurantDraft) => Promise<void>;
  upsertRestaurants: (drafts: RestaurantDraft[]) => Promise<void>;
  removeRestaurant: (restaurantId: string) => Promise<void>;
  savePreferences: (preferences: UserPreference) => Promise<void>;
  startSession: (seed: SessionSeed) => Promise<void>;
  cycleRecommendation: (reason: SessionFeedbackReason) => Promise<void>;
  acceptRecommendation: () => Promise<void>;
  resetSession: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function buildRestaurantFromDraft(
  draft: RestaurantDraft,
  existingRestaurant?: Restaurant,
  now = new Date().toISOString(),
) {
  return {
    id: existingRestaurant?.id ?? createId(),
    name: draft.name.trim(),
    category: draft.category.trim(),
    area: draft.area.trim(),
    priceLevel: draft.priceLevel,
    dineIn: draft.dineIn,
    delivery: draft.delivery,
    notes: draft.notes.trim(),
    isActive: draft.isActive,
    createdAt: existingRestaurant?.createdAt ?? now,
    updatedAt: now,
  } satisfies Restaurant;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [preferences, setPreferences] = useState<UserPreference>(DEFAULT_PREFERENCES);
  const [session, setSession] = useState<RecommendationSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAppData() {
      try {
        const [nextRestaurants, nextRecords, nextPreferences, nextSession] = await Promise.all([
          listRestaurants(),
          listMealRecords(),
          getUserPreferences(),
          getRecommendationSession(),
        ]);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setRestaurants(nextRestaurants);
          setRecords(nextRecords);
          setPreferences(nextPreferences);
          setSession(nextSession);
          setErrorMessage(null);
          setIsReady(true);
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "加载本地数据失败。";
        startTransition(() => {
          setErrorMessage(message);
          setIsReady(true);
        });
      }
    }

    void loadAppData();

    return () => {
      cancelled = true;
    };
  }, []);

  async function upsertRestaurant(draft: RestaurantDraft) {
    const existingRestaurant = draft.id
      ? restaurants.find((restaurant) => restaurant.id === draft.id)
      : undefined;
    const nextRestaurant = buildRestaurantFromDraft(draft, existingRestaurant);

    await saveStoredRestaurant(nextRestaurant);
    setRestaurants((currentRestaurants) => {
      const remainingRestaurants = currentRestaurants.filter(
        (restaurant) => restaurant.id !== nextRestaurant.id,
      );
      return sortByUpdatedAtDesc([nextRestaurant, ...remainingRestaurants]);
    });
  }

  async function upsertRestaurants(drafts: RestaurantDraft[]) {
    if (drafts.length === 0) {
      return;
    }

    const restaurantMap = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant]));
    const nextRestaurants = drafts.map((draft, index) => {
      const existingRestaurant = draft.id ? restaurantMap.get(draft.id) : undefined;
      const nextRestaurant = buildRestaurantFromDraft(
        draft,
        existingRestaurant,
        new Date(Date.now() + index).toISOString(),
      );
      restaurantMap.set(nextRestaurant.id, nextRestaurant);
      return nextRestaurant;
    });

    await Promise.all(nextRestaurants.map((restaurant) => saveStoredRestaurant(restaurant)));
    setRestaurants((currentRestaurants) => {
      const nextRestaurantMap = new Map(currentRestaurants.map((restaurant) => [restaurant.id, restaurant]));
      for (const restaurant of nextRestaurants) {
        nextRestaurantMap.set(restaurant.id, restaurant);
      }
      return sortByUpdatedAtDesc([...nextRestaurantMap.values()]);
    });
  }

  async function removeRestaurant(restaurantId: string) {
    await deleteStoredRestaurant(restaurantId);
    setRestaurants((currentRestaurants) =>
      currentRestaurants.filter((restaurant) => restaurant.id !== restaurantId),
    );

    if (session?.currentRestaurantId === restaurantId) {
      const nextSession: RecommendationSession = {
        ...session,
        currentRestaurantId: null,
      };
      await saveRecommendationSession(nextSession);
      setSession(nextSession);
    }
  }

  async function persistSession(nextSession: RecommendationSession) {
    await saveRecommendationSession(nextSession);
    setSession(nextSession);
  }

  async function savePreferencesAction(nextPreferences: UserPreference) {
    await saveUserPreferences(nextPreferences);
    setPreferences(nextPreferences);
  }

  async function startSession(seed: SessionSeed) {
    const now = new Date();
    let nextSession = createRecommendationSession(seed, now);
    const outcome = recommendRestaurant({
      restaurants,
      records,
      preferences,
      session: nextSession,
      now,
    });
    nextSession = attachRecommendedRestaurant(nextSession, outcome.restaurant?.id ?? null, now);
    await persistSession(nextSession);
  }

  async function cycleRecommendation(reason: SessionFeedbackReason) {
    if (!session?.currentRestaurantId) {
      return;
    }

    const currentRestaurant = restaurants.find(
      (restaurant) => restaurant.id === session.currentRestaurantId,
    );
    if (!currentRestaurant) {
      return;
    }

    const now = new Date();
    let nextSession = applyFeedbackToSession(session, currentRestaurant, reason, now);
    const outcome = recommendRestaurant({
      restaurants,
      records,
      preferences,
      session: nextSession,
      now,
    });
    nextSession = attachRecommendedRestaurant(nextSession, outcome.restaurant?.id ?? null, now);
    await persistSession(nextSession);
  }

  async function acceptRecommendation() {
    if (!session?.currentRestaurantId) {
      return;
    }

    const currentRestaurant = restaurants.find(
      (restaurant) => restaurant.id === session.currentRestaurantId,
    );
    if (!currentRestaurant) {
      return;
    }

    const now = new Date();
    const createdAt = now.toISOString();
    const record: MealRecord = {
      id: createId(),
      restaurantId: currentRestaurant.id,
      restaurantName: currentRestaurant.name,
      restaurantCategory: currentRestaurant.category,
      date: formatDayKey(now),
      mealType: session.mealType,
      acceptedFromRecommendation: true,
      createdAt,
    };

    await saveMealRecord(record);
    const completedSession = completeRecommendationSession(session, currentRestaurant.id, now);
    await saveRecommendationSession(completedSession);

    setRecords((currentRecords) => sortByCreatedAtDesc([record, ...currentRecords]));
    setSession(completedSession);
  }

  async function resetSession() {
    await clearRecommendationSession();
    setSession(null);
  }

  const value: AppDataContextValue = {
    isReady,
    errorMessage,
    restaurants,
    records,
    preferences,
    session,
    upsertRestaurant,
    upsertRestaurants,
    removeRestaurant,
    savePreferences: savePreferencesAction,
    startSession,
    cycleRecommendation,
    acceptRecommendation,
    resetSession,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider.");
  }

  return context;
}
