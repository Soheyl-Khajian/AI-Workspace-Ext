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
//   (cross-feature glue: hasActiveInlineEdit,
//   hasOpenRowMenu / closeAllRowMenus — the row-menu coordinator,
//   resolveProjectName, openProject, reloadAfterImport)
// - own listener lifecycle: register every contributed
//   EventBinding and return a teardown that removes them
//   symmetrically
//
// IMPORTANT:
//
// - event handlers live in the handler modules (core/orbHandlers,
//   features/*/…Handlers) for vanilla panels; React-owned panels
//   wire their own clicks in their components — this file only
//   composes the remaining EventBinding[] contributions
// - NO DOM creation details (floatingDom)
// - NO rendering implementation (renderers)
// - NO business logic (feature controllers)
// - NO persistent storage (storage facade)
// ------------------------------------------------------------

import type { OrbActionId, OrbPanelId } from "./types";
import type { OrbActionContext } from "./orbActionRouter";
import type { EventBinding } from "./eventBindings";
import type { AutoBackupSnapshot } from "../../models/backup";
import type { AutoBackupSnapshotMessage } from "../../background/messages";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ReactPanelHost } from "./ReactPanelHost";
import { createFloatingDom } from "./floatingDom";
import { handleOrbAction } from "./orbActionRouter";
import { getOrbActions } from "./orbActions";
import { renderOrbActions } from "./renderOrbActions";
import { renderFloatingPanels } from "./renderFloatingPanels";
import {
  getActivePanel,
  isOrbExpanded,
  openPanel,
  togglePanel,
} from "./floatingUiState";
import {
  getSelectedProjectId,
  setSelectedItemId,
  setSelectedProjectId,
} from "./sessionState";
import { createOrbHandlers } from "./orbHandlers";

import { createProjectsController } from "../features/projects/projectsController";
import { getProjects } from "../features/projects/projectsState";
import { resetProjectsDraftState } from "../features/projects/projectsDraftState";
import {
  getEditingProjectId,
  resetProjectsRenameState,
} from "../features/projects/projectsRenameState";
import {
  closeProjectMenu,
  getOpenProjectMenuId,
  resetProjectsMenuState,
} from "../features/projects/projectsMenuState";

import { createItemsController } from "../features/items/itemsController";
import { resetItemsDraftState } from "../features/items/itemsDraftState";
import {
  closeItemMenu,
  getOpenItemMenu,
  resetItemsMenuState,
} from "../features/items/itemsMenuState";

import { createBackupController } from "../features/backup/backupController";
import { AUTO_BACKUP_STORAGE_KEY } from "../../background/autoBackupWriter";
import {
  AUTO_BACKUP_DEBOUNCE_MS,
  AUTO_BACKUP_MAX_MUTATIONS,
  createAutoBackupController,
} from "../features/backup/autoBackupController";

