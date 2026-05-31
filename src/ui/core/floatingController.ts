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
  isOrbExpanded,
  openPanel,
  togglePanel,
} from "./floatingUiState";
import { createProjectsController } from "../features/projects/projectsController";
import { createItemsController } from "../features/items/itemsController";

// ------------------------------------------------------------
// SHARED CONSTANTS (temporary scope; can later relocate)
// ------------------------------------------------------------

const PANEL_BACK_BUTTON_SELECTOR = ".aiw-panel-back-button";
const PROJECT_ROW_SELECTOR = ".aiw-project-row";
const PROJECT_ID_DATASET_KEY = "projectId";

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

  function handleOrbActionClick(actionId: OrbActionId): void {
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

    openPanel("projects");
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
  dom.orbPanelsEl.addEventListener("click", handleProjectSelect);
  dom.orbPanelsEl.addEventListener("click", handleBackButtonClick);
  document.addEventListener("pointerdown", handleDocumentPointerDown);

  // ----------------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------------

  return function destroyFloatingController(): void {
    dom.orbButtonEl.removeEventListener("click", toggleOrbVisibility);
    dom.orbPanelsEl.removeEventListener("click", handleProjectSelect);
    dom.orbPanelsEl.removeEventListener("click", handleBackButtonClick);
    document.removeEventListener("pointerdown", handleDocumentPointerDown);
  };
}
