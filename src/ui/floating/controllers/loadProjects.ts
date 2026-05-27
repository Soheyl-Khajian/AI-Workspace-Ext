// src/ui/floating/controllers/loadProjects.ts
// ------------------------------------------------------------
// LOAD PROJECTS CONTROLLER
// ------------------------------------------------------------
//
// Responsibility:
// - load projects from repository layer
// - synchronize runtime projects state
// - manage loading lifecycle
// - manage error lifecycle
//
// IMPORTANT:
//
// This module is NOT:
//
// - rendering logic
// - DOM manipulation
// - IndexedDB implementation
// - UI event handling
//
// This controller orchestrates:
//
// repository → runtime state
// ------------------------------------------------------------

import { listProjects } from "../../../storage/index";

import { setError, setLoading, setProjects } from "../state/projectsState";

// ------------------------------------------------------------
// LOAD PROJECTS
// ------------------------------------------------------------
//
// Loads projects from persistent storage into runtime UI state.
// ------------------------------------------------------------

export async function loadProjects(): Promise<void> {
  setLoading(true);

  // clear previous UI error state before new load
  setError(null);

  try {
    const projects = await listProjects();

    setProjects(projects);
  } catch (error: unknown) {
    // clear stale runtime state on failed reload
    setProjects([]);

    // normalize unknown failures into UI-safe message
    if (error instanceof Error) {
      setError(error.message);
    } else {
      setError("Failed to load projects.");
    }
  } finally {
    setLoading(false);
  }
}
