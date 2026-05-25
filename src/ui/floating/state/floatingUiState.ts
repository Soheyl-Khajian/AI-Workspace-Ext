// src/ui/floating/state/floatingUiState.ts
// ------------------------------------------------------------
// FLOATING UI STATE
// ------------------------------------------------------------
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

import type { OrbPanelId } from "../types";

type FloatingUiState = {
  orbExpanded: boolean;
  activePanel: OrbPanelId | null;
};

// ----------------------------------------------------------
// PRIVATE STATE
// ----------------------------------------------------------

const state: FloatingUiState = {
  orbExpanded: false,
  activePanel: null,
};

// ----------------------------------------------------------
// GETTERS
// ----------------------------------------------------------

export function isOrbExpanded(): boolean {
  return state.orbExpanded;
}

export function getActivePanel(): OrbPanelId | null {
  return state.activePanel;
}

// ----------------------------------------------------------
// MUTATIONS
// ----------------------------------------------------------

export function expandOrb(): void {
  state.orbExpanded = true;
}

export function collapseOrb(): void {
  state.orbExpanded = false;
  state.activePanel = null;
}

export function openPanel(panel: OrbPanelId): void {
  state.activePanel = panel;
  state.orbExpanded = true;
}

export function closePanel(): void {
  state.activePanel = null;
}

export function togglePanel(panel: OrbPanelId): void {
  const current = state.activePanel;

  if (current === panel) {
    state.activePanel = null;
  } else {
    state.activePanel = panel;
    state.orbExpanded = true;
  }
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------

export function resetState(): void {
  state.orbExpanded = false;
  state.activePanel = null;
}
