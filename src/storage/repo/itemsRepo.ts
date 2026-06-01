// src/storage/repo/itemsRepo.ts
//
// Responsibility:
// Low-level persistence operations for Item records using IndexedDB.
//
// This file is part of the "repo layer":
// - It knows about IndexedDB mechanics (transactions, object stores, indexes).
// - It does NOT contain business rules or validation.
// - It must remain a thin adapter over the database layer.
//
// Design rules:
// - Every operation opens its own DB connection (MV3-safe).
// - Every transaction is explicitly awaited.
// - DB connections are always closed via try/finally.
// - No UI or domain logic belongs here.
//

import type { Item } from "../../models/item";

import { openDb } from "../idb/openDb";
import { requestToPromise, txToPromise } from "../idb/promisify";

import { IDX_ITEMS_BY_PROJECT, STORE_ITEMS } from "../idb/schema";

/**
 * Insert or replace an Item record.
 *
 * Semantics:
 * - Uses IndexedDB `put` behavior (upsert).
 * - Existing records with the same `id` are replaced.
 * - Validation is intentionally NOT handled here.
 *
 * Transaction model:
 * - Single readwrite transaction scoped to the items store.
 * - Resolves only after the transaction fully commits.
 */
export async function insertItem(item: Item): Promise<void> {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_ITEMS, "readwrite");
    const store = tx.objectStore(STORE_ITEMS);

    const req = store.put(item);
    // Wait for the request itself to succeed.
    await requestToPromise(req);

    // Wait for the transaction commit.
    await txToPromise(tx);
  } finally {
    // Always close DB connections in MV3 environments.
    db.close();
  }
}

/**
 * Retrieve all items belonging to a specific project.
 *
 * Query model:
 * - Uses the `by_projectId` secondary index.
 * - Results are sorted newest-first in-memory.
 *
 * Transaction model:
 * - Single readonly transaction scoped to the items store.
 */
export async function getItemsByProjectId(projectId: string): Promise<Item[]> {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_ITEMS, "readonly");
    const store = tx.objectStore(STORE_ITEMS);

    // Query all matching items through the projectId index.
    const index = store.index(IDX_ITEMS_BY_PROJECT);
    const req = index.getAll(projectId);

    const rows: Item[] = await requestToPromise(req);
    // Ensure transaction completion.
    await txToPromise(tx);

    // Stable UI-friendly ordering.
    rows.sort((a, b) => b.createdAt - a.createdAt);

    return rows;
  } finally {
    db.close();
  }
}

/**
 * Retrieve a single Item record by primary key.
 *
 * Semantics:
 * - Looks up the item directly by its `id` keyPath.
 * - Returns undefined if no matching record exists.
 * - Does NOT throw on missing records; caller decides behavior.
 *
 * Transaction model:
 * - Single readonly transaction scoped to the items store.
 * - Resolves only after the transaction fully commits.
 *
 * Failure behavior:
 * - Any IndexedDB error rejects the promise.
 * - DB connection is always closed, even on failure.
 */
export async function getItemById(id: string): Promise<Item | undefined> {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_ITEMS, "readonly");
    const store = tx.objectStore(STORE_ITEMS);

    const req = store.get(id);
    const item: Item | undefined = await requestToPromise(req);

    await txToPromise(tx);

    return item;
  } finally {
    db.close();
  }
}

/**
 * Delete a single item by primary key.
 *
 * Semantics:
 * - No-op if the item does not exist.
 *
 * Transaction model:
 * - Single readwrite transaction scoped to the items store.
 */
export async function deleteItemById(id: string): Promise<void> {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_ITEMS, "readwrite");
    const store = tx.objectStore(STORE_ITEMS);

    const req = store.delete(id);
    // Wait for delete request success.
    await requestToPromise(req);

    // Wait for transaction commit.
    await txToPromise(tx);
  } finally {
    db.close();
  }
}

/**
 * Delete all items belonging to a specific project.
 *
 * IndexedDB does not support bulk delete by secondary index directly.
 *
 * Deletion strategy:
 * 1. Query matching items through the projectId index.
 * 2. Delete each item individually by primary key.
 * 3. Commit all deletes inside one shared transaction.
 *
 * Transaction model:
 * - Single readwrite transaction scoped to the items store.
 */
export async function deleteItemsByProjectId(projectId: string): Promise<void> {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_ITEMS, "readwrite");
    const store = tx.objectStore(STORE_ITEMS);

    // Retrieve all items belonging to the project.
    const index = store.index(IDX_ITEMS_BY_PROJECT);

    const req = index.getAll(projectId);
    const items: Item[] = await requestToPromise(req);

    // Queue all delete operations into the same transaction.
    for (const item of items) {
      store.delete(item.id);
    }

    // Wait for transaction commit.
    await txToPromise(tx);
  } finally {
    db.close();
  }
}
