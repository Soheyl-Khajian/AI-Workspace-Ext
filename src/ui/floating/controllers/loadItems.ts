// src/ui/floating/controllers/loadItems.ts
// ------------------------------------------------------------
// LOAD ITEMS WORKFLOW
// ------------------------------------------------------------
//
// Responsibility:
//
// - load items from persistent storage
// - synchronize runtime items state
// - manage loading lifecycle
// - manage error lifecycle
//
// IMPORTANT:
//
// This module is NOT:
//
// - rendering logic
// - DOM manipulation
// - IndexedDB implementation
// - UI event handling
//
// This workflow orchestrates:
//
// storage → runtime state
// ------------------------------------------------------------

import { listItemsByProject } from "../../../storage/index";

import { setItems, setItemsError, setItemsLoading } from "../state/itemsState";

// ------------------------------------------------------------
// LOAD ITEMS
// ------------------------------------------------------------
//
// Loads all items belonging to a project into runtime UI state.
//
// Lifecycle:
//
// 1. enter loading state
// 2. clear stale error state
// 3. clear stale items state
// 4. fetch latest items from storage
// 5. synchronize runtime state
// 6. exit loading state
//
// IMPORTANT:
//
// Current implementation intentionally refetches fresh data
// on every project selection.
//
// This is simple and predictable for current MVP scale.
// ------------------------------------------------------------

export async function loadItems(projectId: string): Promise<void> {
  // ----------------------------------------------------------
  // ENTER LOADING STATE
  // ----------------------------------------------------------

  setItemsLoading(true);

  /*
    Clear previous UI error before new load cycle.
  */
  setItemsError(null);

  /*
    Clear stale items immediately during loading.

    Current UX choice:
    do not preserve previous project items while loading.
  */
  setItems([]);

  try {
    // --------------------------------------------------------
    // LOAD FROM STORAGE
    // --------------------------------------------------------

    const items = await listItemsByProject(projectId);

    // --------------------------------------------------------
    // SYNCHRONIZE RUNTIME STATE
    // --------------------------------------------------------

    setItems(items);
  } catch (error: unknown) {
    // --------------------------------------------------------
    // FAILURE RECOVERY
    // --------------------------------------------------------

    /*
      Prevent stale items from remaining visible after
      failed reload.
    */
    setItems([]);

    /*
      Normalize unknown failures into UI-safe messages.
    */
    if (error instanceof Error) {
      setItemsError(error.message);
    } else {
      setItemsError("Failed to load items.");
    }
  } finally {
    // --------------------------------------------------------
    // EXIT LOADING STATE
    // --------------------------------------------------------

    setItemsLoading(false);
  }
}
