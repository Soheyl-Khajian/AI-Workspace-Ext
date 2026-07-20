// src/storage/index.ts
//
// Responsibility:
// Public storage API (facade) for the extension.
//
// - Validates and normalizes input before delegating to the repo layer.
// - Owns domain rules (required fields, trimming, immutable-field protection).
// - Never talks to IndexedDB directly; all persistence goes through repos.
//
// Layering: UI / controllers → storage (this file) → repo → idb
//

import {
  insertProject,
  getAllProjects,
  deleteProject,
  getProjectById,
  getOrInsertProjectByName,
} from "./repo/projectsRepo";
import {
  insertItem,
  getItemsByProjectId,
  deleteItemById,
  deleteItemsByProjectId,
  getItemById,
  getAllItems,
} from "./repo/itemsRepo";
import { replaceAllData as repoReplaceAllData } from "./repo/backupRepo";

import type { Project } from "../models/project";
import type { Item, ItemMeta, ItemType } from "../models/item";

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */

/**
 * A raw, format-free snapshot of the entire dataset.
 * Used by export/import; wrapping it into a versioned backup
 * document (schemaVersion, etc.) is the caller's responsibility.
 */
export type WorkspaceSnapshot = {
  projects: Project[];
  items: Item[];
};

/* -------------------------------------------------------
   PROJECTS
------------------------------------------------------- */

export async function createProject(
  name: string,
  description?: string,
): Promise<Project> {
  if (name == null) {
    throw new Error("Project name is required (received null/undefined)");
  }
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new Error("Project name cannot be empty");
  }

  const project: Project = {
    id: crypto.randomUUID(),
    name: trimmedName,
    createdAt: Date.now(),
  };

  const trimmedDescription = description?.trim();
  if (trimmedDescription && trimmedDescription.length > 0) {
    project.description = trimmedDescription;
  }

  await insertProject(project);
  return project;
}

export async function listProjects(): Promise<Project[]> {
  return getAllProjects();
}

/**
 * Return the existing project with the given name, or create it if none
 * exists — atomically, so concurrent callers cannot create duplicates.
 *
 * Domain rules (id generation, trimming) live here; the atomic get-or-insert
 * mechanics live in the repo. The candidate is only persisted if no project
 * with the trimmed name already exists.
 */
export async function getOrCreateProjectByName(name: string): Promise<Project> {
  if (name == null) {
    throw new Error("Project name is required (received null/undefined)");
  }
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new Error("Project name cannot be empty");
  }

  const candidate: Project = {
    id: crypto.randomUUID(),
    name: trimmedName,
    createdAt: Date.now(),
  };

  return getOrInsertProjectByName(trimmedName, candidate);
}

export async function deleteProjectCascade(projectId: string): Promise<void> {
  if (projectId == null) {
    throw new Error("project id is required (null/undefined)");
  }

  const trimmedProjectId = projectId.trim();

  if (trimmedProjectId.length === 0) {
    throw new Error("project id cannot be empty");
  }

  // Delete children first, then the project, so no items are orphaned.
  await deleteItemsByProjectId(trimmedProjectId);
  await deleteProject(trimmedProjectId);
}

export async function renameProject(
  projectId: string,
  name: string,
): Promise<Project> {
  if (projectId == null) {
    throw new Error("project id is required (null/undefined)");
  }
  const trimmedId = projectId.trim();
  if (trimmedId.length === 0) {
    throw new Error("project id cannot be empty");
  }

  if (name == null) {
    throw new Error("Project name is required (received null/undefined)");
  }
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new Error("Project name cannot be empty");
  }

  const existing = await getProjectById(trimmedId);
  if (existing === undefined) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Re-assert immutable fields after the spread to prevent accidental drift.
  const merged: Project = {
    ...existing,
    name: trimmedName,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };

  await insertProject(merged);

  return merged;
}

/* -------------------------------------------------------
   ITEMS
------------------------------------------------------- */

