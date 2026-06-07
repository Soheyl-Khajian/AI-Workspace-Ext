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

import type { Item, ItemType } from "../../../models/item";
import { setItemsLoading } from "./itemsState";
import { loadItems } from "./loadItems";
import {
  createItem,
  deleteItem as storageDeleteItem,
  updateItem as storageUpdateItem,
} from "../../../storage";
import {
  getSelectedItemId,
  getSelectedProjectId,
  setSelectedItemId,
} from "../../core/sessionState";
import { openPanel } from "../../core/floatingUiState";

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
  load: (projectId: string) => Promise<void>;
  selectItem: (itemId: string) => void;
  create: (
    projectId: string,
    title: string,
    content: string,
    type?: ItemType,
  ) => Promise<void>;
  updateItem: (
    itemId: string,
    title?: string,
    content?: string,
  ) => Promise<void>;
  deleteItem: (itemId: string, projectId: string) => Promise<void>;
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
    setItemsLoading(true);

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
  // SELECT ITEM WORKFLOW
  // ----------------------------------------------------------

  function selectItem(itemId: string): void {
    setSelectedItemId(itemId);

    openPanel("itemDetail");

    onStateChange();
  }

  // ----------------------------------------------------------
  // CREATE ITEM WORKFLOW
  // ----------------------------------------------------------

  async function create(
    projectId: string,
    title: string,
    content: string,
    type: ItemType = "note",
  ): Promise<void> {
    // TODO: add error state for creation failures
    try {
      await createItem(projectId, type, title, content, {
        createdFrom: "manual",
      });

      await loadItems(projectId);
    } finally {
      onStateChange();
    }
  }

  // ----------------------------------------------------------
  // UPDATE ITEM WORKFLOW
  // ----------------------------------------------------------

  async function updateItem(
    itemId: string,
    title?: string,
    content?: string,
  ): Promise<void> {
    const selectedProjectId = getSelectedProjectId();
    if (selectedProjectId === null) {
      return;
    }

    // TODO: add error state for update failures
    try {
      const partialUpdate: Partial<Item> = {};
      if (title !== undefined) partialUpdate.title = title;
      if (content !== undefined) partialUpdate.content = content;

      await storageUpdateItem(itemId, partialUpdate);

      await loadItems(selectedProjectId);
    } finally {
      onStateChange();
    }
  }

  // ----------------------------------------------------------
  // DELETE ITEM WORKFLOW
  // ----------------------------------------------------------

  async function deleteItem(itemId: string, projectId: string): Promise<void> {
    const selectedItemId = getSelectedItemId();

    // TODO: add error state for delete failures
    try {
      await storageDeleteItem(itemId);

      if (selectedItemId === itemId) {
        setSelectedItemId(null);
      }

      await loadItems(projectId);
    } finally {
      onStateChange();
    }
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  return {
    load,
    selectItem,
    create,
    updateItem,
    deleteItem,
  };
}
