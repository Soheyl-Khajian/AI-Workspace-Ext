// src/ui/core/floatingController.ts
// ------------------------------------------------------------
// FLOATING UI CONTROLLER
//
// Responsibility:
// - initialize floating UI systems
// - wire UI events to state mutations
// - synchronize state → visual rendering
// - manage controller lifecycle
//
// IMPORTANT:
// - owns event listeners
// - coordinates render flow
// - may orchestrate state modules
//
// NOT RESPONSIBLE FOR:
// - DOM creation details
// - rendering implementation
// - business logic
// - persistent storage
// ------------------------------------------------------------

import { createFloatingDom } from "./floatingDom";
import { handleOrbAction } from "./orbActionRouter";
import type { OrbActionContext } from "./orbActionRouter";
import { getOrbActions } from "./orbActions";
import type { OrbActionId } from "./types";
import type { OrbPanelId } from "./types";
import { renderOrbActions } from "./renderOrbActions";
import { renderFloatingPanels } from "./renderFloatingPanels";
import {
  collapseOrb,
  expandOrb,
  getActivePanel,
  isOrbExpanded,
  openPanel,
  togglePanel,
} from "./floatingUiState";
import { createProjectsController } from "../features/projects/projectsController";
import { createItemsController } from "../features/items/itemsController";
import { setSelectedItemId, getSelectedProjectId } from "./sessionState";

// ------------------------------------------------------------
// SHARED CONSTANTS (temporary scope; can later relocate)
// ------------------------------------------------------------

const PANEL_BACK_BUTTON_SELECTOR = ".aiw-panel-back-button";

const PROJECT_ROW_SELECTOR = ".aiw-project-row";
const PROJECT_DELETE_SELECTOR = ".aiw-project-delete";
const PROJECT_ID_DATASET_KEY = "projectId";
const PROJECT_CREATE_BUTTON_SELECTOR = ".aiw-create-project-submit";
const PROJECT_RENAME_SELECTOR = ".aiw-project-rename";

const ITEM_ROW_SELECTOR = ".aiw-item-row";
const ITEM_DELETE_SELECTOR = ".aiw-item-delete";
const ITEM_ID_DATASET_KEY = "itemId";
const ITEM_CREATE_BUTTON_SELECTOR = ".aiw-create-item-submit";
const ITEM_DETAIL_SAVE_SELECTOR = ".aiw-item-detail-save";

