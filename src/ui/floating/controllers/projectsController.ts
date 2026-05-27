// src/ui/floating/controllers/projectsController.ts
// ------------------------------------------------------------
// PROJECTS CONTROLLER (FEATURE ORCHESTRATOR)
// ------------------------------------------------------------
//
// Responsibility:
//
// - orchestrate projects feature lifecycle
// - coordinate async loading workflows
// - trigger UI refresh cycles after state changes
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO DOM access
// - NO rendering logic
// - NO direct storage access
// - NO repository implementation logic
// - NO direct state ownership
//
// This layer ONLY coordinates systems.
//
// Data flow:
//
// controller
//    ↓
// loadProjects()
//    ↓
// projectsState
//    ↓
// renderer re-reads state
// ------------------------------------------------------------

import { loadProjects } from "./loadProjects";

// ------------------------------------------------------------
// DEPENDENCIES
// ------------------------------------------------------------

type ProjectsControllerDependencies = {
  /*
    Callback provided by parent UI controller.

    This callback triggers a complete UI render cycle
    after runtime state has changed.
  */
  onStateChange: () => void;
};

// ------------------------------------------------------------
// PUBLIC CONTROLLER API
// ------------------------------------------------------------

type ProjectsController = {
  /*
    Starts projects loading lifecycle.

    Flow:

    1. execute async loadProjects()
    2. projectsState mutates internally
    3. notify UI to re-render
  */
  load: () => Promise<void>;
};

// ------------------------------------------------------------
// CONTROLLER FACTORY
// ------------------------------------------------------------

export function createProjectsController(
  dependencies: ProjectsControllerDependencies,
): ProjectsController {
  const { onStateChange } = dependencies;

  // ----------------------------------------------------------
  // LOAD PROJECTS WORKFLOW
  // ----------------------------------------------------------

  async function load(): Promise<void> {
    try {
      /*
        Execute projects loading workflow.

        loadProjects() is responsible for:
        - loading state mutation
        - error state mutation
        - projects state mutation
      */
      await loadProjects();
    } finally {
      /*
        Always trigger UI refresh after async lifecycle ends.

        UI may now reflect:
        - loaded projects
        - loading completion
        - empty state
        - error state

        finally() guarantees render consistency even if
        loading fails internally.
      */
      onStateChange();
    }
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  return {
    load,
  };
}
