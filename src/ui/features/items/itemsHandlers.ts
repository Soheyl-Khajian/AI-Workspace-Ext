// src/ui/features/items/itemsHandlers.ts
// ------------------------------------------------------------
// ITEMS EVENT HANDLERS (FEATURE BINDINGS)
// ------------------------------------------------------------
//
// Responsibility:
//
// - own the items panel's DOM event handlers (select / toggle-selection /
//   create / update / row menu / move / build-context / delete /
//   draft capture)
// - own the items selector constants + dataset key
// - contribute EventBinding[] to the floating controller's
//   declarative add/remove table via createItemsHandlers()
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO direct storage access (delegates to itemsController)
// - NO rendering logic (data re-renders flow through the
//   controller's onStateChange; deps.requestRender exists ONLY for
//   row-menu state flips, which never touch the controller)
// - NO global DOM queries (scoped to deps.panelsEl)
// - core session state (selectedProjectId) is imported directly;
//   sibling-feature state (projects) is NOT — the project-name
//   lookup is injected via deps.resolveProjectName to keep the
//   items feature decoupled from projectsState (same rule for
//   deps.hasActiveInlineEdit vs projectsRenameState)
// - listener lifecycle is owned by the CALLER (register + teardown)
// ------------------------------------------------------------

import type { EventBinding } from "../../core/eventBindings";
import type { ItemsController } from "./itemsController";
import { asListener } from "../../core/eventBindings";
import {
  getSelectedProjectId,
  getSelectedItemId,
} from "../../core/sessionState";
import {
  setCreateItemContentDraft,
  setCreateItemTitleDraft,
  setItemDetailContentDraft,
  setItemDetailTitleDraft,
} from "./itemsDraftState";
import { setItemsListScrollTop } from "./itemsState";
import {
  closeItemMenu,
  getOpenItemMenu,
  openItemMenu,
  showItemMenuMovePicker,
} from "./itemsMenuState";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const ITEM_ROW_SELECTOR = ".aiw-item-row";
const ITEM_SELECT_SELECTOR = ".aiw-item-select";
const ITEM_ID_DATASET_KEY = "itemId";
const PROJECT_ID_DATASET_KEY = "projectId";

// Shared row-menu classes (see panels/menus.css) + items-owned
// menu item hooks
const ROW_MENU_TRIGGER_SELECTOR = ".aiw-row-menu-trigger";
const ROW_MENU_SELECTOR = ".aiw-row-menu";
const ITEM_MENU_MOVE_SELECTOR = ".aiw-item-menu-move";
const ITEM_MENU_MOVE_TARGET_SELECTOR = ".aiw-item-menu-move-target";
const ITEM_MENU_DELETE_SELECTOR = ".aiw-item-menu-delete";

const ITEM_CREATE_BUTTON_SELECTOR = ".aiw-create-item-submit";
const ITEM_CREATE_TITLE_SELECTOR = ".aiw-create-item-title";
const ITEM_CREATE_CONTENT_SELECTOR = ".aiw-create-item-content";

const ITEM_DETAIL_SAVE_SELECTOR = ".aiw-item-detail-save";
const ITEM_DETAIL_TITLE_SELECTOR = ".aiw-item-detail-title";
const ITEM_DETAIL_CONTENT_SELECTOR = ".aiw-item-detail-content";
const ITEM_DETAIL_PROJECT_SELECT_SELECTOR = ".aiw-item-detail-project-select";

const ITEM_BUILD_CONTEXT_SELECTOR = ".aiw-build-context";

const ITEMS_LIST_SCROLL_SELECTOR = ".aiw-items-list-scroll";

