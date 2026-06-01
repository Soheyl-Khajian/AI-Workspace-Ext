// src/storage/index.ts
import {
  insertProject,
  getAllProjects,
  deleteProject,
} from "./repo/projectsRepo";
import {
  insertItem,
  getItemsByProjectId,
  deleteItemById,
  deleteItemsByProjectId,
  getItemById,
} from "./repo/itemsRepo";

import type { Project } from "../models/project";
import type { Item, ItemMeta, ItemType } from "../models/item";

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

export async function deleteProjectCascade(projectId: string): Promise<void> {
  if (projectId == null) {
    throw new Error("project id is required (null/undefined)");
  }

  const trimmedProjectId = projectId.trim();

  if (trimmedProjectId.length === 0) {
    throw new Error("project id cannot be empty");
  }

  await deleteItemsByProjectId(trimmedProjectId);

  await deleteProject(trimmedProjectId);
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

  if (title == null) {
    throw new Error("Item title is required (null/undefined)");
  }

  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0) {
    throw new Error("Item title cannot be empty");
  }

  if (content == null) {
    throw new Error("Item content is required (null/undefined)");
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    throw new Error("Item content cannot be empty");
  }

  if (!meta) {
    throw new Error("Item meta is required");
  }

  const item: Item = {
    id: crypto.randomUUID(),
    projectId: trimmedProjectId,
    type,
    title: trimmedTitle,
    content: trimmedContent,
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
