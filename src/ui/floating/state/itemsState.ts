// src/ui/floating/state/itemsState.ts
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
  /*
    Current in-memory items snapshot.
  */
  items: Item[];

  /*
    Indicates active async loading lifecycle.
  */
  loading: boolean;

  /*
    Human-readable runtime error state.
  */
  error: string | null;
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
  error: null,
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

export function getItemsError(): string | null {
  return state.error;
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

export function setItemsError(error: string | null): void {
  state.error = error;
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
  state.error = null;
}
