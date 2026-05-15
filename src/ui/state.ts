// src/ui/state.ts
// ------------------------------------------------------------
// UI STATE MODULE (v0)
//
// Responsibility:
// - Holds in-memory UI state for the sidebar
// - Acts as a controlled cache layer between UI and storage
//
// IMPORTANT RULES:
// - NO IndexedDB access here
// - NO business logic
// - NO validation
// - ONLY in-memory state + safe accessors
// ------------------------------------------------------------

import type { Project } from "../models/project";

/**
 * Internal UI state (single source of truth for runtime UI memory)
 *
 * This object must NEVER be exposed directly.
 * All access goes through getter/setter functions.
 */
type UiState = {
  selectedProjectId: string | null;
  projectsCache: Project[];
};

/**
 * Private module-scoped state
 */
const state: UiState = {
  selectedProjectId: null,
  projectsCache: [],
};

// ------------------------------------------------------------
// SELECTED PROJECT
// ------------------------------------------------------------

export function getSelectedProjectId(): string | null {
  return state.selectedProjectId;
}

export function setSelectedProjectId(projectId: string | null): void {
  state.selectedProjectId = projectId;
}

// ------------------------------------------------------------
// PROJECTS CACHE
// ------------------------------------------------------------

/**
 * Returns a shallow copy of the cached projects array.
 *
 * WHY COPY MATTERS:
 * - Prevents external code from mutating internal array structure
 * - Protects against accidental push/splice/sort mutations
 *
 * NOTE:
 * - This is a SHALLOW copy only.
 * - Project objects inside are still shared references.
 */
export function getProjects(): Project[] {
  return [...state.projectsCache];
}

/**
 * Replaces internal project cache with a new array.
 *
 * WHY COPY MATTERS:
 * - Prevents external array reference from mutating internal state
 *
 * NOTE:
 * - Still shallow (Project objects are not cloned)
 */
export function setProjects(projects: Project[]): void {
  state.projectsCache = [...projects];
}

// ------------------------------------------------------------
// RESET (DEV + SAFETY TOOLING)
// ------------------------------------------------------------

/**
 * Resets UI state to initial defaults.
 *
 * USE CASES:
 * - SPA reinitialization (ChatGPT navigation)
 * - debugging stale state issues
 * - dev seeding cycles
 *
 * WARNING:
 * - Does NOT touch IndexedDB
 * - Does NOT reload data automatically
 */
export function resetState(): void {
  state.selectedProjectId = null;
  state.projectsCache = [];
}
