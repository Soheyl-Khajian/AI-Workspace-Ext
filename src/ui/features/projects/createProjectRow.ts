// src/ui/features/projects/createProjectRow.ts
// ------------------------------------------------------------
// PROJECT ROW COMPONENT
// ------------------------------------------------------------
//
// Responsibilities:
// - create one project row button
// - reflect selected state visually
// - expose project identity via dataset
// - remain purely presentational
//
// IMPORTANT:
//
// - No click listeners
// - No state mutation
// - No import except TYPE
// ------------------------------------------------------------

import type { Project } from "../../../models/project";

export function createProjectRow(
  project: Project,
  selected: boolean,
): HTMLDivElement {
  // ----------------------------------------------------------
  // PROJECT ROW
  // ----------------------------------------------------------

  const rowEl = document.createElement("div");
  rowEl.className = "aiw-project-row";

  const projectTextEl = document.createElement("span");
  projectTextEl.className = "aiw-project-text";
  projectTextEl.textContent = project.name;
  rowEl.append(projectTextEl);

  // Expose project identity to parent interaction systems
  rowEl.dataset.projectId = project.id;

  if (selected) {
    rowEl.classList.add("aiw-project-row--selected");
  }

  // ----------------------------------------------------------
  // RENAME BUTTON
  // ----------------------------------------------------------

  const renameButtonEl = document.createElement("button");
  renameButtonEl.type = "button";
  renameButtonEl.className = "aiw-project-rename";
  renameButtonEl.textContent = "✎";

  // Expose project identity to parent interaction systems
  renameButtonEl.dataset.projectId = project.id;

  // ----------------------------------------------------------
  // DELETE BUTTON
  // ----------------------------------------------------------

  const deleteButtonEl = document.createElement("button");
  deleteButtonEl.type = "button";
  deleteButtonEl.className = "aiw-project-delete";
  deleteButtonEl.textContent = "×";

  // Expose project identity to parent interaction systems
  deleteButtonEl.dataset.projectId = project.id;

  rowEl.append(renameButtonEl, deleteButtonEl);

  return rowEl;
}
