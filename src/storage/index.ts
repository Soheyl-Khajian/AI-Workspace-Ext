// src/storage/index.ts
import { insertProject, getAllProjects } from "./repo/projectsRepo";
import {
  insertItem,
  getItemsByProjectId,
  deleteItemById,
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
   FUTURE FUNCTIONS (NOT IMPLEMENTED YET)
------------------------------------------------------- */

// export async function updateItem(...) {
//   // Phase 4: item editing + patch updates
// }

// export async function deleteProjectCascade(...) {
//   // Phase 4/5: delete project + all related items
// }
