// src/ui/floating/panels/renderCapturePanel.ts
// ------------------------------------------------------------
// CAPTURE PANEL RENDERER
// ------------------------------------------------------------

// Responsibility:
//
// - render projects floating panel UI
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

export function renderCapturePanel(containerEl: HTMLElement): void {
  const panelEl = document.createElement("section");
  panelEl.className = "aiw-floating-panel";

  const headerEl = document.createElement("header");
  headerEl.className = "aiw-floating-panel__header";

  const titleEl = document.createElement("h2");
  titleEl.className = "aiw-floating-panel__title";
  titleEl.textContent = "Capture";
  headerEl.append(titleEl);

  const bodyEl = document.createElement("div");
  bodyEl.className = "aiw-floating-panel__body";

  const placeholderEl = document.createElement("p");
  placeholderEl.className = "aiw-floating-panel__placeholder";
  placeholderEl.textContent = "Capture panel placeholder";
  bodyEl.append(placeholderEl);

  panelEl.append(headerEl, bodyEl);

  containerEl.append(panelEl);
}
