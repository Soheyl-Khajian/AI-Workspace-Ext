// src/storage/repo/projectsRepo.ts
//
// Responsibility:
// Low-level persistence operations for Project records using IndexedDB.
//
// This file is part of the "repo layer":
// - It knows about IndexedDB mechanics (transactions, object stores).
// - It does NOT contain business rules (validation, ID generation, defaults).
// - It must remain a thin, predictable adapter over the DB.
//
// Design rules:
// - Every operation opens its own DB connection (MV3-safe).
// - Every transaction is explicitly awaited.
// - DB connections are always closed via try/finally.
// - No UI or domain logic belongs here.
//

import { openDb } from "../idb/openDb";
import { requestToPromise, txToPromise } from "../idb/promisify";
import { STORE_PROJECTS } from "../idb/schema";
import type { Project } from "../../models/project";

/**
 * Insert or replace a Project record in the database.
 *
 * Semantics:
 * - Uses "put" (upsert) behavior.
 * - If a project with the same `id` already exists, it is replaced.
 * - No validation is performed here; callers must enforce invariants.
 *
 * Transaction model:
 * - Single readwrite transaction scoped to the projects store.
 * - The function resolves only after the transaction fully commits.
 *
 * Failure behavior:
 * - Any IndexedDB error rejects the promise.
 * - DB connection is always closed, even on failure.
 */
export async function insertProject(project: Project): Promise<void> {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    const store = tx.objectStore(STORE_PROJECTS);

    // `put` provides idempotent "insert or replace" semantics.
    // This is acceptable for v0 and simplifies retries.
    const req = store.put(project);
    // Wait for the request itself to succeed.
    await requestToPromise(req);

    // Wait for the transaction to fully commit.
    await txToPromise(tx);
  } finally {
    // Always close the connection to avoid blocked upgrades
    // and leaked connections in MV3 environments.
    db.close();
  }
}

/**
 * Retrieve all Project records from the database.
 *
 * Semantics:
 * - Returns all projects currently stored.
 * - Ordering is applied in-memory (newest first by createdAt).
 * - No filtering or pagination in v0.
 *
 * Transaction model:
 * - Single readonly transaction scoped to the projects store.
 *
 * Notes:
 * - Sorting is intentionally done here (repo layer) so callers
 *   receive a consistent ordering without duplicating logic.
 */
export async function getAllProjects(): Promise<Project[]> {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);

    // Fetch all project records.
    const req = store.getAll();
    const rows: Project[] = await requestToPromise(req);
    // Ensure the transaction completes cleanly.
    await txToPromise(tx);

    // Sort newest-first for a predictable, UI-friendly order.
    rows.sort((a, b) => b.createdAt - a.createdAt);

    return rows;
  } finally {
    // Close connection even if an error occurred mid-operation.
    db.close();
  }
}

/**
 * Retrieve a single Project record by primary key.
 *
 * Semantics:
 * - Looks up the project directly by its `id` keyPath.
 * - Returns undefined if no matching record exists.
 * - Does NOT throw on missing records; caller decides behavior.
 *
 * Transaction model:
 * - Single readonly transaction scoped to the projects store.
 * - Resolves only after the transaction fully commits.
 *
 * Failure behavior:
 * - Any IndexedDB error rejects the promise.
 * - DB connection is always closed, even on failure.
 */
export async function getProjectById(id: string): Promise<Project | undefined> {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);

    const req = store.get(id);
    const project: Project | undefined = await requestToPromise(req);

    await txToPromise(tx);

    return project;
  } finally {
    db.close();
  }
}

/**
 * Delete a single Project record by primary key.
 *
 * Semantics:
 * - Permanently removes the project with the given id.
 * - No-op if the project does not exist.
 * - Does NOT cascade to items; caller is responsible for
 *   deleting related items before or after this call.
 *
 * Transaction model:
 * - Single readwrite transaction scoped to the projects store.
 * - Resolves only after the transaction fully commits.
 *
 * Failure behavior:
 * - Any IndexedDB error rejects the promise.
 * - DB connection is always closed, even on failure.
 */
export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    const store = tx.objectStore(STORE_PROJECTS);

    const req = store.delete(id);
    await requestToPromise(req);

    await txToPromise(tx);
  } finally {
    db.close();
  }
}
