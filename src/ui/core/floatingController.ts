// src/ui/core/floatingController.ts
// ------------------------------------------------------------
// FLOATING UI COMPOSITION ROOT
// ------------------------------------------------------------
//
// Responsibility:
//
// - construct the floating UI object graph: dom refs, feature
//   controllers, and event-handler factories (dependency injection
//   happens HERE and only here)
// - own the render cycle (renderUi) and the initial load
// - bridge features that must not know about each other
//   (cross-feature glue: hasActiveInlineEdit, resolveProjectName,
//   reloadAfterImport)
// - own listener lifecycle: register every contributed
//   EventBinding and return a teardown that removes them
//   symmetrically
//
// IMPORTANT:
//
// - event handlers live in the handler modules (core/orbHandlers,
//   features/*/…Handlers); this file only composes their
//   EventBinding[] contributions into one add/remove table
// - NO DOM creation details (floatingDom)
// - NO rendering implementation (renderers)
// - NO business logic (feature controllers)
// - NO persistent storage (storage facade)
// ------------------------------------------------------------

import type { OrbActionId } from "./types";
import type { OrbActionContext } from "./orbActionRouter";
import type { EventBinding } from "./eventBindings";

import { createFloatingDom } from "./floatingDom";
import { handleOrbAction } from "./orbActionRouter";
import { getOrbActions } from "./orbActions";
import { renderOrbActions } from "./renderOrbActions";
import { renderFloatingPanels } from "./renderFloatingPanels";
import { isOrbExpanded, openPanel, togglePanel } from "./floatingUiState";
import { setSelectedItemId, setSelectedProjectId } from "./sessionState";
import { createOrbHandlers } from "./orbHandlers";

import { createProjectsController } from "../features/projects/projectsController";
import {
  PROJECT_RENAME_INPUT_SELECTOR,
  createProjectsHandlers,
} from "../features/projects/projectsHandlers";
import { getProjects } from "../features/projects/projectsState";
import { createItemsController } from "../features/items/itemsController";
import { createItemsHandlers } from "../features/items/itemsHandlers";
import { createBackupController } from "../features/backup/backupController";
import { createBackupHandlers } from "../features/backup/backupHandlers";

import { showToast } from "../shared/showToast";

export function initFloatingController(rootEl: HTMLElement): () => void {
  // ----------------------------------------------------------
  // CONSTRUCTION (dom → controllers → handler factories)
  //
  // The only place dependencies are wired together. Function
  // declarations below (renderUi, glue) are hoisted, so passing
  // them here is safe.
  // ----------------------------------------------------------
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

  const actionsContext: OrbActionContext = {
    togglePanel: toggleFloatingPanel,
  };

  renderUi();
  void projectsController.load();

  // ----------------------------------------------------------
  // RENDER
  //
  // Single state → DOM synchronization point. Everything that
  // mutates UI state funnels back through here.
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
  // ORB ACTION WIRING (render callbacks — not table bindings)
  //
  // Handed to renderOrbActions on every render; these listeners
  // live and die with the rendered buttons, not with the table.
  // ----------------------------------------------------------
  function toggleFloatingPanel(panelId: OrbActionId): void {
    togglePanel(panelId);
    renderUi();
  }

  function handleOrbActionClick(actionId: OrbActionId): void {
    handleOrbAction(actionId, actionsContext);
  }

  // ----------------------------------------------------------
  // CROSS-FEATURE GLUE
  //
  // Bridging features that must not know about each other is the
  // composition root's job — feature and core modules receive
  // these as injected deps instead of importing across siblings.
  // ----------------------------------------------------------

  // Injected into orbHandlers as deps.hasActiveInlineEdit so the
  // core orb module never imports feature selectors directly —
  // it asks "is an inline edit in progress?" without knowing WHICH
  // feature owns the edit. Today that means the projects rename
  // input; future inline editors extend this predicate, not core.
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

  // Injected into backupController as deps.onImported. The database
  // was fully replaced, so all transient state is stale: reset
  // selection + panel, then reload projects from storage
  // (projectsController.load re-renders via its onStateChange).
  async function reloadAfterImport(): Promise<void> {
    itemsController.clearSelection();
    setSelectedItemId(null);
    setSelectedProjectId(null);
    openPanel("projects");
    await projectsController.load();
  }

  // ----------------------------------------------------------
  // EVENT BINDINGS (single source of truth for add + remove)
  //
  // One declarative table drives BOTH registration and teardown, so the two
  // can never drift. This matters because the mount manager may init and
  // destroy this controller repeatedly across ChatGPT SPA navigations — any
  // asymmetry would leak a listener on every re-mount.
  //
  // Every binding is contributed by a handler module; this file
  // adds none of its own.
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
