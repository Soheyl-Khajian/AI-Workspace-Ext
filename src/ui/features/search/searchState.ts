// src/ui/features/search/searchState.ts
// ------------------------------------------------------------
// SEARCH RUNTIME STATE
// ------------------------------------------------------------
//
// Responsibility:
// - hold the in-memory workspace snapshot that search filters
//   over (all projects + all items, loaded on panel open)
// - hold search loading/error runtime state
//
// IMPORTANT:
//
// - the snapshot is a CACHE of storage, not the truth:
//   reopening the panel refreshes it; keystrokes never touch
//   the database
// - loading vs loadingIndicatorVisible is the truth/presentation
//   split: "a load is running" and "the user should see a
//   loading state" are different facts (see itemsState)
// - runtime-only memory state — NOT persistent storage
// - NO DOM access, NO rendering, NO business orchestration
// ------------------------------------------------------------

import type { Project } from "../../../models/project";
import type { Item } from "../../../models/item";

// ------------------------------------------------------------
// STATE SHAPE
// ------------------------------------------------------------

type SearchState = {
  projects: Project[];
  items: Item[];
  loading: boolean;
  loadingIndicatorVisible: boolean;
  error: string | null;
};

// ------------------------------------------------------------
// PRIVATE STATE
// ------------------------------------------------------------

const state: SearchState = {
  projects: [],
  items: [],
  loading: false,
  loadingIndicatorVisible: false,
  error: null,
};

// ------------------------------------------------------------
// SNAPSHOT
// ------------------------------------------------------------

export function getSearchProjects(): Project[] {
  return state.projects;
}

export function getSearchItems(): Item[] {
  return state.items;
}

export function setSearchSnapshot(projects: Project[], items: Item[]): void {
  state.projects = projects;
  state.items = items;
}

// ------------------------------------------------------------
// LOADING (truth) + INDICATOR (presentation)
// ------------------------------------------------------------

export function isSearchLoading(): boolean {
  return state.loading;
}

export function setSearchLoading(loading: boolean): void {
  state.loading = loading;
}

export function isSearchLoadingIndicatorVisible(): boolean {
  return state.loadingIndicatorVisible;
}

export function setSearchLoadingIndicatorVisible(visible: boolean): void {
  state.loadingIndicatorVisible = visible;
}

// ------------------------------------------------------------
// ERROR
// ------------------------------------------------------------

export function getSearchError(): string | null {
  return state.error;
}

export function setSearchError(message: string | null): void {
  state.error = message;
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------

export function resetSearchState(): void {
  state.projects = [];
  state.items = [];
  state.loading = false;
  state.loadingIndicatorVisible = false;
  state.error = null;
}
