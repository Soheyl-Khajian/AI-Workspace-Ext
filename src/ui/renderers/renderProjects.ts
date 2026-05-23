// src/ui/renderers/renderProjects.ts
// ------------------------------------------------------------
// Responsibility:
// Render Project domain objects into a sidebar container.
//
// Rules:
// - Pure rendering only
// - No DB access
// - No application state ownership
// - Interaction delegated via callback
// ------------------------------------------------------------

import { Project } from "../../models/project";

/**
 * Render the project list UI.
 */
export function renderProjects(
  container: HTMLElement,
  projects: Project[],
  selectedProjectId: string | null,
  onSelectProject: (projectId: string) => void,
) {
  // Reset previous UI before re-render
  container.textContent = "";

  // Empty state rendering
  if (projects.length === 0) {
    const emptyStateEl = document.createElement("div");

    emptyStateEl.className = "aiw-empty";
    emptyStateEl.textContent = "No projects yet";

    container.append(emptyStateEl);

    return;
  }

  // Main render loop
  for (const project of projects) {
    const projectRowEl = createProjectRow(
      project,
      selectedProjectId,
      onSelectProject,
    );

    container.append(projectRowEl);
  }
}

/**
 * Create a single project row element.
 */
function createProjectRow(
  project: Project,
  selectedProjectId: string | null,
  onSelectProject: (projectId: string) => void,
): HTMLDivElement {
  const projectRowEl = document.createElement("div");

  projectRowEl.className = "aiw-projects-row";
  projectRowEl.textContent = project.name;

  // Useful for debugging / future event delegation
  projectRowEl.dataset.projectId = project.id;

  // Selected-state styling
  if (project.id === selectedProjectId) {
    projectRowEl.classList.add("aiw-projects-row--active");
  }

  // Interaction binding
  projectRowEl.addEventListener("click", () => {
    onSelectProject(project.id);
  });

  return projectRowEl;
}
