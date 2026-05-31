// src/ui/features/search/renderSearchPanel.ts
// ------------------------------------------------------------
// SEARCH PANEL RENDERER
// ------------------------------------------------------------
//
// Responsibility:
//
// - render search floating panel UI
// - mount panel DOM into provided container
//
// IMPORTANT:
//
// - PURE renderer
// - NO state mutation
// - NO storage access
// - NO global DOM queries
// - NO business logic
// - NO async logic
// ------------------------------------------------------------

import { createFloatingPanelShell } from "../../shared/createFloatingPanelShell";
import { createPanelState } from "../../shared/createPanelState";

export function renderSearchPanel(containerEl: HTMLElement): void {
  const shell = createFloatingPanelShell("Search");

  const panelStateEl = createPanelState({
    variant: "placeholder",
    message: "Nothing here yet",
  });

  shell.bodyEl.append(panelStateEl);

  containerEl.append(shell.panelEl);
}
