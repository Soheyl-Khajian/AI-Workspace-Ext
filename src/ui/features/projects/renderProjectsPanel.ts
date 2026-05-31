// src/ui/features/projects/renderProjectsPanel.ts
// ------------------------------------------------------------
// PROJECTS PANEL RENDERER
// ------------------------------------------------------------
//
// Responsibility:
//
// - render projects floating panel
// - render projects runtime states
// - mount projects UI into provided container
//
// IMPORTANT:
//
// - PURE renderer
// - NO state mutation
// - NO storage access
// - NO async logic
// - NO business logic
// - NO global DOM queries
// ------------------------------------------------------------

import type { Project } from "../../../models/project";
import { createFloatingPanelShell } from "../../shared/createFloatingPanelShell";
import { createPanelState } from "../../shared/createPanelState";
import { createProjectRow } from "./createProjectRow";
import {
  getProjects,
  getSelectedProjectId,
  getProjectsError,
  isProjectsLoading,
} from "./projectsState";

export function renderProjectsPanel(containerEl: HTMLElement): void {
  const shell = createFloatingPanelShell("Projects");

  // ------------------------------------------------------------
  // READ RUNTIME STATE SNAPSHOT
  // ------------------------------------------------------------

  const loading = isProjectsLoading();
  const error = getProjectsError();
  const projects = getProjects();
  const selectedProjectId = getSelectedProjectId();

  const isEmpty = projects.length === 0;

  // ------------------------------------------------------------
  // RENDER HELPERS
  // ------------------------------------------------------------

  function renderProjectsList(projectsList: Project[]): void {
    const listEl = document.createElement("div");

    listEl.className = "aiw-projects-list";

    for (const project of projectsList) {
      const selected = project.id === selectedProjectId;

      const rowEl = createProjectRow(project, selected);

      listEl.append(rowEl);
    }

    shell.bodyEl.append(listEl);
  }

  // ------------------------------------------------------------
  // STATE-DRIVEN RENDER FLOW
  // ------------------------------------------------------------

  if (loading) {
    const loadingStateEl = createPanelState({
      variant: "loading",
      message: "Loading...",
    });

    shell.bodyEl.append(loadingStateEl);
  } else if (error !== null) {
    const errorStateEl = createPanelState({ variant: "error", message: error });

    shell.bodyEl.append(errorStateEl);
  } else if (isEmpty) {
    const emptyStateEl = createPanelState({
      variant: "empty",
      message: "No projects yet",
    });

    shell.bodyEl.append(emptyStateEl);
  } else {
    renderProjectsList(projects);
  }

  // ------------------------------------------------------------
  // FINAL ASSEMBLY
  // ------------------------------------------------------------

  containerEl.append(shell.panelEl);
}
