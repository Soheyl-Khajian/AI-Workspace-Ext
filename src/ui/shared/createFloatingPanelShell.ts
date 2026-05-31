// src/ui/shared/createFloatingPanelShell.ts
// ------------------------------------------------------------
// FLOATING PANEL SHELL
// ------------------------------------------------------------
//
// Responsibility:
// - Create a standardized floating panel structure
// - Provide root + body container for renderers
//
// IMPORTANT RULES:
// - NO state logic
// - NO rendering decisions
// - NO business/domain assumptions
// - NO event handling
// - ONLY structural DOM creation
// ------------------------------------------------------------

export function createFloatingPanelShell(title: string): {
  panelEl: HTMLElement;
  headerEl: HTMLElement;
  bodyEl: HTMLDivElement;
} {
  // ------------------------------------------------------------
  // ROOT
  // ------------------------------------------------------------

  const panelEl = document.createElement("section");
  panelEl.className = "aiw-floating-panel";

  // ------------------------------------------------------------
  // HEADER (internal structure only)
  // ------------------------------------------------------------

  const headerEl = document.createElement("header");
  headerEl.className = "aiw-floating-panel__header";

  const titleEl = document.createElement("h2");
  titleEl.className = "aiw-floating-panel__title";
  titleEl.textContent = title;

  headerEl.append(titleEl);

  // ------------------------------------------------------------
  // BODY
  // ------------------------------------------------------------

  const bodyEl = document.createElement("div");
  bodyEl.className = "aiw-floating-panel__body";

  // ------------------------------------------------------------
  // ASSEMBLY
  // ------------------------------------------------------------

  panelEl.append(headerEl, bodyEl);

  return {
    panelEl,
    headerEl,
    bodyEl,
  };
}
