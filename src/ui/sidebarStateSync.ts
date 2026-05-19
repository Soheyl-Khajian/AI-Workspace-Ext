// src/ui/sidebarStateSync.ts
// ------------------------------------------------------------
// SIDEBAR STATE SYNCHRONIZATION
//
// Responsibility:
// - Synchronize UI state with persistent storage
// - Keep selected entities valid after refresh
// - Reset dependent state when necessary
//
// Rules:
// - Reads from storage layer
// - Writes to UI state layer
// - No rendering
// - No DOM access
// ------------------------------------------------------------

import { listProjects, listItemsByProject } from "../storage/index";

import {
  getSelectedProjectId,
  setSelectedProjectId,
  getSelectedItemId,
  setSelectedItemId,
  setProjects,
  setItems,
} from "./state";

// ------------------------------------------------------------
// PROJECTS STATE SYNC
// ------------------------------------------------------------

export async function refreshProjectsState(): Promise<void> {
  const projects = await listProjects();

  setProjects(projects);

  const selectedProjectId = getSelectedProjectId();

  const selectedProjectStillExists = projects.some(
    (project) => project.id === selectedProjectId,
  );

  if (!selectedProjectStillExists) {
    setSelectedProjectId(null);
  }
}

// ------------------------------------------------------------
// ITEMS STATE SYNC
// ------------------------------------------------------------

export async function refreshItemsState(): Promise<void> {
  const selectedProjectId = getSelectedProjectId();

  // No selected project -> clear dependent item state
  if (selectedProjectId === null) {
    setItems([]);
    setSelectedItemId(null);

    return;
  }

  const items = await listItemsByProject(selectedProjectId);

  setItems(items);

  const selectedItemId = getSelectedItemId();

  const selectedItemStillExists = items.some(
    (item) => item.id === selectedItemId,
  );

  if (!selectedItemStillExists) {
    setSelectedItemId(null);
  }
}
