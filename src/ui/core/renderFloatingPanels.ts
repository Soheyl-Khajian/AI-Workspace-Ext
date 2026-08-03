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
import { renderProjectsPanel } from "../features/projects/renderProjectsPanel";
import { renderSearchPanel } from "../features/search/renderSearchPanel";
import { renderItemsPanel } from "../features/items/renderItemsPanel";
import { renderBackupPanel } from "../features/backup/renderBackupPanel";

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
    case "projects":
      return renderProjectsPanel(containerEl);
    case "items":
      return renderItemsPanel(
        containerEl,
        context.projectName,
        context.projects,
      );
    case "backup":
      return renderBackupPanel(containerEl);
    case "search":
      return renderSearchPanel(containerEl);
    default:
      return assertNever(activePanel);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled panel type: ${String(value)}`);
}
