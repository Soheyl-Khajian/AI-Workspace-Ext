// src/ui/core/orbHandlers.ts
// ------------------------------------------------------------
// ORB EVENT HANDLERS (CORE BINDINGS)
// ------------------------------------------------------------
//
// Responsibility:
//
// - own the orb-level DOM event handlers: orb toggle, outside-click collapse,
//   cross-context re-render on "aiw:projects-updated"
// - contribute EventBinding[] to the floating controller's
//   declarative add/remove table via createOrbHandlers()
//
// IMPORTANT ARCHITECTURE RULES:
//
// - core module: NO imports from features/* — feature knowledge is
//   injected (deps.hasActiveInlineEdit guards outside-click collapse
//   without knowing WHICH feature has an inline edit open;
//   deps.hasOpenRowMenu / deps.closeAllRowMenus layer menu
//   dismissal without knowing WHICH feature owns the menu)
// - core UI state (floatingUiState, sessionState) is imported
//   directly, per the core->core rule
// - NO rendering logic (requests re-render via deps.requestRender)
// - listener lifecycle is owned by the CALLER (register + teardown)
// ------------------------------------------------------------

import type { EventBinding } from "./eventBindings";
import { asListener } from "./eventBindings";
import { collapseOrb, expandOrb, isOrbExpanded } from "./floatingUiState";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

type OrbHandlersDependencies = {
  rootEl: HTMLElement;
  panelsEl: HTMLElement;
  orbButtonEl: HTMLElement;
  requestRender: () => void;
  hasActiveInlineEdit: () => boolean;
  hasOpenRowMenu: () => boolean;
  closeAllRowMenus: () => void;
};

export function createOrbHandlers(
  deps: OrbHandlersDependencies,
): EventBinding[] {
  // ----------------------------------------------------------
  // ORB STATE HELPERS
  // ----------------------------------------------------------
  function setOrbExpanded(): void {
    expandOrb();
    deps.requestRender();
  }

  function setOrbCollapsed(): void {
    // collapseOrb() also nulls the active panel, so every collapse
    // is a panel switch: open row menus must not survive it.
    deps.closeAllRowMenus();
    collapseOrb();
    deps.requestRender();
  }

  function toggleOrbVisibility(): void {
    const expanded = isOrbExpanded();

    if (expanded) {
      setOrbCollapsed();
    } else {
      setOrbExpanded();
    }
  }

  // ----------------------------------------------------------
  // OUTSIDE CLICK HANDLING (collapse behavior)
  // ----------------------------------------------------------
  function handleDocumentPointerDown(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    const clickedInsideFloatingUi = deps.rootEl.contains(target);

    if (clickedInsideFloatingUi) {
      return;
    }

    if (deps.hasActiveInlineEdit()) {
      return;
    }

    if (deps.hasOpenRowMenu()) {
      // Layered dismissal: the first outside click closes only the
      // open row menu; the NEXT one reaches setOrbCollapsed.
      deps.closeAllRowMenus();
      deps.requestRender();
      return;
    }

    setOrbCollapsed();
  }

  // ----------------------------------------------------------
  // PROJECTS UPDATED HANDLER (cross-context sync)
  // ----------------------------------------------------------
  //
  // Fired by captureHandler after it syncs projects runtime state.
  // Ensures the projects panel reflects changes (e.g. new Inbox project)
  // without requiring a page refresh.
  // ----------------------------------------------------------
  function handleProjectsUpdated(): void {
    deps.requestRender();
  }

  // ----------------------------------------------------------
  // EVENT BINDINGS
  // ----------------------------------------------------------
  const eventBindings: EventBinding[] = [
    [deps.orbButtonEl, "click", asListener(toggleOrbVisibility)],
    [document, "pointerdown", asListener(handleDocumentPointerDown)],
    [document, "aiw:projects-updated", asListener(handleProjectsUpdated)],
  ];

  return eventBindings;
}
