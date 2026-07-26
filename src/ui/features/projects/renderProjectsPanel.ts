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
// - focus the rename input after attach (rename editing)
//
// IMPORTANT:
//
// - PURE renderer — with ONE deliberate DOM side effect: focusing
//   the rename input it just rendered. That is interactive state
//   of its own output, not application state; no state module is
//   ever mutated here.
// - NO state mutation
// - NO storage access
// - NO async logic
// - NO business logic
// - NO global DOM queries (the focus query is scoped to the
//   panel this renderer just built)
// ------------------------------------------------------------

import type { Project } from "../../../models/project";

import { createFloatingPanelShell } from "../../shared/createFloatingPanelShell";
import { createPanelState } from "../../shared/createPanelState";
import { getSelectedProjectId } from "../../core/sessionState";
import { createProjectRow } from "./createProjectRow";
import {
  getProjects,
  getProjectsError,
  isProjectsLoading,
} from "./projectsState";
import { getCreateProjectNameDraft } from "./projectsDraftState";
import { getEditingProjectId, getRenameDraft } from "./projectsRenameState";
import { PROJECT_RENAME_INPUT_SELECTOR } from "./projectsHandlers";

export function renderProjectsPanel(containerEl: HTMLElement): HTMLElement {
  const shell = createFloatingPanelShell("Projects");

  // ------------------------------------------------------------
  // READ RUNTIME STATE SNAPSHOT
  // ------------------------------------------------------------

  const loading = isProjectsLoading();
  const error = getProjectsError();
  const projects = getProjects();
  const selectedProjectId = getSelectedProjectId();
  const editingProjectId = getEditingProjectId();
  const renameDraft = getRenameDraft();
  const isEmpty = projects.length === 0;

  // ------------------------------------------------------------
  // RENDER HELPERS
  // ------------------------------------------------------------

  function renderProjectsList(projectsList: Project[]): void {
    const listEl = document.createElement("div");
    listEl.className = "aiw-projects-list";

    for (const project of projectsList) {
      const selected = project.id === selectedProjectId;
      const editing = project.id === editingProjectId;
      const rowEl = createProjectRow(project, { selected, editing });
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
  // CREATE FORM
  // ------------------------------------------------------------

  const formEl = document.createElement("div");
  formEl.className = "aiw-create-project-form";

  const inputEl = document.createElement("input");
  inputEl.className = "aiw-create-project-input";
  inputEl.type = "text";
  inputEl.placeholder = "New project name";
  // Re-hydrate in-flight draft (?? — "" means deliberately cleared)
  inputEl.value = getCreateProjectNameDraft() ?? "";

  const buttonEl = document.createElement("button");
  buttonEl.className = "aiw-create-project-submit";
  buttonEl.type = "button";
  buttonEl.textContent = "Create";

  formEl.append(inputEl, buttonEl);
  shell.panelEl.append(formEl);

  // ------------------------------------------------------------
  // FINAL ASSEMBLY
  // ------------------------------------------------------------

  containerEl.append(shell.panelEl);

  // ------------------------------------------------------------
  // RENAME EDITING FOCUS (post-attach)
  //
  // Must run AFTER containerEl.append — focus() on a detached
  // element is a silent no-op. Select-all only on the FIRST
  // render of an edit (draft === null means the user hasn't
  // typed yet); re-selecting after a background re-render would
  // make the next keystroke wipe the user's text.
  // ------------------------------------------------------------

  const renameInputEl = shell.panelEl.querySelector(
    PROJECT_RENAME_INPUT_SELECTOR,
  );

  if (renameInputEl instanceof HTMLInputElement) {
    renameInputEl.focus();

    if (renameDraft === null) {
      renameInputEl.select();
    }
  }

  return shell.panelEl;
}
