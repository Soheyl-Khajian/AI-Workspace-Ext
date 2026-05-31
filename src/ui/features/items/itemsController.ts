// src/ui/features/items/itemsController.ts
// ------------------------------------------------------------
// ITEMS CONTROLLER (FEATURE ORCHESTRATOR)
// ------------------------------------------------------------
//
// Responsibility:
//
// - orchestrate items feature lifecycle
// - coordinate async items loading workflows
// - synchronize selected project → items runtime state
// - trigger UI refresh cycles after state changes
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO DOM access
// - NO rendering logic
// - NO IndexedDB implementation logic
// - NO repository implementation details
// - NO direct UI ownership
//
// This layer ONLY coordinates systems.
//
// Data flow:
//
// selectedProjectId
//        ↓
// itemsController.load(projectId)
//        ↓
// loadItems()
//        ↓
// itemsState
//        ↓
// renderer re-reads state
// ------------------------------------------------------------

import { loadItems } from "./loadItems";

// ------------------------------------------------------------
// DEPENDENCIES
// ------------------------------------------------------------

type ItemsControllerDependencies = {
  /*
    Callback provided by parent UI controller.

    Used to trigger a complete UI render cycle
    after runtime state changes.
  */
  onStateChange: () => void;
};

// ------------------------------------------------------------
// PUBLIC CONTROLLER API
// ------------------------------------------------------------

type ItemsController = {
  /*
    Starts items loading workflow for a project.

    Flow:

    1. trigger immediate render
       (allows loading state to appear)

    2. execute async loadItems()

    3. trigger final render after async completion

    UI may reflect:
    - loading state
    - loaded items
    - empty state
    - error state
  */
  load: (projectId: string) => Promise<void>;
};

// ------------------------------------------------------------
// CONTROLLER FACTORY
// ------------------------------------------------------------

export function createItemsController(
  dependencies: ItemsControllerDependencies,
): ItemsController {
  const { onStateChange } = dependencies;

  // ----------------------------------------------------------
  // LOAD ITEMS WORKFLOW
  // ----------------------------------------------------------

  async function load(projectId: string): Promise<void> {
    /*
      Immediate render allows UI to reflect loading state
      before async work completes.

      This depends on loadItems() synchronously mutating:
      - setItemsLoading(true)
    */
    onStateChange();

    try {
      /*
        Execute async loading workflow.

        loadItems() is responsible for:
        - loading state mutation
        - error state mutation
        - items state mutation
      */
      await loadItems(projectId);
    } finally {
      /*
        Always trigger final UI refresh after async lifecycle.

        finally() guarantees render consistency even if
        loading fails internally.
      */
      onStateChange();
    }
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  return {
    load,
  };
}