import { resetSearchDraftState } from "../features/search/searchDraftState";

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
  const root = createRoot(dom.reactPanelsEl);

  const itemsController = createItemsController({
    onStateChange: renderUi,
    notify: showToast,
  });

  const projectsController = createProjectsController({
    onStateChange: renderUi,
    notify: showToast,
    itemsController,
  });

  // Auto-backup wiring. Created BEFORE backupController, which
  // receives its beforeImport door as a dependency. The sendSnapshot
  // arrow is the feature's ENTIRE chrome-facing surface; the
  // controller itself never touches chrome.* APIs.
  const autoBackupController = createAutoBackupController({
    config: {
      debounceMs: AUTO_BACKUP_DEBOUNCE_MS,
      maxMutations: AUTO_BACKUP_MAX_MUTATIONS,
    },
    sendSnapshot: (reason, backup) => {
      const message: AutoBackupSnapshotMessage = {
        type: "AUTO_BACKUP_SNAPSHOT",
        reason,
        backup,
      };
      return chrome.runtime.sendMessage(message);
    },
  });
  autoBackupController.start();

  const backupController = createBackupController({
    notify: showToast,
    beforeImport: autoBackupController.beforeImport,
    onImported: reloadAfterImport,

    // The ring's read door, mirroring sendSnapshot on the write
    // side: this arrow is the restore feature's entire chrome-facing
    // surface. Reads need no queue -- only read-modify-writes do,
    // and those all live in the background writer.
    readAutoBackups: async () => {
      const result = await chrome.storage.local.get(AUTO_BACKUP_STORAGE_KEY);
      return (
        (result[AUTO_BACKUP_STORAGE_KEY] as AutoBackupSnapshot[] | undefined) ??
        []
      );
    },
    confirmDestructive: (message) => window.confirm(message),
  });

  const orbBindings = createOrbHandlers({
    rootEl: dom.rootEl,
    panelsEl: dom.orbPanelsEl,
    orbButtonEl: dom.orbButtonEl,
    requestRender: renderUi,
    hasActiveInlineEdit,
    hasOpenRowMenu,
    closeAllRowMenus,
  });

  const actionsContext: OrbActionContext = {
    togglePanel: toggleFloatingPanel,
  };

  // ----------------------------------------------------------
  // RENDER
  //
  // Single state → DOM synchronization point. Everything that
  // mutates UI state funnels back through here.
  // ----------------------------------------------------------
  let lastRenderedPanel: OrbPanelId | null = null;

  /*
  Entrance replay window. Matches --aiw-dur-med (180ms), the
  duration of aiw-panel-enter: any same-panel rebuild landing
  inside this window is mid-animation and must replay the enter
  class (see renderUi).
*/
  const PANEL_ENTER_REPLAY_WINDOW_MS = 180;
  let panelEnteredAt = 0;

  function renderUi(): void {
    const expanded = isOrbExpanded();
    const orbActions = getOrbActions();

    const activePanelId = getActivePanel();
    const panelChanged = activePanelId !== lastRenderedPanel;

    const selectedProjectId = getSelectedProjectId();
    let projectName: string | null;
    if (selectedProjectId !== null) {
      projectName = resolveProjectName(selectedProjectId);
    } else {
      projectName = null;
    }

    // React seam: same state, second renderer. Vanilla wipes its
    // container below; React reconciles its sibling here.
    root.render(
      createElement(ReactPanelHost, {
        activePanel: activePanelId,
        backupController,
        projectsController,
        itemsController,
        projects: getProjects(),
        projectName,
        openProject,
        notify: showToast,
        resolveProjectName,
        hasActiveInlineEdit,
        requestRender: renderUi,
      }),
    );

    dom.rootEl.dataset.orbExpanded = String(expanded);

    renderOrbActions(
      dom.orbActionsEl,
      expanded,
      orbActions,
      handleOrbActionClick,
    );

    const panelEl = renderFloatingPanels(dom.orbPanelsEl, activePanelId);

    if (panelChanged && panelEl !== null) {
      panelEl.classList.add("aiw-floating-panel--enter");
      panelEnteredAt = performance.now();
    } else if (
      panelEl !== null &&
      performance.now() - panelEnteredAt < PANEL_ENTER_REPLAY_WINDOW_MS
    ) {
      /*
      Same panel rebuilt while its entrance is still playing: a
      wipe-rebuild render (e.g. the projects load fires
      onStateChange right after the panel switch) replaces the
      animating element with a fresh one that has no enter
      class, killing the animation before its first painted
      frame. Re-apply the class inside the replay window so the
      fresh element replays the entrance instead.
    */
      panelEl.classList.add("aiw-floating-panel--enter");
    }

    lastRenderedPanel = activePanelId;
  }

  // ----------------------------------------------------------
  // ORB ACTION WIRING (render callbacks — not table bindings)
  //
  // Handed to renderOrbActions on every render; these listeners
  // live and die with the rendered buttons, not with the table.
  // ----------------------------------------------------------
  function toggleFloatingPanel(panelId: OrbActionId): void {
    // Panel switch door: open row menus must not survive it
    closeAllRowMenus();
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
  // core orb module never knows WHICH feature owns the edit.
  // Answered from projectsRenameState instead of a DOM query:
  // the edit mode is now a recorded fact, not an inference from
  // whether an input element happens to exist. Future inline
  // editors extend this predicate, not core.
  function hasActiveInlineEdit(): boolean {
    return getEditingProjectId() !== null;
  }

  /*
  ROW-MENU COORDINATOR. "Only one menu open" WITHIN a feature is
  structural (each menu state is a single variable); ACROSS
  features it is owned HERE — thin glue, because panel
  exclusivity (one activePanel) already prevents two menus from
  being VISIBLE at once. The coordinator's real job is killing
  stale open state. Contract — any feature adding a row menu
  must join all three:
  1. close all menus on every panel switch (toggleFloatingPanel,
     back button, breadcrumb, orb collapse)
  2. reset all menu states on import reload
  3. answer hasOpenRowMenu for the layered outside-click
     dismissal in orbHandlers (first click closes the menu,
     second collapses the orb)
  Members: the projects and items row menus.
*/
  function hasOpenRowMenu(): boolean {
    return getOpenProjectMenuId() !== null || getOpenItemMenu() !== null;
  }

  function closeAllRowMenus(): void {
    closeProjectMenu();
    closeItemMenu();
  }

  // Injected into itemsHandlers as deps.resolveProjectName so the
  // items feature can label its panels without importing sibling
  // projectsState. Also used by renderUi for the header context.
  function resolveProjectName(projectId: string): string {
    const project = getProjects().find(
      (candidate) => candidate.id === projectId,
    );
    return project ? project.name : "Untitled project";
  }

  /*
  Injected into ReactPanelHost as the search panel's openProject prop. Search result
  rows navigate to a project's Items panel — a workflow the
  projects feature already owns end to end (selectProject: set
  selection, open the items panel, clear item multi-select, load
  items). The narrow function hands search exactly that one door
  instead of the whole projectsController.
*/
  function openProject(projectId: string): void {
    projectsController.selectProject(projectId);
  }

  // Injected into backupController as deps.onImported. The database
  // was fully replaced, so all transient state is stale: reset
  // selection, drafts, rename editing, search query,
  // and panel, then reload projects from storage
  // (projectsController.load re-renders via its onStateChange).
  async function reloadAfterImport(): Promise<void> {
    itemsController.clearSelection();
    resetItemsDraftState();
    resetItemsMenuState();
    resetProjectsDraftState();
    resetProjectsRenameState();
    resetProjectsMenuState();
    resetSearchDraftState();
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
  const eventBindings: EventBinding[] = [...orbBindings];

  for (const [target, type, listener, options] of eventBindings) {
    target.addEventListener(type, listener, options);
  }

  // ----------------------------------------------------------
  // INITIAL RENDER + LOAD
  // ----------------------------------------------------------
  renderUi();
  void projectsController.load();

  // ----------------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------------
  return function destroyFloatingController(): void {
    for (const [target, type, listener, options] of eventBindings) {
      target.removeEventListener(type, listener, options);
    }

    root.unmount();

    // The auto-backup controller's bus subscription and pagehide
    // listener never entered the bindings table (they are not DOM
    // bindings); stop() is their teardown.
    autoBackupController.stop();
  };
}
