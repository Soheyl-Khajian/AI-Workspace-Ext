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
// - render the "…" menu trigger, and PROJECT the row menu
//   (Rename / Delete) when this row's menu is open in state
// - expose project identity via dataset
//
// IMPORTANT:
//
// - NO listeners (delegation in projectsHandlers owns all events)
// - NO state mutation (reads rename/menu state for hydration only)
// - NO focus management (the panel renderer focuses after attach —
//   focus() on a detached element is a silent no-op)
// - the menu is PROJECTED from projectsMenuState, never toggled in
//   the DOM: a background wipe-rebuild re-creates an open menu
//   because openness is a recorded fact, not a DOM condition
//   (DOM-held-state ledger)
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
  menuOpen: boolean;
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

  if (flags.menuOpen) {
    // Positioning anchor + overflow release for the floating menu
    // (see panels/menus.css)
    rowEl.classList.add("aiw-project-row--menu-open");
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
  // MENU TRIGGER ("…")
  //
  // Replaces the old rename (✎) and delete (×) strips: the row
  // actions live in the menu now.
  // ----------------------------------------------------------

  const menuTriggerEl = document.createElement("button");
  menuTriggerEl.type = "button";
  menuTriggerEl.className = "aiw-row-menu-trigger";
  menuTriggerEl.textContent = "…";

  // Expose project identity to parent interaction systems
  menuTriggerEl.dataset.projectId = project.id;

  rowEl.append(menuTriggerEl);

  // ----------------------------------------------------------
  // ROW MENU (projected from state)
  // ----------------------------------------------------------

  if (flags.menuOpen) {
    const menuEl = document.createElement("div");
    menuEl.className = "aiw-row-menu";

    const renameItemEl = document.createElement("button");
    renameItemEl.type = "button";
    renameItemEl.className = "aiw-row-menu-item aiw-project-menu-rename";
    renameItemEl.textContent = "Rename";
    renameItemEl.dataset.projectId = project.id;

    const deleteItemEl = document.createElement("button");
    deleteItemEl.type = "button";
    deleteItemEl.className =
      "aiw-row-menu-item aiw-row-menu-item--danger aiw-project-menu-delete";
    deleteItemEl.textContent = "Delete";
    deleteItemEl.dataset.projectId = project.id;

    menuEl.append(renameItemEl, deleteItemEl);
    rowEl.append(menuEl);
  }

  return rowEl;
}
