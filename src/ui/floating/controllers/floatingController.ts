// src/ui/floating/controllers/floatingController.ts
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

import { createFloatingDom } from "../floatingDom";
import { handleOrbAction } from "../orbActionRouter";
import type { OrbActionContext } from "../orbActionRouter";
import { getOrbActions } from "../orbActions";
import type { OrbPanelId } from "../types";
import { renderOrbActions } from "../renderers/renderOrbActions";
import { renderFloatingPanels } from "../panels/renderFloatingPanels";
import {
  collapseOrb,
  expandOrb,
  isOrbExpanded,
  togglePanel,
} from "../state/floatingUiState";
import { createProjectsController } from "./projectsController";

// ------------------------------------------------------------
// SHARED CONSTANTS (temporary scope; can later relocate)
// ------------------------------------------------------------

const PROJECT_ROW_SELECTOR = ".aiw-project-row";
const PROJECT_ID_DATASET_KEY = "projectId";

export function initFloatingController(rootEl: HTMLElement): () => void {
  const dom = createFloatingDom(rootEl);

  const projectsController = createProjectsController({
    onStateChange: renderUi,
  });

  const actionsContext = createOrbActionContext();

  renderUi();
  void projectsController.load();

  // ----------------------------------------------------------
  // OUTSIDE CLICK HANDLING (collapse behavior)
  // ----------------------------------------------------------

  function handleDocumentPointerDown(event: PointerEvent): void {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    const clickedInsideFloatingUi = rootEl.contains(target);

    if (clickedInsideFloatingUi) {
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

  function toggleFloatingPanel(panelId: OrbPanelId): void {
    togglePanel(panelId);
    renderUi();
  }

  function createOrbActionContext(): OrbActionContext {
    return { togglePanel: toggleFloatingPanel };
  }

  function handleOrbActionClick(actionId: OrbPanelId): void {
    handleOrbAction(actionId, actionsContext);
  }

  // ----------------------------------------------------------
  // PROJECT SELECTION HANDLER
  // ----------------------------------------------------------

  function handleProjectSelect(event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

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
  // EVENT REGISTRATION
  // ----------------------------------------------------------

  dom.orbButtonEl.addEventListener("click", toggleOrbVisibility);
  dom.orbPanelsEl.addEventListener("click", handleProjectSelect);
  document.addEventListener("pointerdown", handleDocumentPointerDown);

  // ----------------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------------

  return function destroyFloatingController(): void {
    dom.orbButtonEl.removeEventListener("click", toggleOrbVisibility);
    dom.orbPanelsEl.removeEventListener("click", handleProjectSelect);
    document.removeEventListener("pointerdown", handleDocumentPointerDown);
  };
}
