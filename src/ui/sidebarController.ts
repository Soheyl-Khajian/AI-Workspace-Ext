// src/ui/sidebarController.ts
// ------------------------------------------------------------
// SIDEBAR CONTROLLER
//
// Responsibility:
// - Orchestrate UI flow
// - Coordinate actions, state sync, and rendering
// - Handle user-driven events
//
// Rules:
// - No HTML generation
// - No direct DOM querying
// - Rendering delegated to renderer
// - State synchronization delegated to sync layer
// - State transitions delegated to actions layer
// ------------------------------------------------------------

import { createProject, createItem } from "../storage/index";

import {
  getSelectedProjectId,
  setSelectedProjectId,
  setSelectedItemId,
  openProjectForm,
  closeProjectForm,
  openItemForm,
  closeItemForm,
  setProjectDraftName,
  setItemDraftTitle,
  setItemDraftContent,
  resetProjectDraft,
  resetItemDraft,
  getProjectDraftName,
  getItemDraftTitle,
  getItemDraftContent,
} from "./state";

import { createSidebarDom } from "./dom";

import { refreshProjectsState, refreshItemsState } from "./sidebarStateSync";

import { selectProject, selectItem } from "./sidebarActions";

import { renderUi } from "./renderers/renderSidebar";

// ------------------------------------------------------------
// MAIN INITIALIZER
// ------------------------------------------------------------

export async function initSidebarController(root: HTMLElement): Promise<void> {
  const dom = createSidebarDom(root);

  // ----------------------------------------------------------
  // ACTION DEPENDENCIES
  // ----------------------------------------------------------

  const projectSelectionDeps = {
    setSelectedProjectId,
    setSelectedItemId,
    refreshItemsState,
  };

  const itemSelectionDeps = {
    setSelectedItemId,
  };

  // ----------------------------------------------------------
  // RENDER PIPELINE
  // ----------------------------------------------------------

  function rerender(): void {
    renderUi({
      dom,

      onProjectSelect: handleProjectSelect,
      onProjectDraftInput: handleProjectDraftInput,
      onProjectSubmit: handleProjectSubmit,
      onProjectCancel: handleProjectCancel,

      onItemSelect: handleItemSelect,
      onItemTitleInput: handleItemTitleInput,
      onItemContentInput: handleItemContentInput,
      onItemSubmit: handleItemSubmit,
      onItemCancel: handleItemCancel,
    });
  }

  // ----------------------------------------------------------
  // PROJECT SELECTION
  // ----------------------------------------------------------

  async function handleProjectSelect(projectId: string): Promise<void> {
    await selectProject(projectId, projectSelectionDeps);
    rerender();
  }

  // ----------------------------------------------------------
  // PROJECT FORM HANDLERS
  // ----------------------------------------------------------

  function handleProjectDraftInput(name: string): void {
    setProjectDraftName(name);
  }

  async function handleProjectSubmit(): Promise<void> {
    const draftName = getProjectDraftName().trim();

    if (!draftName) {
      return;
    }

    const newProject = await createProject(draftName);

    await refreshProjectsState();

    setSelectedProjectId(newProject.id);
    setSelectedItemId(null);

    await refreshItemsState();

    closeProjectForm();
    resetProjectDraft();

    rerender();
  }

  function handleProjectCancel(): void {
    closeProjectForm();
    resetProjectDraft();
    rerender();
  }

  // ----------------------------------------------------------
  // ITEM SELECTION
  // ----------------------------------------------------------

  function handleItemSelect(itemId: string): void {
    selectItem(itemId, itemSelectionDeps);
    rerender();
  }

  // ----------------------------------------------------------
  // ITEM FORM HANDLERS
  // ----------------------------------------------------------

  function handleItemTitleInput(title: string): void {
    setItemDraftTitle(title);
  }

  function handleItemContentInput(content: string): void {
    setItemDraftContent(content);
  }

  async function handleItemSubmit(): Promise<void> {
    const selectedProjectId = getSelectedProjectId();

    if (!selectedProjectId) {
      return;
    }

    const title = getItemDraftTitle().trim();
    const content = getItemDraftContent().trim();

    if (!title || !content) {
      return;
    }

    const newItem = await createItem(
      selectedProjectId,
      "note",
      title,
      content,
      {
        createdFrom: "manual",
      },
    );

    await refreshItemsState();

    setSelectedItemId(newItem.id);

    closeItemForm();
    resetItemDraft();

    rerender();
  }

  function handleItemCancel(): void {
    closeItemForm();
    resetItemDraft();
    rerender();
  }

  // ----------------------------------------------------------
  // UI BUTTON EVENTS
  // ----------------------------------------------------------

  dom.addProjectButtonEl.addEventListener("click", () => {
    openProjectForm();
    resetProjectDraft();
    rerender();
  });

  dom.addItemButtonEl.addEventListener("click", () => {
    const selectedProjectId = getSelectedProjectId();

    if (!selectedProjectId) {
      return;
    }

    openItemForm();
    resetItemDraft();
    rerender();
  });

  // ----------------------------------------------------------
  // INITIAL BOOTSTRAP
  // ----------------------------------------------------------

  await refreshProjectsState();
  await refreshItemsState();

  rerender();
}
