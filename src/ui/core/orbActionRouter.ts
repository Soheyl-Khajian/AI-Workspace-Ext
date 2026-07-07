// src/ui/core/orbActionRouter.ts
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

import type { OrbActionId } from "./types";

export type OrbActionContext = {
  togglePanel: (panelId: OrbActionId) => void;
};

export function handleOrbAction(
  actionId: OrbActionId,
  context: OrbActionContext,
): void {
  switch (actionId) {
    case "projects":
    case "backup":
    case "search":
      context.togglePanel(actionId);
      break;

    default:
      assertNever(actionId);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled action: ${String(value)}`);
}
