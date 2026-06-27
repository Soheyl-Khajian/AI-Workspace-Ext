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
import { getItems, setItemsLoading } from "./itemsState";
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
import { toErrorMessage } from "../../shared/toErrorMessage";
import {
  clearItemSelection,
  getSelectedItemIds,
  toggleItemSelection,
} from "./itemSelectionState";

import { buildContextPack } from "./buildContextPack";
import { copyToClipboard } from "../../shared/copyToClipboard";

// ------------------------------------------------------------
// DEPENDENCIES
// ------------------------------------------------------------

type ItemsControllerDependencies = {
  onStateChange: () => void;
  notify: (message: string) => void;
};

// ------------------------------------------------------------
// PUBLIC CONTROLLER API
// ------------------------------------------------------------

type ItemsController = {
  load: (projectId: string) => Promise<void>;
  selectItem: (itemId: string) => void;
  toggleSelection: (itemId: string) => void;
  clearSelection: () => void;
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
  copyContextPack: (projectName: string) => Promise<void>;
  deleteItem: (itemId: string, projectId: string) => Promise<void>;
};

// ------------------------------------------------------------
// CONTROLLER FACTORY
// ------------------------------------------------------------

export function createItemsController(
  dependencies: ItemsControllerDependencies,
): ItemsController {
  const { onStateChange, notify } = dependencies;

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
  // TOGGLE ITEM SELECTION WORKFLOW
  // ----------------------------------------------------------

  function toggleSelection(itemId: string): void {
    toggleItemSelection(itemId);

    onStateChange();
  }

  // ----------------------------------------------------------
  // CLEAR ITEM SELECTION WORKFLOW
  // ----------------------------------------------------------

  function clearSelection(): void {
    clearItemSelection();
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
    try {
      await createItem(projectId, type, title, content, {
        createdFrom: "manual",
      });
    } catch (error) {
      notify(toErrorMessage(error, "Couldn't create item."));
      return;
    }
    await loadItems(projectId);
    onStateChange();
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
    const partialUpdate: Partial<Item> = {};
    if (title !== undefined) partialUpdate.title = title;
    if (content !== undefined) partialUpdate.content = content;
    try {
      await storageUpdateItem(itemId, partialUpdate);
    } catch (error) {
      notify(toErrorMessage(error, "Couldn't save item."));
      return;
    }
    await loadItems(selectedProjectId);
    onStateChange();
  }

  // ----------------------------------------------------------
  // BUILD CONTEXT PACK WORKFLOW
  // ----------------------------------------------------------
  async function copyContextPack(projectName: string): Promise<void> {
    const selectedIds = getSelectedItemIds();
    if (selectedIds.length === 0) {
      notify("Select at least one item");
      return;
    }

    // Resolve IDs against the loaded items; this also drops any stale
    // selected IDs that are no longer present.
    const selectedIdSet = new Set(selectedIds);
    const selectedItems = getItems().filter((item) =>
      selectedIdSet.has(item.id),
    );

    if (selectedItems.length === 0) {
      notify("Select at least one item");
      return;
    }

    const contextPack = buildContextPack(projectName, selectedItems);

    const copied = await copyToClipboard(contextPack);

    notify(
      copied
        ? "Context pack copied to clipboard"
        : "Couldn't copy to clipboard",
    );
  }

  // ----------------------------------------------------------
  // DELETE ITEM WORKFLOW
  // ----------------------------------------------------------

  async function deleteItem(itemId: string, projectId: string): Promise<void> {
    const selectedItemId = getSelectedItemId();
    try {
      await storageDeleteItem(itemId);
    } catch (error) {
      notify(toErrorMessage(error, "Couldn't delete item."));
      return;
    }
    if (selectedItemId === itemId) {
      setSelectedItemId(null);
    }
    await loadItems(projectId);
    onStateChange();
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  return {
    load,
    selectItem,
    toggleSelection,
    clearSelection,
    create,
    updateItem,
    copyContextPack,
    deleteItem,
  };
}
