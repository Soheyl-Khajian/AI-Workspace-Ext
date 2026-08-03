// src/ui/features/projects/projectsHandlers.ts
// ------------------------------------------------------------
// PROJECTS EVENT HANDLERS (FEATURE BINDINGS)
// ------------------------------------------------------------
//
// Responsibility:
//
// - own the projects panel's DOM event handlers
//   (select / deselect / create / row menu / rename / delete /
//   draft capture)
// - own the projects selector constants + dataset key
// - contribute EventBinding[] to the floating controller's
//   declarative add/remove table via createProjectsHandlers()
// - handleSelectProject treats ANY click inside a row as "select"
//   unless guarded: every interactive element added inside a row
//   MUST be excluded there (deselect / menu trigger / menu / inputs)
// - rename editing is STATE-DRIVEN: the click handler only flips
//   projectsRenameState, the renderer draws the input, and
//   commit / cancel / draft capture are permanent delegated
//   bindings in the table below
// - the row menu is STATE-DRIVEN the same way: handlers only flip
//   projectsMenuState, the renderer projects the open menu, and
//   in-panel dismissal is a delegated click that lets the click
//   proceed to its normal job (no click-eating veil)
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO direct storage access (delegates to projectsController)
// - NO rendering logic (requests re-render via deps.requestRender)
// - NO global DOM queries (scoped to deps.panelsEl)
// - NO element-attached listeners — listener lifecycle is owned
//   by the CALLER (register + teardown), with no exceptions
// ------------------------------------------------------------

import type { ProjectsController } from "./projectsController";
import type { EventBinding } from "../../core/eventBindings";

import { asListener } from "../../core/eventBindings";
import { setCreateProjectNameDraft } from "./projectsDraftState";
import {
  getEditingProjectId,
  setRenameDraft,
  startRenameEditing,
  stopRenameEditing,
} from "./projectsRenameState";
import { getProjects } from "./projectsState";
import {
  closeProjectMenu,
  getOpenProjectMenuId,
  openProjectMenu,
} from "./projectsMenuState";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const PROJECT_ROW_SELECTOR = ".aiw-project-row";
const PROJECT_DESELECT_SELECTOR = ".aiw-project-deselect";
const PROJECT_ID_DATASET_KEY = "projectId";
const PROJECT_CREATE_BUTTON_SELECTOR = ".aiw-create-project-submit";
const PROJECT_CREATE_INPUT_SELECTOR = ".aiw-create-project-input";

export const PROJECT_RENAME_INPUT_CLASS = "aiw-project-rename-input";
export const PROJECT_RENAME_INPUT_SELECTOR = `.${PROJECT_RENAME_INPUT_CLASS}`;

