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
import { isOrbExpanded, openPanel, togglePanel } from "./floatingUiState";
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
import { createBackupHandlers } from "../features/backup/backupHandlers";
import { createOrbHandlers } from "./orbHandlers";

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

  const orbBindings = createOrbHandlers({
    rootEl: dom.rootEl,
    panelsEl: dom.orbPanelsEl,
    orbButtonEl: dom.orbButtonEl,
    requestRender: renderUi,
    hasActiveInlineEdit,
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

  const backupBindings = createBackupHandlers({
    panelsEl: dom.orbPanelsEl,
    backupController,
  });

  const actionsContext = createOrbActionContext();

  renderUi();
  void projectsController.load();

  // ----------------------------------------------------------
  // ORB ACTION WIRING (render callbacks — not table bindings)
  // ----------------------------------------------------------

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
  // ----------------------------------------------------------

  // ----------------------------------------------------------
  // Injected into orbHandlers as deps.hasActiveInlineEdit so the
  // core orb module never imports feature selectors directly —
  // it asks "is an inline edit in progress?" without knowing WHICH
  // feature owns the edit. Today that means the projects rename
  // input; future inline editors extend this predicate, not core.
  // ----------------------------------------------------------
  function hasActiveInlineEdit(): boolean {
    const activeProjectRenameInput = dom.orbPanelsEl.querySelector(
      PROJECT_RENAME_INPUT_SELECTOR,
    );
    return activeProjectRenameInput instanceof HTMLInputElement;
  }

  // Injected into itemsHandlers as deps.resolveProjectName so the
  // items feature never imports projectsState directly — bridging
  // sibling features is the composition root's job, not theirs.
  function resolveProjectName(projectId: string): string {
    const project = getProjects().find(
      (candidate) => candidate.id === projectId,
    );
    return project ? project.name : "Untitled project";
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
    ...orbBindings,
    ...projectsBindings,
    ...itemsBindings,
    ...backupBindings,
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
