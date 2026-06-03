// src/ui/core/sessionState.ts
// ------------------------------------------------------------
// SESSION STATE
// ------------------------------------------------------------
// Single source of truth for navigation context.
//
// Responsibility:
// - Holds cross-feature runtime selection state
// - Defines "what the user is currently focused on"
//
// RULES:
// - synchronous memory only
// - no side effects
// - no reactions
// - no async behavior
//
// Controllers may read this state, but should NOT rely on it
// as an implicit communication channel between steps in a flow.
// ------------------------------------------------------------

type SessionState = {
  selectedProjectId: string | null;
  selectedItemId: string | null;
};

// ------------------------------------------------------------
// PRIVATE STATE
// ------------------------------------------------------------
//
// Internal mutable runtime state.
//
// Must NEVER be mutated outside this module.
// ------------------------------------------------------------

const state: SessionState = {
  selectedProjectId: null,
  selectedItemId: null,
};

// ------------------------------------------------------------
// GETTERS
// ------------------------------------------------------------

export function getSelectedProjectId(): string | null {
  return state.selectedProjectId;
}

export function getSelectedItemId(): string | null {
  return state.selectedItemId;
}

// ------------------------------------------------------------
// MUTATIONS
// ------------------------------------------------------------

export function setSelectedProjectId(id: string | null): void {
  state.selectedProjectId = id;
}

export function setSelectedItemId(id: string | null): void {
  state.selectedItemId = id;
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------

export function resetSessionState() {
  state.selectedProjectId = null;
  state.selectedItemId = null;
}
