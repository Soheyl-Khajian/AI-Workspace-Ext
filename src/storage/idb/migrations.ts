// src/storage/idb/migrations.ts
// Schema migrations: bring any older database up to the current DB_VERSION contract.
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
  _oldVersion: number,
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

  // Reconcile pass (runs on EVERY upgrade, including fresh installs):
  // create whatever stores and indexes the declarative IDB_SCHEMA
  // contract declares and this database is missing. Both `contains`
  // guards make the pass idempotent, and skipped versions are handled
  // for free -- a fresh install arriving as 0 -> 2 builds everything
  // in one pass.

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

  // BOUNDARY: reconciliation can only express ADDITIVE work. The day a
  // migration must transform, rename, or remove anything, that work
  // becomes a stepwise `if (oldVersion < N)` block BELOW this pass,
  // run exactly once per version boundary. `_oldVersion` returns to
  // service (and loses its underscore) on that day.
}
