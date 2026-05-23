// src/ui/floating/floatingState.ts
// ------------------------------------------------------------
// FLOATING UI STATE
//
// Responsibility:
// - Holds transient runtime state
// - Controls floating UI visibility state
// - Provides safe getters/setters
//
// IMPORTANT RULES:
// - NO DOM access
// - NO rendering
// - NO IndexedDB access
// - NO async logic
// - NO business logic
//
// This module is ONLY responsible for:
// "what is the current UI state?"
//
// NOT:
// "how should UI render?"
// "what should clicking do?"
// ------------------------------------------------------------

// ------------------------------------------------------------
// STATE SHAPE
// ------------------------------------------------------------

/*
  This type defines the COMPLETE runtime shape
  for the floating UI system.

  Think of it as:

  "all temporary UI memory"

  Later this may include:
  - open radial menu
  - active panel
  - animation states
  - hover states
  - drag states
  - overlay visibility
  - command palette state
  - search query state

  But for now:

  ONLY orb open/closed state.
*/

type FloatingState = {
  isOrbExpanded: boolean;
};

// ------------------------------------------------------------
// PRIVATE STATE
// ------------------------------------------------------------

const state: FloatingState = {
  isOrbExpanded: false,
};

// ------------------------------------------------------------
// GETTERS
// ------------------------------------------------------------

/*
  Returns current orb expansion state.
*/
export function isOrbExpanded(): boolean {
  return state.isOrbExpanded;
}

// ------------------------------------------------------------
// SETTERS
// ------------------------------------------------------------

/*
  Explicitly sets expansion state.
*/
export function setOrbExpanded(expanded: boolean): void {
  state.isOrbExpanded = expanded;
}

// ------------------------------------------------------------
// STATE ACTIONS
// ------------------------------------------------------------

/*
  These are convenience state operations.

  IMPORTANT:

  These are STILL state-layer operations.

  They do NOT:
  - render
  - animate
  - access DOM

  They ONLY mutate state.
*/

/*
  Opens floating UI.
*/
export function expandOrb(): void {
  state.isOrbExpanded = true;
}

/*
  Closes floating UI.
*/
export function collapseOrb(): void {
  state.isOrbExpanded = false;
}

/*
  Toggles current state.

  false -> true
  true -> false
*/
export function toggleOrb(): void {
  state.isOrbExpanded = !state.isOrbExpanded;
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------

/*
  Resets floating UI state back to defaults.

  Useful later for:
  - hot reload
  - reinjection
  - SPA navigation recovery
  - extension teardown
  - debugging
*/
export function resetFloatingState(): void {
  state.isOrbExpanded = false;
}