export function initFloatingController(rootEl: HTMLElement): () => void {
  const dom = createFloatingDom(rootEl);

  const itemsController = createItemsController({ onStateChange: renderUi });

  const projectsController = createProjectsController({
    onStateChange: renderUi,
    itemsController,
  });

  const actionsContext = createOrbActionContext();

  renderUi();
  void projectsController.load();

  // ----------------------------------------------------------
  // OUTSIDE CLICK HANDLING (collapse behavior)
  // ----------------------------------------------------------

  function handleDocumentPointerDown(event: PointerEvent): void {
    const activeProjectRenameInput = dom.orbPanelsEl.querySelector(
      ".aiw-project-rename-input",
    );
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    const clickedInsideFloatingUi = rootEl.contains(target);

    if (clickedInsideFloatingUi) {
      return;
    }

    if (activeProjectRenameInput instanceof HTMLInputElement) {
      return;
    }

    setOrbCollapsed();
  }

  // ----------------------------------------------------------
  // ORB STATE HELPERS
  // ----------------------------------------------------------

  function setOrbExpanded(): void {
    expandOrb();
    renderUi();
  }

  function setOrbCollapsed(): void {
    collapseOrb();
    renderUi();
  }

  function toggleOrbVisibility(): void {
    const expanded = isOrbExpanded();

    if (expanded) {
      setOrbCollapsed();
    } else {
      setOrbExpanded();
    }
  }

  function toggleFloatingPanel(panelId: OrbActionId): void {
    togglePanel(panelId);
    renderUi();
  }

  function createOrbActionContext(): OrbActionContext {
    return { togglePanel: toggleFloatingPanel };
  }

  function handleOrbActionClick(actionId: OrbActionId): void {
    handleOrbAction(actionId, actionsContext);
  }

  // ----------------------------------------------------------
  // PROJECT SELECTION HANDLER
  // ----------------------------------------------------------

  function handleSelectProject(event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest(PROJECT_RENAME_SELECTOR)) return;
    if (target.closest(PROJECT_DELETE_SELECTOR)) return;
    if (target.closest(".aiw-project-rename-input")) return;

    const row = target.closest(PROJECT_ROW_SELECTOR);

    if (!(row instanceof HTMLElement)) {
      return;
    }

    const projectId = row.dataset[PROJECT_ID_DATASET_KEY];

    if (!projectId) {
      return;
    }

    projectsController.selectProject(projectId);
  }

  // ----------------------------------------------------------
  // PROJECT CREATION HANDLER
  // ----------------------------------------------------------

  async function handleCreateProject(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const submitButton = target.closest(PROJECT_CREATE_BUTTON_SELECTOR);
    if (!(submitButton instanceof HTMLButtonElement)) {
      return;
    }

    const input = dom.orbPanelsEl.querySelector(".aiw-create-project-input");
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const trimmedNewProjectName = input.value.trim();
    if (trimmedNewProjectName.length === 0) {
      return;
    }

    await projectsController.create(trimmedNewProjectName);
  }

  // ----------------------------------------------------------
  // PROJECT RENAME HANDLER
  // ----------------------------------------------------------

  function handleRenameProject(event: MouseEvent): void {
    let committed = false;

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const renameButton = target.closest(PROJECT_RENAME_SELECTOR);
    if (!(renameButton instanceof HTMLButtonElement)) {
      return;
    }

    const projectId = renameButton.dataset[PROJECT_ID_DATASET_KEY];
    if (!projectId) {
      return;
    }

    const row = renameButton.closest(PROJECT_ROW_SELECTOR);
    if (!(row instanceof HTMLElement)) {
      return;
    }

    const span = row.querySelector(".aiw-project-text");
    if (!(span instanceof HTMLSpanElement)) {
      return;
    }

    const currentName = span.textContent ?? "";

    const renameInputEl = document.createElement("input");
    renameInputEl.value = currentName;
    renameInputEl.className = "aiw-project-rename-input";

    span.replaceWith(renameInputEl);

    renameInputEl.focus();
    renameInputEl.select();

    renameInputEl.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        committed = true;
        const trimmedValue = renameInputEl.value.trim();
        if (trimmedValue) {
          await projectsController.renameProject(projectId, trimmedValue);
        } else {
          renderUi();
        }
      }

      if (event.key === "Escape") {
        committed = true;
        renderUi();
      }
    });

    renameInputEl.addEventListener("blur", async () => {
      if (committed) return;
      const trimmedValue = renameInputEl.value.trim();
      if (trimmedValue && trimmedValue !== currentName) {
        await projectsController.renameProject(projectId, trimmedValue);
      } else {
        renderUi();
      }
    });
  }

  // ----------------------------------------------------------
  // PROJECT DELETE HANDLER
  // ----------------------------------------------------------

  async function handleDeleteProject(event: MouseEvent): Promise<void> {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const deleteButton = target.closest(PROJECT_DELETE_SELECTOR);
    if (!(deleteButton instanceof HTMLElement)) {
      return;
    }

    const projectId = deleteButton.dataset[PROJECT_ID_DATASET_KEY];
    if (!projectId) {
      return;
    }

    if (!window.confirm("Delete this project and all its items?")) return;

    await projectsController.deleteProject(projectId);
  }

  // ----------------------------------------------------------
  // ITEM SELECTION HANDLER
  // ----------------------------------------------------------

  function handleSelectItem(event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest(ITEM_DELETE_SELECTOR)) return;

    const row = target.closest(ITEM_ROW_SELECTOR);
    if (!(row instanceof HTMLElement)) {
      return;
    }

    const itemId = row.dataset[ITEM_ID_DATASET_KEY];

    if (!itemId) {
      return;
    }

    itemsController.selectItem(itemId);
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

    const titleInput = dom.orbPanelsEl.querySelector(".aiw-create-item-title");
    const contentInput = dom.orbPanelsEl.querySelector(
      ".aiw-create-item-content",
    );
    if (
      !(titleInput instanceof HTMLInputElement) ||
      !(contentInput instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    const trimmedItemTitle = titleInput.value.trim();
    if (trimmedItemTitle.length === 0) {
      return;
    }

    await itemsController.create(
      selectedProjectId,
      trimmedItemTitle,
      contentInput.value,
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

    const titleInput = dom.orbPanelsEl.querySelector(".aiw-item-detail-title");
    if (!(titleInput instanceof HTMLInputElement)) {
      return;
    }

    const contentInput = dom.orbPanelsEl.querySelector(
      ".aiw-item-detail-content",
    );
    if (!(contentInput instanceof HTMLTextAreaElement)) {
      return;
    }

    const trimmedItemTitle = titleInput.value.trim();
    if (trimmedItemTitle.length === 0) {
      return;
    }

    await itemsController.updateItem(
      itemId,
      trimmedItemTitle,
      contentInput.value,
    );
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

    await itemsController.deleteItem(itemId, selectedProjectId);
  }

  // ----------------------------------------------------------
  // BACK BUTTON HANDLER
  // ----------------------------------------------------------

  function handleBackButtonClick(event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const backButton = target.closest(PANEL_BACK_BUTTON_SELECTOR);

    if (!(backButton instanceof HTMLElement)) {
      return;
    }

    const currentPanel = getActivePanel();
    if (currentPanel === "itemDetail") {
      openPanel("items");
    } else {
      openPanel("projects");
    }

    setSelectedItemId(null);
    renderUi();
  }

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  function renderUi(): void {
    console.count("renderUi");
    const expanded = isOrbExpanded();
    const orbActions = getOrbActions();

    dom.rootEl.dataset.orbExpanded = String(expanded);

    renderOrbActions(
      dom.orbActionsEl,
      expanded,
      orbActions,
      handleOrbActionClick,
    );

    renderFloatingPanels(dom.orbPanelsEl);
  }

  // ----------------------------------------------------------
  // EVENT REGISTRATION
  // ----------------------------------------------------------

  dom.orbButtonEl.addEventListener("click", toggleOrbVisibility);
  dom.orbPanelsEl.addEventListener("click", handleSelectProject);
  dom.orbPanelsEl.addEventListener("click", handleCreateProject);
  dom.orbPanelsEl.addEventListener("click", handleRenameProject);
  dom.orbPanelsEl.addEventListener("click", handleDeleteProject);
  dom.orbPanelsEl.addEventListener("click", handleSelectItem);
  dom.orbPanelsEl.addEventListener("click", handleBackButtonClick);
  dom.orbPanelsEl.addEventListener("click", handleCreateItem);
  dom.orbPanelsEl.addEventListener("click", handleUpdateItem);
  dom.orbPanelsEl.addEventListener("click", handleDeleteItem);
  document.addEventListener("pointerdown", handleDocumentPointerDown);

  // ----------------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------------

  return function destroyFloatingController(): void {
    dom.orbButtonEl.removeEventListener("click", toggleOrbVisibility);
    dom.orbPanelsEl.removeEventListener("click", handleSelectProject);
    dom.orbPanelsEl.removeEventListener("click", handleCreateProject);
    dom.orbPanelsEl.removeEventListener("click", handleRenameProject);
    dom.orbPanelsEl.removeEventListener("click", handleDeleteProject);
    dom.orbPanelsEl.removeEventListener("click", handleSelectItem);
    dom.orbPanelsEl.removeEventListener("click", handleBackButtonClick);
    dom.orbPanelsEl.removeEventListener("click", handleCreateItem);
    dom.orbPanelsEl.removeEventListener("click", handleUpdateItem);
    dom.orbPanelsEl.removeEventListener("click", handleDeleteItem);
    document.removeEventListener("pointerdown", handleDocumentPointerDown);
  };
}
