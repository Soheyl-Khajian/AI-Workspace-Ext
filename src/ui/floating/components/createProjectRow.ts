// src/ui/floating/components/createProjectRow.ts
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
): HTMLButtonElement {
  const rowEl = document.createElement("button");

  rowEl.type = "button";
  rowEl.className = "aiw-project-row";
  rowEl.textContent = project.name;

  // Expose project identity to parent interaction systems
  rowEl.dataset.projectId = project.id;

  if (selected) {
    rowEl.classList.add("aiw-project-row--selected");
  }

  return rowEl;
}
