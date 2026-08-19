// src/ui/core/renderFloatingPanels.ts
// ------------------------------------------------------------
// FLOATING PANEL RENDER COORDINATOR
// ------------------------------------------------------------

// Responsibility:
//
// - receives current active panel
// - receives render context
// - clears previous panel render
// - chooses correct panel renderer
// - mounts correct floating panel
//
// IMPORTANT:
//
// - NO state mutation
// - NO global DOM queries
// - NO business logic
// - NO async logic
// - NO event orchestration
// ------------------------------------------------------------

import type { OrbPanelId, RenderContext } from "./types";
import { renderItemsPanel } from "../features/items/renderItemsPanel";

export function renderFloatingPanels(
  containerEl: HTMLElement,
  activePanel: OrbPanelId | null,
  context: RenderContext,
): HTMLElement | null {
  containerEl.textContent = "";

  if (activePanel === null) {
    return null;
  }

  switch (activePanel) {
    // React-owned since v0.8: the host renders this panel; the vanilla coordinator contributes nothing.
    case "projects":
      return null;

    case "items":
      return renderItemsPanel(
        containerEl,
        context.projectName,
        context.projects,
      );

    // React-owned since v0.7: the host renders this panel; the vanilla coordinator contributes nothing.
    case "backup":
      return null;

    // React-owned since v0.8: the host renders this panel; the vanilla coordinator contributes nothing.
    case "search":
      return null;

    default:
      return assertNever(activePanel);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled panel type: ${String(value)}`);
}
