// src/ui/features/items/itemsHandlers.ts
// ------------------------------------------------------------
// ITEMS EVENT HANDLERS (FEATURE BINDINGS)
// ------------------------------------------------------------
//
// Responsibility:
//
// - own the items panel's DOM event handlers (select / toggle-selection /
//   create / update / build-context / delete)
// - own the items selector constants + dataset key
// - contribute EventBinding[] to the floating controller's
//   declarative add/remove table via createItemsHandlers()
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO direct storage access (delegates to itemsController)
// - NO rendering logic (re-renders flow through the controller's
//   onStateChange; no requestRender dep on purpose)
// - NO global DOM queries (scoped to deps.panelsEl)
// - core session state (selectedProjectId) is imported directly;
//   sibling-feature state (projects) is NOT — the project-name
//   lookup is injected via deps.resolveProjectName to keep the
//   items feature decoupled from projectsState
// - listener lifecycle is owned by the CALLER (register + teardown)
// ------------------------------------------------------------

import type { EventBinding } from "../../core/eventBindings";
import type { ItemsController } from "./itemsController";
import { asListener } from "../../core/eventBindings";
import { getSelectedProjectId } from "../../core/sessionState";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const ITEM_ROW_SELECTOR = ".aiw-item-row";
const ITEM_SELECT_SELECTOR = ".aiw-item-select";
const ITEM_DELETE_SELECTOR = ".aiw-item-delete";
const ITEM_ID_DATASET_KEY = "itemId";

const ITEM_CREATE_BUTTON_SELECTOR = ".aiw-create-item-submit";
const ITEM_CREATE_TITLE_SELECTOR = ".aiw-create-item-title";
const ITEM_CREATE_CONTENT_SELECTOR = ".aiw-create-item-content";

const ITEM_DETAIL_SAVE_SELECTOR = ".aiw-item-detail-save";
const ITEM_DETAIL_TITLE_SELECTOR = ".aiw-item-detail-title";
const ITEM_DETAIL_CONTENT_SELECTOR = ".aiw-item-detail-content";

const ITEM_BUILD_CONTEXT_SELECTOR = ".aiw-build-context";

type ItemsHandlersDependencies = {
  panelsEl: HTMLElement;
  itemsController: ItemsController;
  notify: (message: string) => void;
  resolveProjectName: (projectId: string) => string;
};

export function createItemsHandlers(
  deps: ItemsHandlersDependencies,
): EventBinding[] {
  // ----------------------------------------------------------
  // ITEM SELECTION HANDLER
  // ----------------------------------------------------------

  function handleSelectItem(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest(ITEM_SELECT_SELECTOR)) return;
    if (target.closest(ITEM_DELETE_SELECTOR)) return;

    const row = target.closest(ITEM_ROW_SELECTOR);
    if (!(row instanceof HTMLElement)) {
      return;
    }

    const itemId = row.dataset[ITEM_ID_DATASET_KEY];
    if (!itemId) {
      return;
    }

    deps.itemsController.selectItem(itemId);
  }

  function handleToggleItemSelection(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const checkBox = target.closest(ITEM_SELECT_SELECTOR);
    if (!(checkBox instanceof HTMLInputElement)) {
      return;
    }

    const itemId = checkBox.dataset[ITEM_ID_DATASET_KEY];
    if (!itemId) {
      return;
    }

    deps.itemsController.toggleSelection(itemId);
  }

  // ----------------------------------------------------------
  // ITEM CREATION HANDLER
  // ----------------------------------------------------------

  async function handleCreateItem(event: MouseEvent): Promise<void> {
    const selectedProjectId = getSelectedProjectId();
    if (selectedProjectId === null) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const submitButton = target.closest(ITEM_CREATE_BUTTON_SELECTOR);
    if (!(submitButton instanceof HTMLButtonElement)) {
      return;
    }

    const titleInput = deps.panelsEl.querySelector(ITEM_CREATE_TITLE_SELECTOR);
    const contentInput = deps.panelsEl.querySelector(
      ITEM_CREATE_CONTENT_SELECTOR,
    );
    if (
      !(titleInput instanceof HTMLInputElement) ||
      !(contentInput instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    const trimmedItemTitle = titleInput.value.trim();
    const itemContent = contentInput.value;
    if (trimmedItemTitle.length === 0 && itemContent.trim().length === 0) {
      deps.notify("Add a title or some content");
      return;
    }

    await deps.itemsController.create(
      selectedProjectId,
      trimmedItemTitle,
      itemContent,
    );
  }

  // ----------------------------------------------------------
  // ITEM UPDATE HANDLER
  // ----------------------------------------------------------

  async function handleUpdateItem(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const saveButton = target.closest(ITEM_DETAIL_SAVE_SELECTOR);
    if (!(saveButton instanceof HTMLButtonElement)) {
      return;
    }

    const itemId = saveButton.dataset[ITEM_ID_DATASET_KEY];
    if (!itemId) {
      return;
    }

    const titleInput = deps.panelsEl.querySelector(ITEM_DETAIL_TITLE_SELECTOR);
    if (!(titleInput instanceof HTMLInputElement)) {
      return;
    }

    const contentInput = deps.panelsEl.querySelector(
      ITEM_DETAIL_CONTENT_SELECTOR,
    );
    if (!(contentInput instanceof HTMLTextAreaElement)) {
      return;
    }

    const trimmedItemTitle = titleInput.value.trim();
    const itemContent = contentInput.value;
    if (trimmedItemTitle.length === 0 && itemContent.trim().length === 0) {
      deps.notify("Add a title or some content");
      return;
    }

    await deps.itemsController.updateItem(
      itemId,
      trimmedItemTitle,
      itemContent,
    );
  }

  // ----------------------------------------------------------
  // BUILD CONTEXT HANDLER
  // ----------------------------------------------------------
  async function handleBuildContext(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const buildButton = target.closest(ITEM_BUILD_CONTEXT_SELECTOR);
    if (!(buildButton instanceof HTMLButtonElement)) {
      return;
    }

    const selectedProjectId = getSelectedProjectId();
    if (selectedProjectId === null) {
      return;
    }

    const projectName = deps.resolveProjectName(selectedProjectId);

    await deps.itemsController.copyContextPack(projectName);
  }

  // ----------------------------------------------------------
  // ITEM DELETE HANDLER
  // ----------------------------------------------------------

  async function handleDeleteItem(event: MouseEvent): Promise<void> {
    const selectedProjectId = getSelectedProjectId();
    if (selectedProjectId === null) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const deleteButton = target.closest(ITEM_DELETE_SELECTOR);
    if (!(deleteButton instanceof HTMLElement)) {
      return;
    }

    const itemId = deleteButton.dataset[ITEM_ID_DATASET_KEY];
    if (!itemId) {
      return;
    }

    if (!window.confirm("Delete this item?")) return;

    await deps.itemsController.deleteItem(itemId, selectedProjectId);
  }

  // ----------------------------------------------------------
  // EVENT BINDINGS
  // ----------------------------------------------------------

  const eventBindings: EventBinding[] = [
    [deps.panelsEl, "click", asListener(handleSelectItem)],
    [deps.panelsEl, "click", asListener(handleToggleItemSelection)],
    [deps.panelsEl, "click", asListener(handleCreateItem)],
    [deps.panelsEl, "click", asListener(handleUpdateItem)],
    [deps.panelsEl, "click", asListener(handleBuildContext)],
    [deps.panelsEl, "click", asListener(handleDeleteItem)],
  ];

  return eventBindings;
}
