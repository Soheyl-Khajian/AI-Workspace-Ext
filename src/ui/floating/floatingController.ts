// src/ui/floating/floatingController.ts
// ------------------------------------------------------------
// FLOATING UI CONTROLLER

import { createFloatingDom } from "./floatingDom";
import {
  collapseOrb,
  expandOrb,
  isOrbExpanded,
  toggleOrb,
} from "./floatingState";
import { handleOrbAction } from "./orbActionRouter";
import { getOrbActions } from "./orbActions";
import type { OrbActionId } from "./orbActions";
import { renderOrbActions } from "./renderers/renderOrbActions";
import { renderFloatingPanels } from "./panels/renderFloatingPanels";
import { setActivePanel, clearActivePanel } from "./panels/floatingPanelState";

export async function initFloatingController(
  rootEl: HTMLElement,
): Promise<void> {
  const dom = createFloatingDom(rootEl);
  const actionsContext = createOrbActionContext();

  syncVisualState();

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

  function createOrbActionContext() {
    return {
      openProjectsPanel: () => {
        setActivePanel("projects");
      },

      openCapturePanel: () => {
        setActivePanel("capture");
      },

      openSearchPanel: () => {
        setActivePanel("search");
      },

      closeAllPanels: () => {
        clearActivePanel();
      },
    };
  }

  function closeFloatingUi(): void {
    collapseOrb();
    clearActivePanel();

    /*
      Reflect latest state into UI.
    */
    syncVisualState();
  }

  function handleOrbActionClick(actionId: OrbActionId): void {
    handleOrbAction(actionId, actionsContext);

    syncVisualState();
  }

  function syncVisualState(): void {
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

  dom.orbButtonEl.addEventListener("click", () => {
    const expanded = isOrbExpanded();
    if (expanded) {
      collapseOrb();
      clearActivePanel();
    } else {
      expandOrb();
    }

    syncVisualState();
  });

  document.addEventListener("pointerdown", handleDocumentPointerDown);
}
