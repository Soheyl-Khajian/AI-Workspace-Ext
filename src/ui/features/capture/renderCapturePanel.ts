// src/ui/features/capture/renderCapturePanel.ts
// ------------------------------------------------------------
// CAPTURE PANEL RENDERER
// ------------------------------------------------------------
//
// Responsibility:
//
// - render capture floating panel UI
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

export function renderCapturePanel(containerEl: HTMLElement): void {
  const shell = createFloatingPanelShell("Capture");

  const panelStateEl = createPanelState({
    variant: "placeholder",
    message: "Nothing here yet",
  });

  shell.bodyEl.append(panelStateEl);

  containerEl.append(shell.panelEl);
}
