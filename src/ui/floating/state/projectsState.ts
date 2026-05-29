// src/ui/floating/state/projectsState.ts
// ------------------------------------------------------------
// PROJECTS RUNTIME STATE
// ------------------------------------------------------------
//
// Responsibility:
// - hold runtime projects state in memory
// - expose controlled getters
// - expose controlled mutations
// - isolate render state from persistent storage
//
// IMPORTANT:
//
// This module is NOT:
//
// - IndexedDB storage
// - repository layer
// - async loading logic
// - rendering logic
// - DOM manipulation
// - business orchestration
//
// This module ONLY answers:
//
// "What is the current projects UI state?"
// ------------------------------------------------------------

// ------------------------------------------------------------
// STATE SHAPE
// ------------------------------------------------------------
//
// Represents runtime UI state for projects.
//
// IMPORTANT:
//
// This state exists ONLY in memory during runtime.
// It is NOT persistent storage.
// ------------------------------------------------------------

import type { Project } from "../../../models/project";

type ProjectsState = {
  projects: Project[];
  selectedProjectId: string | null;
  loading: boolean;
  error: string | null;
};

// ------------------------------------------------------------
// PRIVATE STATE
// ------------------------------------------------------------
//
// Internal mutable runtime state.
//
// Must NEVER be mutated outside this module.
// ------------------------------------------------------------

const state: ProjectsState = {
  projects: [],
  selectedProjectId: null,
  loading: false,
  error: null,
};

// ------------------------------------------------------------
// GETTERS
// ------------------------------------------------------------
//
// Read-only access to runtime state.
//
// IMPORTANT:
//
// Getters should avoid leaking mutable references.
// ------------------------------------------------------------

export function getProjects(): Project[] {
  return [...state.projects];
}

export function hasProjects(): boolean {
  return state.projects.length > 0;
}

export function getSelectedProjectId(): string | null {
  return state.selectedProjectId;
}

export function isProjectsLoading(): boolean {
  return state.loading;
}

export function getProjectsError(): string | null {
  return state.error;
}

// ------------------------------------------------------------
// MUTATIONS
// ------------------------------------------------------------
//
// Controlled state mutations.
//
// IMPORTANT:
//
// State mutations should preserve ownership boundaries
// and avoid external reference leaks.
// ------------------------------------------------------------

export function setProjects(projectsList: Project[]): void {
  state.projects = [...projectsList];
}

export function setSelectedProjectId(id: string | null): void {
  state.selectedProjectId = id;
}

export function setLoading(loading: boolean): void {
  state.loading = loading;
}

export function setError(error: string | null): void {
  state.error = error;
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------
//
// Restores initial runtime state.
// Useful for teardown/testing/future session resets.
// ------------------------------------------------------------

export function resetProjectsState(): void {
  state.projects = [];
  state.selectedProjectId = null;
  state.loading = false;
  state.error = null;
}
