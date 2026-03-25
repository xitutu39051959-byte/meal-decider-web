import { ACTIVE_SESSION_ID, DEFAULT_PREFERENCES } from "@/lib/constants";
import { sortByCreatedAtDesc, sortByUpdatedAtDesc } from "@/lib/utils";
import type { MealRecord, RecommendationSession, Restaurant, UserPreference } from "@/types";

import { getMealDeciderDb } from "./db";

const PREFERENCES_KEY = "default";

export async function listRestaurants() {
  const database = await getMealDeciderDb();
  const restaurants = await database.getAll("restaurants");
  return sortByUpdatedAtDesc(restaurants);
}

export async function saveRestaurant(restaurant: Restaurant) {
  const database = await getMealDeciderDb();
  await database.put("restaurants", restaurant);
  return restaurant;
}

export async function deleteRestaurant(restaurantId: string) {
  const database = await getMealDeciderDb();
  await database.delete("restaurants", restaurantId);
}

export async function listMealRecords() {
  const database = await getMealDeciderDb();
  const records = await database.getAll("records");
  return sortByCreatedAtDesc(records);
}

export async function saveMealRecord(record: MealRecord) {
  const database = await getMealDeciderDb();
  await database.put("records", record);
  return record;
}

export async function getUserPreferences() {
  const database = await getMealDeciderDb();
  const preferences = await database.get("preferences", PREFERENCES_KEY);
  if (!preferences) {
    return DEFAULT_PREFERENCES;
  }

  const { id, ...storedPreferences } = preferences;
  void id;
  return {
    ...DEFAULT_PREFERENCES,
    ...storedPreferences,
  };
}

export async function saveUserPreferences(preferences: UserPreference) {
  const database = await getMealDeciderDb();
  await database.put("preferences", {
    ...preferences,
    id: PREFERENCES_KEY,
  });

  return preferences;
}

export async function getRecommendationSession() {
  const database = await getMealDeciderDb();
  const session = await database.get("sessions", ACTIVE_SESSION_ID);
  if (!session || session.isCompleted || session.acceptedRestaurantId) {
    return null;
  }

  return session;
}

export async function saveRecommendationSession(session: RecommendationSession) {
  const database = await getMealDeciderDb();
  await database.put("sessions", session);
  return session;
}

export async function clearRecommendationSession() {
  const database = await getMealDeciderDb();
  await database.delete("sessions", ACTIVE_SESSION_ID);
}
