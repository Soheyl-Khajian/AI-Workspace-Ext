// src/storage/repo/backupRepo.ts
//
// Responsibility:
// Low-level persistence for full-dataset backup / restore using IndexedDB.
//
// This file is part of the "repo layer":
// - It knows about IndexedDB mechanics (transactions, object stores).
// - It does NOT contain business rules or validation.
// - It must remain a thin adapter over the database layer.
//
// Design rules:
// - Every operation opens its own DB connection (MV3-safe).
// - Cross-store operations use a single shared transaction for atomicity.
// - DB connections are always closed via try/finally.
// - No UI or domain logic belongs here.
//

import type { Project } from "../../models/project";
import type { Item } from "../../models/item";

import { openDb } from "../idb/openDb";
import { txToPromise } from "../idb/promisify";

import { STORE_PROJECTS, STORE_ITEMS } from "../idb/schema";

/**
 * Replace the entire dataset (all projects and all items).
 *
 * Semantics:
 * - Destructive: clears both stores, then repopulates from the inputs.
 * - Uses `put` (upsert), so duplicate keys in the input won't throw.
 * - Validation is intentionally NOT handled here (see parseBackup).
 *
 * Transaction model:
 * - A SINGLE readwrite transaction spanning both stores, so the clear +
 *   rewrite is all-or-nothing — any failure rolls the whole thing back.
 * - Resolves only after the transaction fully commits.
 */
export async function replaceAllData(
  projects: Project[],
  items: Item[],
): Promise<void> {
  const db = await openDb();

  try {
    const tx = db.transaction([STORE_PROJECTS, STORE_ITEMS], "readwrite");
    const projectsStore = tx.objectStore(STORE_PROJECTS);
    const itemsStore = tx.objectStore(STORE_ITEMS);

    // Queue clear + all writes synchronously (no awaits between requests):
    // an IndexedDB transaction auto-commits once it has no pending work, so
    // an await here could close it before the writes are queued.
    projectsStore.clear();
    itemsStore.clear();

    for (const project of projects) {
      projectsStore.put(project);
    }

    for (const item of items) {
      itemsStore.put(item);
    }

    await txToPromise(tx);
  } finally {
    db.close();
  }
}
