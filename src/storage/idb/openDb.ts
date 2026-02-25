// src/storage/idb/openDb.ts
// Opens the IndexedDB database and applies schema migrations when needed.
//
// Responsibilities:
// - Call indexedDB.open with the current schema version.
// - During `onupgradeneeded`, run schema migrations using the upgrade transaction.
// - Resolve with an IDBDatabase instance on success.
// - Reject with a real error on failure.
// - Handle blocked upgrades and versionchange events defensively.

import { DB_NAME, DB_VERSION } from "./schema";
import { applyMigrations } from "./migrations";

/**
 * Open the extension's IndexedDB database.
 *
 * Note (MV3): service workers can suspend; don't assume the DB connection is long-lived.
 * Call openDb() at the start of each storage operation unless you implement a robust cache.
 */
export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Fired when the DB is created for the first time or when DB_VERSION increases.
    // Schema changes (create stores/indexes) are only legal inside this handler.
    request.onupgradeneeded = (event) => {
      const db = request.result;

      // Version info provided by the browser for incremental migrations.
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion;

      // The browser provides a special "versionchange" transaction for schema mutations.
      // This should exist during onupgradeneeded; if it doesn't, migrations will throw.
      const tx = request.transaction;

      console.log(`[IDB] Upgrade needed: v${oldVersion} -> v${newVersion}`);
      applyMigrations(db, oldVersion, newVersion, tx);
    };

    // Fired when the DB is open and ready for runtime transactions (CRUD).
    request.onsuccess = () => {
      const db = request.result;

      // If another context upgrades the DB, this connection must close or upgrades may be blocked.
      db.onversionchange = () => {
        console.warn("[IDB] Version change detected; closing DB connection.");
        db.close();
      };

      console.log(`[IDB] Opened ${db.name} v${db.version}`);
      resolve(db);
    };

    // Fired when the open request fails.
    request.onerror = () => {
      reject(
        request.error ??
          new Error(`[IDB] Failed to open ${DB_NAME} v${DB_VERSION}`),
      );
    };

    // Fired if an upgrade is blocked because another tab/context holds an old connection open.
    request.onblocked = () => {
      console.warn(
        "[IDB] Upgrade blocked: another tab/context is holding an old DB connection open.",
      );
    };
  });
}