// Shared row-menu classes (role-named: the item row menus reuse
// them — see panels/menus.css)
const ROW_MENU_TRIGGER_SELECTOR = ".aiw-row-menu-trigger";
const ROW_MENU_SELECTOR = ".aiw-row-menu";
const PROJECT_MENU_RENAME_SELECTOR = ".aiw-project-menu-rename";
const PROJECT_MENU_DELETE_SELECTOR = ".aiw-project-menu-delete";

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

    if (target.closest(PROJECT_DESELECT_SELECTOR)) return;
    if (target.closest(ROW_MENU_TRIGGER_SELECTOR)) return;
    if (target.closest(ROW_MENU_SELECTOR)) return;
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
  // PROJECT DESELECTION HANDLER
  // ----------------------------------------------------------

  function handleDeselectProject(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const deselectButton = target.closest(PROJECT_DESELECT_SELECTOR);
    if (!(deselectButton instanceof HTMLButtonElement)) {
      return;
    }

    deps.projectsController.deselectProject();
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

    const input = deps.panelsEl.querySelector(PROJECT_CREATE_INPUT_SELECTOR);
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
  // ROW MENU HANDLERS (state-driven, projected by the renderer)
  // ----------------------------------------------------------

  function handleProjectMenuToggle(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const trigger = target.closest(ROW_MENU_TRIGGER_SELECTOR);
    if (!(trigger instanceof HTMLButtonElement)) {
      return;
    }

    const projectId = trigger.dataset[PROJECT_ID_DATASET_KEY];
    if (!projectId) {
      return;
    }

    // No menus while an inline edit is active (locked v0.5 rule).
    // Same-feature knowledge, so rename state is read directly —
    // unlike core, which gets hasActiveInlineEdit injected.
    if (getEditingProjectId() !== null) {
      return;
    }

    // Same trigger toggles closed; another row's trigger replaces
    // (last write wins in the state module).
    if (getOpenProjectMenuId() === projectId) {
      closeProjectMenu();
    } else {
      openProjectMenu(projectId);
    }

    deps.requestRender();
  }

  /*
  In-panel dismissal: any click that is neither the trigger (the
  toggle owns it) nor inside the menu (menu items own it) closes
  the menu and then proceeds to do its normal job — no
  click-eating veil, per the locked design. Clicks outside the
  floating UI are layered in core's outside-click handler instead.
*/
  function handleProjectMenuDismiss(event: MouseEvent): void {
    if (getOpenProjectMenuId() === null) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest(ROW_MENU_TRIGGER_SELECTOR)) return;
    if (target.closest(ROW_MENU_SELECTOR)) return;

    closeProjectMenu();
    deps.requestRender();
  }

  // ----------------------------------------------------------
  // PROJECT RENAME HANDLERS (state-driven editing)
  //
  // The click handler only flips state; the renderer draws the
  // input. Commit/cancel are permanent delegated bindings —
  // note focusout, not blur: blur doesn't bubble, so a
  // delegated listener would never hear it.
  // ----------------------------------------------------------

  function handleStartProjectRename(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const renameItem = target.closest(PROJECT_MENU_RENAME_SELECTOR);
    if (!(renameItem instanceof HTMLButtonElement)) {
      return;
    }

    const projectId = renameItem.dataset[PROJECT_ID_DATASET_KEY];
    if (!projectId) {
      return;
    }

    // Rename lives in the menu now: close it, then enter the
    // existing inline edit.
    closeProjectMenu();
    startRenameEditing(projectId);
    deps.requestRender();
  }

  /*
  Shared by Enter and focusout. The editing-state guard replaces
  the old `committed` flag: once a commit/cancel settles the
  state, the focusout fired by the re-render destroying the
  input finds editing already null and does nothing.

  KNOWN LIMIT: Chrome also fires focusout when a re-render
  destroys the input mid-edit (e.g. capturing while renaming).
  Editing is still active then, so this commits (text changed)
  or cancels (unchanged) instead of letting the redrawn input
  carry on. Nothing is lost, and the state guard still prevents
  a double commit. If background re-renders become common,
  distinguish "destroyed by render" from "left by user" with a
  deferred isConnected check.
*/
  async function commitOrCancelRename(
    inputEl: HTMLInputElement,
  ): Promise<void> {
    const editingProjectId = getEditingProjectId();
    if (editingProjectId === null) {
      return;
    }

    // Resolve the current name from state at commit time (no
    // closure over render-time DOM, no staleness).
    const currentName =
      getProjects().find((candidate) => candidate.id === editingProjectId)
        ?.name ?? "";

    const trimmedValue = inputEl.value.trim();

    if (trimmedValue.length > 0 && trimmedValue !== currentName) {
      // Controller stops editing on success; keeps it on failure.
      await deps.projectsController.renameProject(
        editingProjectId,
        trimmedValue,
      );
      return;
    }

    // Empty or unchanged → cancel, no storage write.
    stopRenameEditing();
    deps.requestRender();
  }

  async function handleRenameKeydown(event: KeyboardEvent): Promise<void> {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) ||
      !target.matches(PROJECT_RENAME_INPUT_SELECTOR)
    ) {
      return;
    }

    if (event.key === "Enter") {
      await commitOrCancelRename(target);
    }

    if (event.key === "Escape") {
      stopRenameEditing();
      deps.requestRender();
    }
  }

  async function handleRenameFocusOut(event: Event): Promise<void> {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) ||
      !target.matches(PROJECT_RENAME_INPUT_SELECTOR)
    ) {
      return;
    }

    await commitOrCancelRename(target);
  }

  // Draft capture: keystrokes → state, no re-render (the DOM
  // already shows the text; the draft exists to survive OTHER
  // re-renders).
  function handleRenameInput(event: Event): void {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      target.matches(PROJECT_RENAME_INPUT_SELECTOR)
    ) {
      setRenameDraft(target.value);
    }
  }

  // ----------------------------------------------------------
  // PROJECT DELETE HANDLER
  // ----------------------------------------------------------

  async function handleDeleteProject(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const deleteItem = target.closest(PROJECT_MENU_DELETE_SELECTOR);
    if (!(deleteItem instanceof HTMLElement)) {
      return;
    }

    const projectId = deleteItem.dataset[PROJECT_ID_DATASET_KEY];
    if (!projectId) {
      return;
    }

    // Close the menu (and re-render) BEFORE the blocking confirm:
    // a cancelled confirm must not leave the menu open.
    closeProjectMenu();
    deps.requestRender();

    if (!window.confirm("Delete this project and all its items?")) return;

    await deps.projectsController.deleteProject(projectId);
  }

  // ----------------------------------------------------------
  // DRAFT CAPTURE HANDLER (typed-text survival)
  //
  // Writes keystrokes into draft state WITHOUT requestRender —
  // the DOM already shows the text. The rename input also fires
  // "input" here but doesn't match this selector, so it's ignored.
  // ----------------------------------------------------------

  function handleCreateProjectInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      target.matches(PROJECT_CREATE_INPUT_SELECTOR)
    ) {
      setCreateProjectNameDraft(target.value);
    }
  }

  // ----------------------------------------------------------
  // EVENT BINDINGS
  // ----------------------------------------------------------

  const eventBindings: EventBinding[] = [
    // clicks
    [deps.panelsEl, "click", asListener(handleSelectProject)],
    [deps.panelsEl, "click", asListener(handleDeselectProject)],
    [deps.panelsEl, "click", asListener(handleCreateProject)],
    [deps.panelsEl, "click", asListener(handleProjectMenuToggle)],
    [deps.panelsEl, "click", asListener(handleProjectMenuDismiss)],
    [deps.panelsEl, "click", asListener(handleStartProjectRename)],
    [deps.panelsEl, "click", asListener(handleDeleteProject)],
    // rename editing lifecycle
    [deps.panelsEl, "keydown", asListener(handleRenameKeydown)],
    [deps.panelsEl, "focusout", asListener(handleRenameFocusOut)],
    // draft capture
    [deps.panelsEl, "input", asListener(handleCreateProjectInput)],
    [deps.panelsEl, "input", asListener(handleRenameInput)],
  ];

  return eventBindings;
}
