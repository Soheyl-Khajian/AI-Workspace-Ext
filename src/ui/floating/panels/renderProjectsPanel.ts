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

import {
  getProjects,
  getProjectsError,
  isProjectsLoading,
} from "../state/projectsState";

export function renderProjectsPanel(containerEl: HTMLElement): void {
  // ------------------------------------------------------------
  // READ RUNTIME STATE SNAPSHOT
  // ------------------------------------------------------------

  const loading = isProjectsLoading();
  const error = getProjectsError();
  const projects = getProjects();

  const isEmpty = projects.length === 0;

  // ------------------------------------------------------------
  // PANEL ROOT
  // ------------------------------------------------------------

  const panelEl = document.createElement("section");
  panelEl.className = "aiw-floating-panel";

  // ------------------------------------------------------------
  // PANEL HEADER
  // ------------------------------------------------------------

  const headerEl = document.createElement("header");
  headerEl.className = "aiw-floating-panel__header";

  const titleEl = document.createElement("h2");
  titleEl.className = "aiw-floating-panel__title";
  titleEl.textContent = "Projects";

  headerEl.append(titleEl);

  // ------------------------------------------------------------
  // PANEL BODY
  // ------------------------------------------------------------

  const bodyEl = document.createElement("div");
  bodyEl.className = "aiw-floating-panel__body";

  // ------------------------------------------------------------
  // RENDER HELPERS
  // ------------------------------------------------------------

  function renderLoadingState(): void {
    const loadingStateEl = document.createElement("div");

    loadingStateEl.className = "aiw-projects-state";
    loadingStateEl.textContent = "Loading projects...";

    bodyEl.append(loadingStateEl);
  }

  function renderErrorState(message: string): void {
    const errorStateEl = document.createElement("div");

    errorStateEl.className = "aiw-projects-state aiw-projects-state--error";
    errorStateEl.textContent = message;

    bodyEl.append(errorStateEl);
  }

  function renderEmptyState(): void {
    const emptyStateEl = document.createElement("div");

    emptyStateEl.className = "aiw-projects-state";
    emptyStateEl.textContent = "No projects yet";

    bodyEl.append(emptyStateEl);
  }

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

    bodyEl.append(listEl);
  }

  // ------------------------------------------------------------
  // STATE-DRIVEN RENDER FLOW
  // ------------------------------------------------------------

  if (loading) {
    renderLoadingState();
  } else if (error !== null) {
    renderErrorState(error);
  } else if (isEmpty) {
    renderEmptyState();
  } else {
    renderProjectsList(projects);
  }

  // ------------------------------------------------------------
  // FINAL ASSEMBLY
  // ------------------------------------------------------------

  panelEl.append(headerEl, bodyEl);

  containerEl.append(panelEl);
}
