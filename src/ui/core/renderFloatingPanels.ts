// src/ui/core/renderFloatingPanels.ts
// ------------------------------------------------------------
// FLOATING PANEL RENDER COORDINATOR
// ------------------------------------------------------------

// Responsibility:
//
// - reads current active panel
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

import { getActivePanel } from "./floatingUiState";
import { renderProjectsPanel } from "../features/projects/renderProjectsPanel";
import { renderCapturePanel } from "../features/capture/renderCapturePanel";
import { renderSearchPanel } from "../features/search/renderSearchPanel";
import { renderItemsPanel } from "../features/items/renderItemsPanel";

export function renderFloatingPanels(containerEl: HTMLElement): void {
  containerEl.textContent = "";

  // potential future spaghetti due to state read :D
  const activePanel = getActivePanel();

  if (activePanel === null) {
    return;
  }

  switch (activePanel) {
    case "projects":
      renderProjectsPanel(containerEl);
      break;

    case "items":
      renderItemsPanel(containerEl);
      break;

    case "capture":
      renderCapturePanel(containerEl);
      break;

    case "search":
      renderSearchPanel(containerEl);
      break;

    default:
      assertNever(activePanel);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled panel type: ${String(value)}`);
}
