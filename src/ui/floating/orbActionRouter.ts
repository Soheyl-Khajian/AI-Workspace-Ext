// src/ui/floating/orbActionRouter.ts
// ------------------------------------------------------------
// ORB ACTION ROUTER
// ------------------------------------------------------------
//
// Responsibility:
// - map orb actions to UI behaviors
// - delegate behavior execution to provided context
//
// IMPORTANT:
// - NO DOM access
// - NO rendering
// - NO state ownership
// - NO business logic
// ------------------------------------------------------------

import type { OrbPanelId } from "./types";

export type OrbActionContext = {
  toggleProjectsPanel: () => void;
  toggleCapturePanel: () => void;
  toggleSearchPanel: () => void;
};

export function handleOrbAction(
  actionId: OrbPanelId,
  context: OrbActionContext,
): void {
  switch (actionId) {
    case "projects":
      context.toggleProjectsPanel();
      break;

    case "capture":
      context.toggleCapturePanel();
      break;

    case "search":
      context.toggleSearchPanel();
      break;

    default:
      assertNever(actionId);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled action: ${String(value)}`);
}