type ItemsHandlersDependencies = {
  panelsEl: HTMLElement;
  itemsController: ItemsController;
  notify: (message: string) => void;
  resolveProjectName: (projectId: string) => string;
  requestRender: () => void;
  hasActiveInlineEdit: () => boolean;
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
    if (target.closest(ROW_MENU_TRIGGER_SELECTOR)) return;
    if (target.closest(ROW_MENU_SELECTOR)) return;

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
  // ITEM MOVE HANDLER
  //
  // The project select IS the move control. A native "change"
  // event only fires when the committed value actually differs,
  // so a same-target "move" can never reach the controller from
  // here (the storage door would no-op it anyway).
  // ----------------------------------------------------------

  async function handleMoveItem(event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    if (!target.matches(ITEM_DETAIL_PROJECT_SELECT_SELECTOR)) {
      return;
    }

    const itemId = target.dataset[ITEM_ID_DATASET_KEY];
    if (!itemId) {
      return;
    }

    const targetProjectId = target.value;
    const targetProjectName = deps.resolveProjectName(targetProjectId);

    await deps.itemsController.moveItem(
      itemId,
      targetProjectId,
      targetProjectName,
    );
  }

  // ----------------------------------------------------------
  // ROW MENU HANDLERS (state-driven, projected by the renderer)
  //
  // Same contract as the projects row menu; the one addition is
  // the two-page morph: "Move to…" swaps the menu's page to the
  // move picker IN PLACE (the menu stays open), and picking a
  // target closes the menu and delegates to the existing move
  // workflow (controller → storage door → toast).
  // ----------------------------------------------------------

  function handleItemMenuToggle(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const trigger = target.closest(ROW_MENU_TRIGGER_SELECTOR);
    if (!(trigger instanceof HTMLButtonElement)) {
      return;
    }

    const itemId = trigger.dataset[ITEM_ID_DATASET_KEY];
    if (!itemId) {
      return;
    }

    // No menus while an inline edit is active (locked v0.5 rule).
    // The edit lives in a SIBLING feature (projects rename), so
    // the predicate is injected — items must not import
    // projectsRenameState.
    if (deps.hasActiveInlineEdit()) {
      return;
    }

    // Same trigger toggles closed; another row's trigger replaces
    // (last write wins, and openItemMenu always lands on root).
    if (getOpenItemMenu()?.itemId === itemId) {
      closeItemMenu();
    } else {
      openItemMenu(itemId);
    }

    deps.requestRender();
  }

  /*
  In-panel dismissal — same rule as the projects menu: any click
  that is neither the trigger nor inside the menu closes the menu
  and still performs its normal job (no click-eating veil).
*/
  function handleItemMenuDismiss(event: MouseEvent): void {
    if (getOpenItemMenu() === null) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest(ROW_MENU_TRIGGER_SELECTOR)) return;
    if (target.closest(ROW_MENU_SELECTOR)) return;

    closeItemMenu();
    deps.requestRender();
  }

  function handleItemMenuShowMovePicker(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const moveButton = target.closest(ITEM_MENU_MOVE_SELECTOR);
    if (!(moveButton instanceof HTMLButtonElement)) {
      return;
    }

    // The state door is a guarded no-op when no menu is open, but
    // this button only exists inside an open menu, so it always
    // morphs here.
    showItemMenuMovePicker();
    deps.requestRender();
  }

  async function handleItemMenuMoveTarget(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const targetButton = target.closest(ITEM_MENU_MOVE_TARGET_SELECTOR);
    if (!(targetButton instanceof HTMLButtonElement)) {
      return;
    }

    const itemId = targetButton.dataset[ITEM_ID_DATASET_KEY];
    if (!itemId) {
      return;
    }

    const targetProjectId = targetButton.dataset[PROJECT_ID_DATASET_KEY];
    if (!targetProjectId) {
      return;
    }

    // Picking a target ends the menu's job; the move workflow
    // owns everything after this line, including the re-render
    // through the controller's onStateChange.
    closeItemMenu();

    await deps.itemsController.moveItem(
      itemId,
      targetProjectId,
      deps.resolveProjectName(targetProjectId),
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

    const deleteMenuItem = target.closest(ITEM_MENU_DELETE_SELECTOR);
    if (!(deleteMenuItem instanceof HTMLElement)) {
      return;
    }

    const itemId = deleteMenuItem.dataset[ITEM_ID_DATASET_KEY];
    if (!itemId) {
      return;
    }

    // Close the menu (and re-render) BEFORE the blocking confirm:
    // a cancelled confirm must not leave the menu open.
    closeItemMenu();
    deps.requestRender();

    if (!window.confirm("Delete this item?")) return;

    await deps.itemsController.deleteItem(itemId, selectedProjectId);
  }

  // ----------------------------------------------------------
  // DRAFT CAPTURE HANDLERS (typed-text survival)
  //
  // Write every keystroke into draft state WITHOUT requesting a
  // re-render: the DOM already shows the text, and re-rendering
  // would rebuild the input and move the cursor. Renderers
  // re-hydrate inputs from draft state after wipe-rebuilds.
  // ----------------------------------------------------------

  function handleCreateItemInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      target.matches(ITEM_CREATE_TITLE_SELECTOR)
    ) {
      setCreateItemTitleDraft(target.value);
      return;
    }

    if (
      target instanceof HTMLTextAreaElement &&
      target.matches(ITEM_CREATE_CONTENT_SELECTOR)
    ) {
      setCreateItemContentDraft(target.value);
    }
  }

  function handleItemDetailInput(event: Event): void {
    const selectedItemId = getSelectedItemId();
    if (selectedItemId === null) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      target.matches(ITEM_DETAIL_TITLE_SELECTOR)
    ) {
      setItemDetailTitleDraft(selectedItemId, target.value);
      return;
    }

    if (
      target instanceof HTMLTextAreaElement &&
      target.matches(ITEM_DETAIL_CONTENT_SELECTOR)
    ) {
      setItemDetailContentDraft(selectedItemId, target.value);
    }
  }

  // ----------------------------------------------------------
  // LIST SCROLL CAPTURE HANDLER
  // ----------------------------------------------------------

  /*
    Captures the list column's scroll position so the renderer can
    restore it after wipe-rebuild renders. Registered with capture
    (the binding's 4th slot): "scroll" does not bubble, so the
    delegated listener on panelsEl only sees it during the capture
    phase. State write only — no controller call, no re-render.
  */
  function handleItemsListScroll(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (!target.matches(ITEMS_LIST_SCROLL_SELECTOR)) {
      return;
    }

    setItemsListScrollTop(target.scrollTop);
  }

  // ----------------------------------------------------------
  // EVENT BINDINGS
  // ----------------------------------------------------------

  const eventBindings: EventBinding[] = [
    [deps.panelsEl, "click", asListener(handleSelectItem)],
    [deps.panelsEl, "click", asListener(handleToggleItemSelection)],
    [deps.panelsEl, "click", asListener(handleItemMenuToggle)],
    [deps.panelsEl, "click", asListener(handleItemMenuDismiss)],
    [deps.panelsEl, "click", asListener(handleItemMenuShowMovePicker)],
    [deps.panelsEl, "click", asListener(handleItemMenuMoveTarget)],
    [deps.panelsEl, "click", asListener(handleCreateItem)],
    [deps.panelsEl, "click", asListener(handleUpdateItem)],
    [deps.panelsEl, "click", asListener(handleBuildContext)],
    [deps.panelsEl, "click", asListener(handleDeleteItem)],
    [deps.panelsEl, "change", asListener(handleMoveItem)],
    [deps.panelsEl, "input", asListener(handleCreateItemInput)],
    [deps.panelsEl, "input", asListener(handleItemDetailInput)],

    /*
      No asListener: the handler already takes a plain Event. The
      4th slot registers it in the CAPTURE phase (scroll does not
      bubble up to panelsEl).
    */
    [deps.panelsEl, "scroll", handleItemsListScroll, true],
  ];

  return eventBindings;
}
