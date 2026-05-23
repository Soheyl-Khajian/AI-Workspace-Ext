// src/ui/floating/panels/floatingPanelState.ts
// ------------------------------------------------------------

export type OrbPanelId = "projects" | "capture" | "search";

let activePanel: OrbPanelId | null = null;

export function setActivePanel(panel: OrbPanelId): void {
  activePanel = panel;
}

export function clearActivePanel(): void {
  activePanel = null;
}

export function getActivePanel(): OrbPanelId | null {
  return activePanel;
}
