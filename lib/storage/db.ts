import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { MealRecord, RecommendationSession, Restaurant, UserPreference } from "@/types";

const DB_NAME = "meal-decider-web-db";
const DB_VERSION = 1;

interface StoredPreferences extends UserPreference {
  id: "default";
}

interface MealDeciderDB extends DBSchema {
  restaurants: {
    key: string;
    value: Restaurant;
    indexes: {
      "by-category": string;
      "by-updated-at": string;
      "by-active": number;
    };
  };
  records: {
    key: string;
    value: MealRecord;
    indexes: {
      "by-date": string;
      "by-restaurant-id": string;
      "by-created-at": string;
    };
  };
  preferences: {
    key: string;
    value: StoredPreferences;
  };
  sessions: {
    key: string;
    value: RecommendationSession;
    indexes: {
      "by-updated-at": string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<MealDeciderDB>> | null = null;

export function getMealDeciderDb() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is unavailable in the current environment.");
  }

  if (!dbPromise) {
    dbPromise = openDB<MealDeciderDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("restaurants")) {
          const restaurantStore = database.createObjectStore("restaurants", {
            keyPath: "id",
          });
          restaurantStore.createIndex("by-category", "category");
          restaurantStore.createIndex("by-updated-at", "updatedAt");
          restaurantStore.createIndex("by-active", "isActive");
        }

        if (!database.objectStoreNames.contains("records")) {
          const recordStore = database.createObjectStore("records", {
            keyPath: "id",
          });
          recordStore.createIndex("by-date", "date");
          recordStore.createIndex("by-restaurant-id", "restaurantId");
          recordStore.createIndex("by-created-at", "createdAt");
        }

        if (!database.objectStoreNames.contains("preferences")) {
          database.createObjectStore("preferences", {
            keyPath: "id",
          });
        }

        if (!database.objectStoreNames.contains("sessions")) {
          const sessionStore = database.createObjectStore("sessions", {
            keyPath: "id",
          });
          sessionStore.createIndex("by-updated-at", "updatedAt");
        }
      },
    });
  }

  return dbPromise;
}

export async function destroyMealDeciderDb() {
  if (dbPromise) {
    const existingDb = await dbPromise;
    existingDb.close();
    dbPromise = null;
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database deletion was blocked."));
  });
}

export type { StoredPreferences, MealDeciderDB };