export async function createItem(
  projectId: string,
  type: ItemType,
  title: string,
  content: string,
  meta: ItemMeta,
): Promise<Item> {
  if (projectId == null) {
    throw new Error("projectId is required (null/undefined)");
  }

  const trimmedProjectId = projectId.trim();
  if (trimmedProjectId.length === 0) {
    throw new Error("projectId cannot be empty");
  }

  if (!type) {
    throw new Error("Item type is required");
  }

  if (!meta) {
    throw new Error("Item meta is required");
  }

  const normalizedTitle = (title ?? "").trim();

  const normalizedContent = content ?? "";

  const item: Item = {
    id: crypto.randomUUID(),
    projectId: trimmedProjectId,
    type,
    title: normalizedTitle,
    content: normalizedContent,
    createdAt: Date.now(),
    meta,
  };

  await insertItem(item);
  return item;
}

export async function listItemsByProject(projectId: string): Promise<Item[]> {
  if (projectId == null) {
    throw new Error("projectId is required (null/undefined)");
  }

  const trimmedProjectId = projectId.trim();

  if (trimmedProjectId.length === 0) {
    throw new Error("projectId cannot be empty");
  }

  return getItemsByProjectId(trimmedProjectId);
}

/**
 * Apply a partial update to an existing Item record.
 *
 * Semantics:
 * - Loads the existing item from storage.
 * - Merges mutable fields from partialUpdate into the existing record.
 * - Immutable fields (id, projectId, createdAt) are always preserved
 *   regardless of what partialUpdate contains.
 * - Sets updatedAt to the current timestamp on every successful update.
 * - Persists the merged result using upsert semantics.
 *
 * Failure behavior:
 * - Throws if itemId is null, undefined, or empty.
 * - Throws if no item exists with the given itemId.
 * - Any IndexedDB error propagates as a rejected promise.
 *
 * Returns:
 * - The fully merged, persisted Item record.
 */
export async function updateItem(
  id: string,
  partialUpdate: Partial<Item>,
): Promise<Item> {
  if (id == null) {
    throw new Error("item id is required (null/undefined)");
  }

  const trimmedId = id.trim();
  if (trimmedId.length === 0) {
    throw new Error("item id cannot be empty");
  }

  const existing = await getItemById(trimmedId);
  if (existing === undefined) {
    throw new Error(`Item not found: ${id}`);
  }

  // Merge: apply caller-supplied fields over existing record.
  // Immutable fields are re-asserted after spread to prevent
  // accidental overwrites from partialUpdate.
  const merged: Item = {
    ...existing,
    ...partialUpdate,
    id: existing.id,
    projectId: existing.projectId,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };

  if (partialUpdate.title !== undefined) {
    merged.title = (partialUpdate.title ?? "").trim();
  }
  if (partialUpdate.content !== undefined) {
    merged.content = partialUpdate.content ?? "";
  }

  await insertItem(merged);

  return merged;
}

export async function deleteItem(id: string): Promise<void> {
  if (id == null) {
    throw new Error("item id is required (null/undefined)");
  }

  const trimmedId = id.trim();

  if (trimmedId.length === 0) {
    throw new Error("item id cannot be empty");
  }

  await deleteItemById(trimmedId);
}

/* -------------------------------------------------------
   BACKUP (export / import)
------------------------------------------------------- */

/**
 * Read the entire dataset as a raw snapshot (all projects + all items).
 *
 * - Returns raw records only — no schemaVersion / format metadata.
 *   Wrapping this into a versioned backup document is the caller's job
 *   (see buildBackup), keeping storage free of format concerns.
 */
export async function exportAllData(): Promise<WorkspaceSnapshot> {
  const projects = await listProjects();
  const items = await getAllItems();
  return { projects, items };
}

/**
 * Replace the entire dataset with the provided projects and items.
 *
 * - Destructive: delegates to an atomic, all-or-nothing repo transaction.
 * - Only shallow-guards that inputs are arrays here; structural/shape
 *   validation of untrusted backup files belongs to parseBackup.
 */
export async function replaceAllData(
  projects: Project[],
  items: Item[],
): Promise<void> {
  if (!Array.isArray(projects) || !Array.isArray(items)) {
    throw new Error("replaceAllData requires both projects and items arrays");
  }

  await repoReplaceAllData(projects, items);
}
