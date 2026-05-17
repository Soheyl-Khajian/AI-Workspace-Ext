// src/ui/state.ts
// ------------------------------------------------------------
// UI STATE MODULE
//
// Responsibility:
// - Holds transient in-memory UI state
// - Acts as the runtime state layer between storage and UI
// - Provides controlled access through getters/setters
//
// IMPORTANT RULES:
// - NO IndexedDB access
// - NO rendering
// - NO DOM access
// - NO business logic
// - ONLY state storage + safe accessors
// ------------------------------------------------------------

import type { Project } from "../models/project";
import type { Item } from "../models/item";

// ------------------------------------------------------------
// INTERNAL STATE SHAPE
// ------------------------------------------------------------

type UiState = {
  // ----------------------------------------------------------
  // Selection state
  // ----------------------------------------------------------

  selectedProjectId: string | null;
  selectedItemId: string | null;

  // ----------------------------------------------------------
  // Runtime caches
  // ----------------------------------------------------------

  projectsCache: Project[];
  itemsCache: Item[];
};

// ------------------------------------------------------------
// PRIVATE MODULE STATE
// ------------------------------------------------------------

/**
 * Single in-memory UI state tree.
 *
 * IMPORTANT:
 * - Never export this object directly
 * - External modules must use getters/setters only
 */
const state: UiState = {
  // Selection
  selectedProjectId: null,
  selectedItemId: null,

  // Caches
  projectsCache: [],
  itemsCache: [],
};

// ------------------------------------------------------------
// SELECTED PROJECT
// ------------------------------------------------------------

export function getSelectedProjectId(): string | null {
  return state.selectedProjectId;
}

export function setSelectedProjectId(projectId: string | null): void {
  state.selectedProjectId = projectId;
}

// ------------------------------------------------------------
// SELECTED ITEM
// ------------------------------------------------------------

export function getSelectedItemId(): string | null {
  return state.selectedItemId;
}

export function setSelectedItemId(itemId: string | null): void {
  state.selectedItemId = itemId;
}

// ------------------------------------------------------------
// PROJECTS CACHE
// ------------------------------------------------------------

/**
 * Returns a shallow copy of cached projects.
 *
 * WHY:
 * - Prevents accidental external array mutation
 * - Protects internal state ownership
 *
 * NOTE:
 * - This is a shallow copy only
 * - Nested object references remain shared
 */
export function getProjects(): Project[] {
  return [...state.projectsCache];
}

/**
 * Replaces the projects cache.
 *
 * WHY COPY:
 * - Prevents external references from mutating state later
 */
export function setProjects(projects: Project[]): void {
  state.projectsCache = [...projects];
}

// ------------------------------------------------------------
// ITEMS CACHE
// ------------------------------------------------------------

/**
 * Returns a shallow copy of cached items.
 */
export function getItems(): Item[] {
  return [...state.itemsCache];
}

/**
 * Replaces the items cache.
 */
export function setItems(items: Item[]): void {
  state.itemsCache = [...items];
}

// ------------------------------------------------------------
// RESET STATE
// ------------------------------------------------------------

/**
 * Resets all transient UI state.
 *
 * USE CASES:
 * - Extension reinjection
 * - Hot reload cycles
 * - SPA navigation recovery
 * - Debugging stale UI state
 *
 * IMPORTANT:
 * - Does NOT touch IndexedDB
 * - Does NOT automatically reload storage data
 */
export function resetState(): void {
  // Selection
  state.selectedProjectId = null;
  state.selectedItemId = null;

  // Caches
  state.projectsCache = [];
  state.itemsCache = [];
}
