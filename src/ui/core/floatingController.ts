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
import type { OrbActionId } from "./types";
import type { OrbActionContext } from "./orbActionRouter";
import type { EventBinding } from "./eventBindings";
import { asListener } from "./eventBindings";
import {
  collapseOrb,
  expandOrb,
  getActivePanel,
  isOrbExpanded,
  openPanel,
  togglePanel,
} from "./floatingUiState";
import { setSelectedItemId, setSelectedProjectId } from "./sessionState";
import { getProjects } from "../features/projects/projectsState";
import { createFloatingDom } from "./floatingDom";
import { handleOrbAction } from "./orbActionRouter";
import { getOrbActions } from "./orbActions";
import { renderOrbActions } from "./renderOrbActions";
import { renderFloatingPanels } from "./renderFloatingPanels";
import { createProjectsController } from "../features/projects/projectsController";
import {
  PROJECT_RENAME_INPUT_SELECTOR,
  createProjectsHandlers,
} from "../features/projects/projectsHandlers";
import { createItemsController } from "../features/items/itemsController";
import { createItemsHandlers } from "../features/items/itemsHandlers";
import { createBackupController } from "../features/backup/backupController";
import { showToast } from "../shared/showToast";

// ------------------------------------------------------------
// SHARED CONSTANTS
// ------------------------------------------------------------

const PANEL_BACK_BUTTON_SELECTOR = ".aiw-panel-back-button";

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

  const projectsBindings = createProjectsHandlers({
    panelsEl: dom.orbPanelsEl,
    projectsController,
    notify: showToast,
    requestRender: renderUi,
  });

  const itemsBindings = createItemsHandlers({
    panelsEl: dom.orbPanelsEl,
    itemsController,
    notify: showToast,
    resolveProjectName,
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
      PROJECT_RENAME_INPUT_SELECTOR,
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
  // CROSS-FEATURE GLUE
  //
  // Injected into itemsHandlers as deps.resolveProjectName so the
  // items feature never imports projectsState directly — bridging
  // sibling features is the composition root's job, not theirs.
  // ----------------------------------------------------------
  function resolveProjectName(projectId: string): string {
    const project = getProjects().find(
      (candidate) => candidate.id === projectId,
    );
    return project ? project.name : "Untitled project";
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

  const eventBindings: EventBinding[] = [
    [dom.orbButtonEl, "click", asListener(toggleOrbVisibility)],
    [dom.orbPanelsEl, "click", asListener(handleBackButtonClick)],
    ...projectsBindings,
    ...itemsBindings,
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
