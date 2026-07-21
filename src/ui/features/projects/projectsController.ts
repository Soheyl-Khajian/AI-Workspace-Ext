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
import {
  getSelectedProjectId,
  setSelectedProjectId,
} from "../../core/sessionState";
import { loadProjects } from "./loadProjects";
import {
  createProject,
  deleteProjectCascade,
  renameProject as storageRenameProject,
} from "../../../storage";
import { toErrorMessage } from "../../shared/toErrorMessage";

// ------------------------------------------------------------
// DEPENDENCIES
// ------------------------------------------------------------

type ProjectsControllerDependencies = {
  onStateChange: () => void;
  notify: (message: string) => void;
  itemsController: {
    load: (projectId: string) => Promise<void>;
    clearSelection: () => void;
  };
};

// ------------------------------------------------------------
// PUBLIC CONTROLLER API
// ------------------------------------------------------------

export type ProjectsController = {
  load: () => Promise<void>;
  selectProject: (projectId: string) => void;
  create: (name: string) => Promise<void>;
  renameProject: (projectId: string, name: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
};

// ------------------------------------------------------------
// CONTROLLER FACTORY
// ------------------------------------------------------------

export function createProjectsController(
  dependencies: ProjectsControllerDependencies,
): ProjectsController {
  const { onStateChange, notify, itemsController } = dependencies;

  // ----------------------------------------------------------
  // LOAD PROJECTS WORKFLOW
  // ----------------------------------------------------------

  async function load(): Promise<void> {
    try {
      await loadProjects();
    } finally {
      onStateChange();
    }
  }

  // ----------------------------------------------------------
  // SELECT PROJECT WORKFLOW
  // ----------------------------------------------------------

  function selectProject(projectId: string): void {
    setSelectedProjectId(projectId);

    openPanel("items");

    itemsController.clearSelection();
    itemsController.load(projectId);
  }

  // ----------------------------------------------------------
  // CREATE PROJECT WORKFLOW
  // ----------------------------------------------------------

  async function create(name: string): Promise<void> {
    try {
      await createProject(name);
    } catch (error) {
      // Surface the failure and keep the form input so the user can retry.
      notify(toErrorMessage(error, "Couldn't create project."));
      return;
    }
    await loadProjects();
    onStateChange();
  }

  // ----------------------------------------------------------
  // RENAME PROJECT WORKFLOW
  // ----------------------------------------------------------

  async function renameProject(projectId: string, name: string): Promise<void> {
    try {
      await storageRenameProject(projectId, name);
    } catch (error) {
      notify(toErrorMessage(error, "Couldn't rename project."));
      return;
    }
    await loadProjects();
    onStateChange();
  }

  // ----------------------------------------------------------
  // DELETE PROJECT WORKFLOW
  // ----------------------------------------------------------

  async function deleteProject(projectId: string): Promise<void> {
    const selectedProjectId = getSelectedProjectId();
    try {
      await deleteProjectCascade(projectId);
    } catch (error) {
      // Deletion failed → leave selection/panel untouched (project still exists).
      notify(toErrorMessage(error, "Couldn't delete project."));
      return;
    }
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
      openPanel("projects");
    }
    await loadProjects();
    onStateChange();
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  return {
    load,
    selectProject,
    create,
    renameProject,
    deleteProject,
  };
}
