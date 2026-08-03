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
//   resolveProjectName, renderSearchResultsRegion, openProject,
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

import type { OrbActionId, OrbPanelId } from "./types";
import type { OrbActionContext } from "./orbActionRouter";
import type { EventBinding } from "./eventBindings";

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
import { createProjectsHandlers } from "../features/projects/projectsHandlers";
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
import { createItemsHandlers } from "../features/items/itemsHandlers";
import { resetItemsDraftState } from "../features/items/itemsDraftState";
import { createBackupController } from "../features/backup/backupController";
import { createBackupHandlers } from "../features/backup/backupHandlers";
import { createSearchController } from "../features/search/searchController";
import { createSearchHandlers } from "../features/search/searchHandlers";
import {
  renderSearchResults,
  SEARCH_RESULTS_SELECTOR,
} from "../features/search/renderSearchPanel";
import { resetSearchState } from "../features/search/searchState";
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

  const searchController = createSearchController({
    onStateChange: renderUi,
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

  const searchBindings = createSearchHandlers({
    panelsEl: dom.orbPanelsEl,
    renderResults: renderSearchResultsRegion,
    openProject,
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

    dom.rootEl.dataset.orbExpanded = String(expanded);

    renderOrbActions(
      dom.orbActionsEl,
      expanded,
      orbActions,
      handleOrbActionClick,
    );

    const panelEl = renderFloatingPanels(dom.orbPanelsEl, activePanelId, {
      projectName,
      projects: getProjects(),
    });

    if (panelChanged && panelEl !== null) {
      panelEl.classList.add("aiw-floating-panel--enter");
      panelEnteredAt = performance.now();
    } else if (
      panelEl !== null &&
      performance.now() - panelEnteredAt < PANEL_ENTER_REPLAY_WINDOW_MS
    ) {
      /*
        Same panel rebuilt while its entrance is still playing: a
        wipe-rebuild render (e.g. the search snapshot load fires
        onStateChange in the same tick as the panel switch) replaces
        the animating element with a fresh one that has no enter
        class, killing the animation before its first painted frame.
        Re-apply the class inside the replay window so the fresh
        element replays the entrance instead.
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

    /*
      Opening the search panel (re)loads its workspace snapshot.
      The trigger lives HERE, on the panel-open door, not inside
      renderUi — the render cycle must stay a pure state → DOM
      sync with no side effects. Reopening refreshes the snapshot;
      keystrokes while the panel is open never touch storage.
    */
    if (getActivePanel() === "search") {
      void searchController.load();
    }

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
  The items row menu joins in its own commit.
*/
  function hasOpenRowMenu(): boolean {
    return getOpenProjectMenuId() !== null;
  }

  function closeAllRowMenus(): void {
    closeProjectMenu();
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
    Injected into searchHandlers as deps.renderResults. The debounced
    input handler must re-render ONLY the results region — a full
    panel render would destroy the input mid-typing — but handler
    modules do no rendering, so the composition root locates the
    live container and invokes the scoped renderer. No-op when the
    search panel isn't mounted (e.g. a debounce countdown that
    fires just after the panel closed).
  */
  function renderSearchResultsRegion(): void {
    const resultsEl = dom.orbPanelsEl.querySelector(SEARCH_RESULTS_SELECTOR);
    if (!(resultsEl instanceof HTMLElement)) {
      return;
    }

    renderSearchResults(resultsEl);
  }

  /*
  Injected into searchHandlers as deps.openProject. Search result
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
  // selection, drafts, rename editing, search snapshot + query,
  // and panel, then reload projects from storage
  // (projectsController.load re-renders via its onStateChange).
  async function reloadAfterImport(): Promise<void> {
    itemsController.clearSelection();
    resetItemsDraftState();
    resetProjectsDraftState();
    resetProjectsRenameState();
    resetProjectsMenuState();
    resetSearchState();
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
  const eventBindings: EventBinding[] = [
    ...orbBindings,
    ...projectsBindings,
    ...itemsBindings,
    ...backupBindings,
    ...searchBindings,
  ];

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
  };
}
