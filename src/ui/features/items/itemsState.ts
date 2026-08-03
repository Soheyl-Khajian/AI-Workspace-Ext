// src/ui/features/items/itemsState.ts
// ------------------------------------------------------------
// ITEMS RUNTIME STATE
// ------------------------------------------------------------
//
// Responsibility:
// - hold runtime items state in memory
// - expose controlled getters
// - expose controlled mutations
// - isolate render state from persistent storage
//
// IMPORTANT:
//
// This module is NOT:
//
// - IndexedDB storage
// - repository layer
// - async loading logic
// - rendering logic
// - DOM manipulation
// - business orchestration
//
// This module ONLY answers:
//
// "What is the current items UI state?"
// ------------------------------------------------------------

import type { Item } from "../../../models/item";

// ------------------------------------------------------------
// STATE SHAPE
// ------------------------------------------------------------
//
// Represents runtime UI state for items.
//
// IMPORTANT:
//
// - Runtime-only memory state
// - NOT persistent storage
// - Represents currently loaded items for the
//   currently selected project
// ------------------------------------------------------------

type ItemsState = {
  items: Item[];
  loading: boolean;
  loadingIndicatorVisible: boolean;
  error: string | null;
  listScrollTop: number;
};

// ------------------------------------------------------------
// PRIVATE STATE
// ------------------------------------------------------------
//
// Internal mutable runtime state.
//
// Must NEVER be mutated outside this module.
// ------------------------------------------------------------

const state: ItemsState = {
  items: [],
  loading: false,
  loadingIndicatorVisible: false,
  error: null,
  listScrollTop: 0,
};

// ------------------------------------------------------------
// GETTERS
// ------------------------------------------------------------
//
// Read-only access to runtime state.
//
// IMPORTANT:
//
// Getters should avoid leaking mutable references.
// ------------------------------------------------------------

export function getItems(): Item[] {
  return [...state.items];
}

export function hasItems(): boolean {
  return state.items.length > 0;
}

export function isItemsLoading(): boolean {
  return state.loading;
}

/*
  loading is the TRUTH ("a load is running").
  loadingIndicatorVisible is PRESENTATION ("running long enough
  to be worth showing") — flipped by the controller's delay timer
  so fast loads never render a loading frame.
*/
export function isItemsLoadingIndicatorVisible(): boolean {
  return state.loadingIndicatorVisible;
}

export function getItemsError(): string | null {
  return state.error;
}

/*
  listScrollTop is presentation state for the wipe-rebuild render
  strategy: the scroll handler captures the list column's position on
  every scroll event, and the renderer restores it after each rebuild.
  Without it, any re-render (checkbox toggle, save, delete) silently
  resets the list column to the top.
*/
export function getItemsListScrollTop(): number {
  return state.listScrollTop;
}

// ------------------------------------------------------------
// MUTATIONS
// ------------------------------------------------------------
//
// Controlled state mutations.
//
// IMPORTANT:
//
// State mutations should preserve ownership boundaries
// and avoid external reference leaks.
// ------------------------------------------------------------

export function setItems(itemsList: Item[]): void {
  state.items = [...itemsList];
}

export function setItemsLoading(loading: boolean): void {
  state.loading = loading;
}

export function setItemsLoadingIndicatorVisible(visible: boolean): void {
  state.loadingIndicatorVisible = visible;
}

export function setItemsError(error: string | null): void {
  state.error = error;
}

export function setItemsListScrollTop(scrollTop: number): void {
  state.listScrollTop = scrollTop;
}

/*
  Clears currently loaded items while preserving
  surrounding runtime state.

  Useful before:
  - switching selected project
  - starting fresh loading cycles
  - preventing stale UI snapshots
*/
export function clearItems(): void {
  state.items = [];
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------
//
// Restores initial runtime state.
//
// Useful for:
// - teardown
// - testing
// - future session resets
// ------------------------------------------------------------

export function resetItemsState(): void {
  state.items = [];
  state.loading = false;
  state.loadingIndicatorVisible = false;
  state.error = null;
  state.listScrollTop = 0;
}
