// src/ui/floating/panels/renderProjectsPanel.ts
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
import { createFloatingPanelShell } from "../components/createFloatingPanelShell";
import { createPanelState } from "../components/createPanelState";
import {
  getProjects,
  getProjectsError,
  isProjectsLoading,
} from "../state/projectsState";

export function renderProjectsPanel(containerEl: HTMLElement): void {
  const shell = createFloatingPanelShell("Projects");

  // ------------------------------------------------------------
  // READ RUNTIME STATE SNAPSHOT
  // ------------------------------------------------------------

  const loading = isProjectsLoading();
  const error = getProjectsError();
  const projects = getProjects();

  const isEmpty = projects.length === 0;

  // ------------------------------------------------------------
  // RENDER HELPERS
  // ------------------------------------------------------------

  function renderProjectsList(projectsList: Project[]): void {
    const listEl = document.createElement("div");

    listEl.className = "aiw-projects-list";

    for (const project of projectsList) {
      const rowEl = document.createElement("button");

      rowEl.type = "button";
      rowEl.className = "aiw-project-row";

      rowEl.textContent = project.name;

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
