// src/storage/idb/migrations.ts
// Schema migrations: apply incremental upgrades from oldVersion -> current DB_VERSION.
//
// Rules:
// - Only run during `onupgradeneeded` (versionchange transaction).
// - Only do schema work here (create stores/indexes). No runtime CRUD.
// - Must be safe if the user skips versions (oldVersion may jump).

import {
  IDX_ITEMS_BY_PROJECT,
  KEY_ITEMS,
  KEY_PROJECTS,
  STORE_ITEMS,
  STORE_PROJECTS,
} from "./schema";

/**
 * Apply schema migrations for IndexedDB.
 *
 * This function is called from `openDb.ts` inside `onupgradeneeded`.
 * The browser provides a special "versionchange" transaction for schema changes.
 */
export function applyMigrations(
  db: IDBDatabase,
  oldVersion: number,
  _newVersion: number | null,
  tx: IDBTransaction | null,
) {
  // Defensive guard: schema changes are only legal in a versionchange transaction.
  // If this fails, it indicates a programmer error (applyMigrations called from wrong context).
  if (!tx || tx.mode !== "versionchange") {
    throw new Error(
      "applyMigrations must run inside a versionchange transaction",
    );
  }

  // v1: initial install
  // Create the object stores and required indexes.
  if (oldVersion < 1) {
    // Projects store: primary key = "id"
    if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
      db.createObjectStore(STORE_PROJECTS, { keyPath: KEY_PROJECTS });
    }

    // Items store: primary key = "id"
    // Required query in v0: list items by projectId -> index on "projectId"
    const itemsStore: IDBObjectStore = db.objectStoreNames.contains(STORE_ITEMS)
      ? tx.objectStore(STORE_ITEMS)
      : db.createObjectStore(STORE_ITEMS, { keyPath: KEY_ITEMS });

    if (!itemsStore.indexNames.contains(IDX_ITEMS_BY_PROJECT)) {
      itemsStore.createIndex(IDX_ITEMS_BY_PROJECT, "projectId", {
        unique: false,
      });
    }
  }
}
