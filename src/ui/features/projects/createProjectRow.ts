// src/ui/features/projects/createProjectRow.ts
// ------------------------------------------------------------
// PROJECT ROW COMPONENT
// ------------------------------------------------------------
//
// Responsibility:
//
// - create one project row
// - render the project name span, OR the rename input when the
//   row is in editing state (hydrated from the rename draft)
// - reflect selected state visually
// - render the deselect strip ONLY on the selected row
//   (release selection — not a checkbox, not delete)
// - expose project identity via dataset
//
// IMPORTANT:
//
// - NO listeners (delegation in projectsHandlers owns all events)
// - NO state mutation (reads rename draft state for hydration only)
// - NO focus management (the panel renderer focuses after attach —
//   focus() on a detached element is a silent no-op)
// ------------------------------------------------------------

import type { Project } from "../../../models/project";

import { PROJECT_RENAME_INPUT_CLASS } from "./projectsHandlers";
import { getRenameDraft } from "./projectsRenameState";

// ------------------------------------------------------------
// ROW FLAGS
// ------------------------------------------------------------
//
// Named-flags object instead of positional booleans: two same-typed
// positional flags invite silent argument swaps the compiler
// cannot catch (same rule as the panel shell's PanelContext).
// ------------------------------------------------------------

type ProjectRowFlags = {
  selected: boolean;
  editing: boolean;
};

export function createProjectRow(
  project: Project,
  flags: ProjectRowFlags,
): HTMLDivElement {
  // ----------------------------------------------------------
  // PROJECT ROW
  // ----------------------------------------------------------

  const rowEl = document.createElement("div");
  rowEl.className = "aiw-project-row";

  // Expose project identity to parent interaction systems
  rowEl.dataset.projectId = project.id;

  if (flags.selected) {
    rowEl.classList.add("aiw-project-row--selected");
  }

  // ----------------------------------------------------------
  // PROJECT NAME / RENAME INPUT
  //
  // Editing swaps the name span for an input. The input carries
  // no listeners and receives no focus here — delegation and the
  // post-attach focus both live outside this component.
  // ----------------------------------------------------------

  if (flags.editing) {
    const renameInputEl = document.createElement("input");
    renameInputEl.type = "text";
    renameInputEl.className = PROJECT_RENAME_INPUT_CLASS;
    // Draft wins over the stored name; ?? keeps a deliberately
    // cleared ("") draft from resurrecting the old text
    renameInputEl.value = getRenameDraft() ?? project.name;
    rowEl.append(renameInputEl);
  } else {
    const projectTextEl = document.createElement("span");
    projectTextEl.className = "aiw-project-text";
    projectTextEl.textContent = project.name;
    rowEl.append(projectTextEl);
  }

  // ----------------------------------------------------------
  // DESELECT BUTTON (selected row only)
  // ----------------------------------------------------------

  if (flags.selected) {
    const deselectButtonEl = document.createElement("button");
    deselectButtonEl.type = "button";
    deselectButtonEl.className = "aiw-project-deselect";
    deselectButtonEl.textContent = "⏏";
    rowEl.append(deselectButtonEl);
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
