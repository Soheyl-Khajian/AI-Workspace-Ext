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
} from "./state";

import { createSidebarDom } from "./dom";

import { refreshProjectsState, refreshItemsState } from "./sidebarStateSync";

import { selectProject, selectItem } from "./sidebarActions";

import { renderUi } from "./sidebarRenderer";

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
      onItemSelect: handleItemSelect,
    });
  }

  // ----------------------------------------------------------
  // INTERACTION HANDLERS
  // ----------------------------------------------------------

  async function handleProjectSelect(projectId: string): Promise<void> {
    await selectProject(projectId, projectSelectionDeps);

    rerender();
  }

  function handleItemSelect(itemId: string): void {
    selectItem(itemId, itemSelectionDeps);

    rerender();
  }

  // ----------------------------------------------------------
  // CREATE PROJECT EVENT
  // ----------------------------------------------------------

  dom.addProjectBtn.addEventListener("click", async () => {
    const name = window.prompt("Enter project name:");

    if (!name) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    const project = await createProject(trimmedName);

    await refreshProjectsState();

    setSelectedProjectId(project.id);
    setSelectedItemId(null);

    await refreshItemsState();

    rerender();
  });

  // ----------------------------------------------------------
  // CREATE ITEM EVENT
  // ----------------------------------------------------------

  dom.addItemBtn.addEventListener("click", async () => {
    const title = window.prompt("Enter item title:");

    if (!title) {
      return;
    }

    const content = window.prompt("Enter item content:");

    if (!content) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      return;
    }

    const selectedProjectId = getSelectedProjectId();

    if (!selectedProjectId) {
      return;
    }

    const item = await createItem(
      selectedProjectId,
      "note",
      trimmedTitle,
      trimmedContent,
      {
        createdFrom: "manual",
      },
    );

    await refreshItemsState();

    setSelectedItemId(item.id);

    rerender();
  });

  // ----------------------------------------------------------
  // INITIAL BOOTSTRAP
  // ----------------------------------------------------------

  await refreshProjectsState();
  await refreshItemsState();

  rerender();
}
