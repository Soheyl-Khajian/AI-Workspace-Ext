// src/ui/features/projects/projectsHandlers.ts
// ------------------------------------------------------------
// PROJECTS EVENT HANDLERS (FEATURE BINDINGS)
// ------------------------------------------------------------
//
// Responsibility:
//
// - own the projects panel's DOM event handlers
//   (select / create / rename / delete)
// - own the projects selector constants + dataset key
// - contribute EventBinding[] to the floating controller's
//   declarative add/remove table via createProjectsHandlers()
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO direct storage access (delegates to projectsController)
// - NO rendering logic (requests re-render via deps.requestRender)
// - NO global DOM queries (scoped to deps.panelsEl)
// - listener lifecycle is owned by the CALLER (register + teardown);
//   only the rename input's transient keydown/blur listeners are
//   attached here, and they die with the input element
// ------------------------------------------------------------

import type { ProjectsController } from "./projectsController";
import type { EventBinding } from "../../core/eventBindings";
import { asListener } from "../../core/eventBindings";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const PROJECT_ROW_SELECTOR = ".aiw-project-row";
const PROJECT_DELETE_SELECTOR = ".aiw-project-delete";
const PROJECT_ID_DATASET_KEY = "projectId";
const PROJECT_CREATE_BUTTON_SELECTOR = ".aiw-create-project-submit";
const PROJECT_RENAME_SELECTOR = ".aiw-project-rename";

const PROJECT_RENAME_INPUT_CLASS = "aiw-project-rename-input";
export const PROJECT_RENAME_INPUT_SELECTOR = `.${PROJECT_RENAME_INPUT_CLASS}`;

type ProjectsHandlersDependencies = {
  panelsEl: HTMLElement;
  projectsController: ProjectsController;
  notify: (message: string) => void;
  requestRender: () => void;
};

export function createProjectsHandlers(
  deps: ProjectsHandlersDependencies,
): EventBinding[] {
  // ----------------------------------------------------------
  // PROJECT SELECTION HANDLER
  // ----------------------------------------------------------

  function handleSelectProject(event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest(PROJECT_RENAME_SELECTOR)) return;
    if (target.closest(PROJECT_DELETE_SELECTOR)) return;
    if (target.closest(PROJECT_RENAME_INPUT_SELECTOR)) return;

    const row = target.closest(PROJECT_ROW_SELECTOR);

    if (!(row instanceof HTMLElement)) {
      return;
    }

    const projectId = row.dataset[PROJECT_ID_DATASET_KEY];

    if (!projectId) {
      return;
    }

    deps.projectsController.selectProject(projectId);
  }

  // ----------------------------------------------------------
  // PROJECT CREATION HANDLER
  // ----------------------------------------------------------

  async function handleCreateProject(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const submitButton = target.closest(PROJECT_CREATE_BUTTON_SELECTOR);
    if (!(submitButton instanceof HTMLButtonElement)) {
      return;
    }

    const input = deps.panelsEl.querySelector(".aiw-create-project-input");
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const trimmedNewProjectName = input.value.trim();
    if (trimmedNewProjectName.length === 0) {
      deps.notify("Project name can't be empty");
      return;
    }

    await deps.projectsController.create(trimmedNewProjectName);
  }

  // ----------------------------------------------------------
  // PROJECT RENAME HANDLER
  // ----------------------------------------------------------

  function handleRenameProject(event: MouseEvent): void {
    let committed = false;

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const renameButton = target.closest(PROJECT_RENAME_SELECTOR);
    if (!(renameButton instanceof HTMLButtonElement)) {
      return;
    }

    const projectId = renameButton.dataset[PROJECT_ID_DATASET_KEY];
    if (!projectId) {
      return;
    }

    const row = renameButton.closest(PROJECT_ROW_SELECTOR);
    if (!(row instanceof HTMLElement)) {
      return;
    }

    const span = row.querySelector(".aiw-project-text");
    if (!(span instanceof HTMLSpanElement)) {
      return;
    }

    const currentName = span.textContent ?? "";

    const renameInputEl = document.createElement("input");
    renameInputEl.value = currentName;
    renameInputEl.className = PROJECT_RENAME_INPUT_CLASS;

    span.replaceWith(renameInputEl);

    renameInputEl.focus();
    renameInputEl.select();

    renameInputEl.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        committed = true;
        const trimmedValue = renameInputEl.value.trim();
        if (trimmedValue) {
          await deps.projectsController.renameProject(projectId, trimmedValue);
        } else {
          deps.requestRender();
        }
      }

      if (event.key === "Escape") {
        committed = true;
        deps.requestRender();
      }
    });

    renameInputEl.addEventListener("blur", async () => {
      if (committed) return;
      const trimmedValue = renameInputEl.value.trim();
      if (trimmedValue && trimmedValue !== currentName) {
        await deps.projectsController.renameProject(projectId, trimmedValue);
      } else {
        deps.requestRender();
      }
    });
  }

  // ----------------------------------------------------------
  // PROJECT DELETE HANDLER
  // ----------------------------------------------------------

  async function handleDeleteProject(event: MouseEvent): Promise<void> {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const deleteButton = target.closest(PROJECT_DELETE_SELECTOR);
    if (!(deleteButton instanceof HTMLElement)) {
      return;
    }

    const projectId = deleteButton.dataset[PROJECT_ID_DATASET_KEY];
    if (!projectId) {
      return;
    }

    if (!window.confirm("Delete this project and all its items?")) return;

    await deps.projectsController.deleteProject(projectId);
  }

  // ----------------------------------------------------------
  // EVENT BINDINGS
  // ----------------------------------------------------------

  const eventBindings: EventBinding[] = [
    [deps.panelsEl, "click", asListener(handleSelectProject)],
    [deps.panelsEl, "click", asListener(handleCreateProject)],
    [deps.panelsEl, "click", asListener(handleRenameProject)],
    [deps.panelsEl, "click", asListener(handleDeleteProject)],
  ];

  return eventBindings;
}
