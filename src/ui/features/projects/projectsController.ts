// src/ui/features/projects/projectsController.ts
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

import { openPanel } from "../../core/floatingUiState";
import { setSelectedProjectId } from "../../core/sessionState";
import { loadProjects } from "./loadProjects";

// ------------------------------------------------------------
// DEPENDENCIES
// ------------------------------------------------------------

type ProjectsControllerDependencies = {
  onStateChange: () => void;
  itemsController: {
    load: (projectId: string) => Promise<void>;
  };
};

// ------------------------------------------------------------
// PUBLIC CONTROLLER API
// ------------------------------------------------------------

type ProjectsController = {
  load: () => Promise<void>;
  selectProject: (projectId: string) => void;
};

// ------------------------------------------------------------
// CONTROLLER FACTORY
// ------------------------------------------------------------

export function createProjectsController(
  dependencies: ProjectsControllerDependencies,
): ProjectsController {
  const { onStateChange, itemsController } = dependencies;

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
  // SELECT PROJECT WORKFLOW
  // ----------------------------------------------------------

  function selectProject(projectId: string): void {
    setSelectedProjectId(projectId);

    openPanel("items");

    itemsController.load(projectId);
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  return {
    load,
    selectProject,
  };
}
