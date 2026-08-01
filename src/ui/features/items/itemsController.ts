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
import {
  getItems,
  setItemsLoading,
  setItemsLoadingIndicatorVisible,
} from "./itemsState";
import { loadItems } from "./loadItems";
import {
  createItem,
  deleteItem as storageDeleteItem,
  moveItemToProject as storageMoveItem,
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
import { clearCreateItemDraft, clearItemDetailDraft } from "./itemsDraftState";

import { buildContextPack } from "./buildContextPack";
import { copyToClipboard } from "../../shared/copyToClipboard";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

/*
  Waits below ~100-200ms read as "instant" — an indicator shown
  inside that window is perceived as flicker, not feedback.
*/
const LOADING_INDICATOR_DELAY_MS = 150;

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

export type ItemsController = {
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
  moveItem: (
    itemId: string,
    targetProjectId: string,
    targetProjectName: string,
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

    /*
    Delayed indicator: reveal "Loading..." only if the load is
    still running after the delay. Fast IndexedDB reads finish
    first and cancel the timer, so no loading frame ever renders
    — the flash was the frame, not the wait.
  */
    const indicatorTimer = window.setTimeout(() => {
      setItemsLoadingIndicatorVisible(true);
      onStateChange();
    }, LOADING_INDICATOR_DELAY_MS);

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
        Cancel + hide unconditionally so the indicator can never
        outlive its load. finally() guarantees this cleanup and
        the final render even if loading fails internally, so the
        UI always shows the real outcome.
      */
      window.clearTimeout(indicatorTimer);
      setItemsLoadingIndicatorVisible(false);

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

    // Success: the draft's job is done. On failure (catch above)
    // the draft is deliberately kept so the user can retry.
    clearCreateItemDraft();

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

    clearItemDetailDraft(itemId);

    await loadItems(selectedProjectId);
    onStateChange();
  }

  // ----------------------------------------------------------
  // MOVE ITEM WORKFLOW
  //
  // Exit path: stay in the source project. The item just left
  // the currently-selected project, so the detail panel's
  // subject is gone from the items snapshot - return to the
  // items list, which reloads without the moved item; the toast
  // says where it went. Unsaved detail drafts are keyed by item
  // id and deliberately survive the move (same typed-text
  // survival rule as re-renders): they wait for the user to
  // revisit the item in its new project.
  // ----------------------------------------------------------

  async function moveItem(
    itemId: string,
    targetProjectId: string,
    targetProjectName: string,
  ): Promise<void> {
    const selectedProjectId = getSelectedProjectId();
    if (selectedProjectId === null) {
      return;
    }

    try {
      await storageMoveItem(itemId, targetProjectId);
    } catch (error) {
      notify(toErrorMessage(error, "Couldn't move item."));
      return;
    }

    if (getSelectedItemId() === itemId) {
      setSelectedItemId(null);
    }

    openPanel("items");
    notify(`Moved to ${targetProjectName}`);

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

    // Deleted items must not leave orphaned drafts behind.
    clearItemDetailDraft(itemId);

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
    moveItem,
    copyContextPack,
    deleteItem,
  };
}
