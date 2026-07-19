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
import { getProjects } from "../features/projects/projectsState";
import {
  setSelectedItemId,
  setSelectedProjectId,
  getSelectedProjectId,
} from "./sessionState";
import { showToast } from "../shared/showToast";
import { createBackupController } from "../features/backup/backupController";

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
const ITEM_SELECT_SELECTOR = ".aiw-item-select";
const ITEM_DELETE_SELECTOR = ".aiw-item-delete";
const ITEM_ID_DATASET_KEY = "itemId";
const ITEM_CREATE_BUTTON_SELECTOR = ".aiw-create-item-submit";
const ITEM_DETAIL_SAVE_SELECTOR = ".aiw-item-detail-save";
const ITEM_BUILD_CONTEXT_SELECTOR = ".aiw-build-context";

const BACKUP_EXPORT_SELECTOR = ".aiw-backup-export";
const BACKUP_IMPORT_SELECTOR = ".aiw-backup-import";

export function initFloatingController(rootEl: HTMLElement): () => void {
  const dom = createFloatingDom(rootEl);

  const itemsController = createItemsController({
    onStateChange: renderUi,
    notify: showToast,
  });

  const projectsController = createProjectsController({
    onStateChange: renderUi,
    notify: showToast,
    itemsController,
  });

  const backupController = createBackupController({
    notify: showToast,
    onImported: reloadAfterImport,
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
  // PROJECTS UPDATED HANDLER (cross-context sync)
  // ----------------------------------------------------------
  //
  // Fired by captureHandler after it syncs projects runtime state.
  // Ensures the projects panel reflects changes (e.g. new Inbox project)
  // without requiring a page refresh.
  // ----------------------------------------------------------

  function handleProjectsUpdated(): void {
    renderUi();
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
      showToast("Project name can't be empty");
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

    itemsController.selectItem(itemId);
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

    itemsController.toggleSelection(itemId);
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
    const itemContent = contentInput.value;
    if (trimmedItemTitle.length === 0 && itemContent.trim().length === 0) {
      showToast("Add a title or some content");
      return;
    }

    await itemsController.create(
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
    const itemContent = contentInput.value;
    if (trimmedItemTitle.length === 0 && itemContent.trim().length === 0) {
      showToast("Add a title or some content");
      return;
    }

    await itemsController.updateItem(itemId, trimmedItemTitle, itemContent);
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

    // Supply the project name the controller needs (keeps items decoupled).
    const project = getProjects().find(
      (candidate) => candidate.id === selectedProjectId,
    );
    const projectName = project ? project.name : "Untitled project";

    await itemsController.copyContextPack(projectName);
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
  // EXPORT BACKUP HANDLER
  // ----------------------------------------------------------

  async function handleExportBackup(event: MouseEvent): Promise<void> {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const exportButton = target.closest(BACKUP_EXPORT_SELECTOR);
    if (!(exportButton instanceof HTMLElement)) {
      return;
    }

    await backupController.exportBackup();
  }

  // ----------------------------------------------------------
  // IMPORT BACKUP HANDLER
  // ----------------------------------------------------------

  async function handleImportBackup(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const importButton = target.closest(BACKUP_IMPORT_SELECTOR);
    if (!(importButton instanceof HTMLElement)) {
      return;
    }
    await backupController.importBackup();
  }

  // ----------------------------------------------------------
  // POST-IMPORT REFRESH
  //
  // The database was fully replaced, so all transient state is stale.
  // Reset selection + panel, then reload projects from storage
  // (projectsController.load re-renders via its onStateChange).
  // ----------------------------------------------------------
  async function reloadAfterImport(): Promise<void> {
    itemsController.clearSelection();
    setSelectedItemId(null);
    setSelectedProjectId(null);
    openPanel("projects");
    await projectsController.load();
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
  // EVENT BINDINGS (single source of truth for add + remove)
  //
  // One declarative table drives BOTH registration and teardown, so the two
  // can never drift. This matters because the mount manager may init and
  // destroy this controller repeatedly across ChatGPT SPA navigations — any
  // asymmetry would leak a listener on every re-mount.
  // ----------------------------------------------------------

  /*Handlers are typed to their specific event (MouseEvent/PointerEvent), but
  the DOM addEventListener contract is the generic EventListener. asListener
  bridges that mismatch in ONE place. Safe: each handler is only ever
  registered on an event type that actually delivers the event it expects.*/
  const asListener = (handler: (event: never) => unknown): EventListener =>
    handler as EventListener;

  const eventBindings: Array<[EventTarget, string, EventListener]> = [
    [dom.orbButtonEl, "click", asListener(toggleOrbVisibility)],
    [dom.orbPanelsEl, "click", asListener(handleSelectProject)],
    [dom.orbPanelsEl, "click", asListener(handleCreateProject)],
    [dom.orbPanelsEl, "click", asListener(handleRenameProject)],
    [dom.orbPanelsEl, "click", asListener(handleDeleteProject)],
    [dom.orbPanelsEl, "click", asListener(handleSelectItem)],
    [dom.orbPanelsEl, "click", asListener(handleToggleItemSelection)],
    [dom.orbPanelsEl, "click", asListener(handleBackButtonClick)],
    [dom.orbPanelsEl, "click", asListener(handleCreateItem)],
    [dom.orbPanelsEl, "click", asListener(handleUpdateItem)],
    [dom.orbPanelsEl, "click", asListener(handleBuildContext)],
    [dom.orbPanelsEl, "click", asListener(handleDeleteItem)],
    [dom.orbPanelsEl, "click", asListener(handleExportBackup)],
    [dom.orbPanelsEl, "click", asListener(handleImportBackup)],
    [document, "pointerdown", asListener(handleDocumentPointerDown)],
    [document, "aiw:projects-updated", asListener(handleProjectsUpdated)],
  ];

  for (const [target, type, listener] of eventBindings) {
    target.addEventListener(type, listener);
  }

  // ----------------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------------
  return function destroyFloatingController(): void {
    for (const [target, type, listener] of eventBindings) {
      target.removeEventListener(type, listener);
    }
  };
}
