// src/ui/shared/createPanelState.ts
// ------------------------------------------------------------
// FLOATING PANEL STATE NODE FACTORY
// ------------------------------------------------------------
//
// Responsibility:
// - Create standardized UI state nodes for panels
// - Apply consistent variant styling
//
// IMPORTANT RULES:
// - NO domain-specific text
// - NO business logic
// - NO rendering orchestration
// - NO feature assumptions
// - ONLY UI state node creation
// ------------------------------------------------------------

type PanelVariant = "loading" | "empty" | "error" | "placeholder";

type CreatePanelStateParams = {
  variant: PanelVariant;
  message: string;
};

export function createPanelState({
  variant,
  message,
}: CreatePanelStateParams): HTMLElement {
  const el = document.createElement("div");

  // ------------------------------------------------------------
  // BASE CLASS
  // ------------------------------------------------------------

  el.className = "aiw-panel-state";

  // ------------------------------------------------------------
  // VARIANT STYLING
  // ------------------------------------------------------------

  switch (variant) {
    case "loading":
      el.classList.add("aiw-panel-state--loading");
      break;

    case "empty":
      el.classList.add("aiw-panel-state--empty");
      break;

    case "error":
      el.classList.add("aiw-panel-state--error");
      break;

    case "placeholder":
      el.classList.add("aiw-panel-state--placeholder");
      break;

    default: {
      const _exhaustive: never = variant;
      throw new Error(`Unhandled panel variant: ${_exhaustive}`);
    }
  }

  // ------------------------------------------------------------
  // TEXT (always explicit, never inferred)
  // ------------------------------------------------------------

  el.textContent = message;

  return el;
}
