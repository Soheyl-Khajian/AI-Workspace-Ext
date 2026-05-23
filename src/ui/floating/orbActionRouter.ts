// src/ui/floating/orbActionRouter.ts
// ------------------------------------------------------------
// this is a router
// it only maps actions → behaviors
// it is not allowed to mutate UI or state directly
//
// Responsibility:
//
// receives actionId
// decides what system behavior runs
// does NOT render anything
// does NOT touch DOM
// does NOT manage UI state

import { getActivePanel } from "./panels/floatingPanelState";

// Only orchestration of behavior.

type OrbActionId = "projects" | "capture" | "search";

export type OrbActionContext = {
  openProjectsPanel: () => void;
  openCapturePanel: () => void;
  openSearchPanel: () => void;

  closeAllPanels: () => void;
};

export function handleOrbAction(
  actionId: OrbActionId,
  context: OrbActionContext,
): void {
  const currentPanel = getActivePanel();

  if (currentPanel === actionId) {
    context.closeAllPanels();
    return;
  }

  context.closeAllPanels();

  switch (actionId) {
    case "projects":
      context.closeAllPanels();
      context.openProjectsPanel();
      break;

    case "capture":
      context.closeAllPanels();
      context.openCapturePanel();
      break;

    case "search":
      context.closeAllPanels();
      context.openSearchPanel();
      break;

    default:
      console.log(`Unknown action ID: ${actionId}`);
      return;
  }
}
