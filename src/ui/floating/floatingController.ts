// src/ui/floating/floatingController.ts
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
import type { OrbPanelId } from "./types";
import { renderOrbActions } from "./renderers/renderOrbActions";
import { renderFloatingPanels } from "./panels/renderFloatingPanels";
import {
  collapseOrb,
  expandOrb,
  isOrbExpanded,
  togglePanel,
} from "./state/floatingUiState";

export function initFloatingController(rootEl: HTMLElement): () => void {
  const dom = createFloatingDom(rootEl);
  const actionsContext = createOrbActionContext();

  renderUi();

  function handleDocumentPointerDown(event: PointerEvent): void {
    /*
      event.target is typed as:
      EventTarget | null
  
      But .contains() expects:
      Node
  
      So we must safely narrow the type first.
    */
    const target = event.target;

    /*
      Extremely defensive safety check.
  
      In browser environments this is almost always a Node,
      but never assume.
    */
    if (!(target instanceof Node)) {
      return;
    }

    /*
      Determine whether click happened INSIDE floating UI.
    */
    const clickedInsideFloatingUi = rootEl.contains(target);

    if (clickedInsideFloatingUi) {
      return;
    }

    closeFloatingUi();
  }

  function createOrbActionContext(): OrbActionContext {
    return {
      toggleProjectsPanel: () => {
        togglePanel("projects");
      },

      toggleCapturePanel: () => {
        togglePanel("capture");
      },

      toggleSearchPanel: () => {
        togglePanel("search");
      },
    };
  }

  function closeFloatingUi(): void {
    collapseOrb();

    renderUi();
  }

  function handleOrbButtonClick(): void {
    const expanded = isOrbExpanded();

    if (expanded) {
      collapseOrb();
    } else {
      expandOrb();
    }

    renderUi();
  }

  function handleOrbActionClick(actionId: OrbPanelId): void {
    handleOrbAction(actionId, actionsContext);

    renderUi();
  }

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

  dom.orbButtonEl.addEventListener("click", handleOrbButtonClick);

  document.addEventListener("pointerdown", handleDocumentPointerDown);

  return function destroyFloatingController(): void {
    dom.orbButtonEl.removeEventListener("click", handleOrbButtonClick);
    document.removeEventListener("pointerdown", handleDocumentPointerDown);
  };
}
