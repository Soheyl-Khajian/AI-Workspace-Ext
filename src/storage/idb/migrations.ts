// src/storage/idb/migrations.ts
// Schema migrations: apply incremental upgrades from oldVersion -> current DB_VERSION.
//
// Rules:
// - Only run during `onupgradeneeded` (versionchange transaction).
// - Only do schema work here (create stores/indexes). No runtime CRUD.
// - Must be safe if the user skips versions (oldVersion may jump).

import { IDB_SCHEMA } from "./schema";

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
    const stores = IDB_SCHEMA.stores;

    for (const storeDef of stores) {
      const storeName = storeDef.name;

      let store: IDBObjectStore;

      // 1. Create store ONLY if missing
      if (!db.objectStoreNames.contains(storeName)) {
        store = db.createObjectStore(storeName, {
          keyPath: storeDef.keyPath,
        });
      } else {
        // Safe fallback: store already exists in this upgrade context
        store = tx.objectStore(storeName);
      }

      // 2. Create indexes (always safe after store exists)
      for (const indexDef of storeDef.indexes) {
        if (!store.indexNames.contains(indexDef.name)) {
          store.createIndex(indexDef.name, indexDef.keyPath, indexDef.options);
        }
      }
    }
  }
}
