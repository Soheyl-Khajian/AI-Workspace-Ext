// src/ui/shared/createFloatingPanelShell.ts
// ------------------------------------------------------------
// FLOATING PANEL SHELL
// ------------------------------------------------------------
//
// Responsibility:
// - Create a standardized floating panel structure
// - Provide root + body container for renderers
// - Optionally render a generic context segment
//   (button + separator) before the title — caller
//   supplies the label; the button carries NO listener
//   (delegation owns clicks)
//
// IMPORTANT RULES:
// - NO state logic
// - NO rendering decisions
// - NO business/domain assumptions
// - NO event handling
// - ONLY structural DOM creation
// ------------------------------------------------------------

export type PanelContext = { label: string; muted?: boolean };

const PANEL_SHELL_CONTEXT_CLASS = "aiw-panel-context";
export const PANEL_SHELL_CONTEXT_SELECTOR = `.${PANEL_SHELL_CONTEXT_CLASS}`;

export function createFloatingPanelShell(
  title: string,
  context?: PanelContext,
): {
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

  if (context) {
    const buttonEl = document.createElement("button");
    buttonEl.type = "button";
    buttonEl.className = PANEL_SHELL_CONTEXT_CLASS;
    buttonEl.textContent = context.label;
    if (context.muted) {
      buttonEl.classList.add(`${PANEL_SHELL_CONTEXT_CLASS}--muted`);
    }

    const spanEl = document.createElement("span");
    spanEl.className = `${PANEL_SHELL_CONTEXT_CLASS}-separator`;
    spanEl.textContent = "›";

    headerEl.append(buttonEl, spanEl);
  }

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
