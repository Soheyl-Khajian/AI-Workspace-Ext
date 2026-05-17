// src/ui/sidebarController.ts
// ------------------------------------------------------------
// SIDEBAR CONTROLLER
//
// Responsibility:
// - Orchestrates storage ↔ state ↔ rendering flow
// - Wires UI events to application behavior
// - Coordinates refresh + rerender cycles
//
// IMPORTANT RULES:
// - NO direct DOM querying here
// - NO HTML generation here
// - Rendering delegated to renderers
// - Persistent storage delegated to storage layer
// ------------------------------------------------------------

import {
  createProject,
  listProjects,
  listItemsByProject,
  createItem,
} from "../storage/index";

import { renderProjects } from "./renderProjects";
import { renderItems } from "./renderItems";

import {
  getSelectedProjectId,
  setSelectedProjectId,
  getSelectedItemId,
  setSelectedItemId,
  getProjects,
  setProjects,
  getItems,
  setItems,
} from "./state";

import { createSidebarDom } from "./dom";

// ------------------------------------------------------------
// MAIN INITIALIZER
// ------------------------------------------------------------

export async function initSidebarController(root: HTMLElement): Promise<void> {
  const dom = createSidebarDom(root);

  // ----------------------------------------------------------
  // STORAGE → STATE SYNC
  // ----------------------------------------------------------

  /**
   * Refresh projects cache from IndexedDB.
   *
   * ALSO:
   * - validates selected project still exists
   * - clears invalid selection automatically
   */
  async function refreshProjectsState(): Promise<void> {
    const projects = await listProjects();

    setProjects(projects);

    const selectedProjectId = getSelectedProjectId();

    const stillExists = projects.some(
      (project) => project.id === selectedProjectId,
    );

    if (!stillExists) {
      setSelectedProjectId(null);
    }
  }

  /**
   * Refresh items cache for selected project.
   *
   * IMPORTANT:
   * Items are scoped to selected project.
   */
  async function refreshItemsState(): Promise<void> {
    const selectedProjectId = getSelectedProjectId();

    // --------------------------------------------------------
    // No selected project
    // --------------------------------------------------------

    if (selectedProjectId === null) {
      setItems([]);
      setSelectedItemId(null);

      return;
    }

    // --------------------------------------------------------
    // Load project items
    // --------------------------------------------------------

    const items = await listItemsByProject(selectedProjectId);

    setItems(items);

    // --------------------------------------------------------
    // Validate selected item still exists
    // --------------------------------------------------------

    const selectedItemId = getSelectedItemId();

    const stillExists = items.some((item) => item.id === selectedItemId);

    if (!stillExists) {
      setSelectedItemId(null);
    }
  }

  // ----------------------------------------------------------
  // RENDER: PROJECTS
  // ----------------------------------------------------------

  function renderProjectsView(): void {
    const projects = getProjects();

    const selectedProjectId = getSelectedProjectId();

    renderProjects(
      dom.projectsListEl,
      projects,
      selectedProjectId,

      // ------------------------------------------------------
      // Project click handler
      // ------------------------------------------------------

      async (clickedProjectId) => {
        // Switch selected project
        setSelectedProjectId(clickedProjectId);

        // Item selection belongs to project scope
        setSelectedItemId(null);

        // Refresh dependent item cache
        await refreshItemsState();

        // Rerender all affected views
        renderAllViews();
      },
    );
  }

  // ----------------------------------------------------------
  // RENDER: ITEMS
  // ----------------------------------------------------------

  function renderItemsView(): void {
    const selectedProjectId = getSelectedProjectId();

    // --------------------------------------------------------
    // No project selected
    // --------------------------------------------------------

    if (selectedProjectId === null) {
      renderItems(dom.itemsListEl, [], null);

      return;
    }

    // --------------------------------------------------------
    // Render selected project items
    // --------------------------------------------------------

    const items = getItems();

    const selectedItemId = getSelectedItemId();

    renderItems(
      dom.itemsListEl,
      items,
      selectedItemId,

      // ------------------------------------------------------
      // Item click handler
      // ------------------------------------------------------

      (clickedItemId) => {
        // Pure UI state change
        setSelectedItemId(clickedItemId);

        // Only item UI affected
        renderItemsView();
      },
    );
  }

  // ----------------------------------------------------------
  // FULL UI RERENDER
  // ----------------------------------------------------------

  /**
   * Centralized render pipeline.
   *
   * Keeps render order predictable and makes
   * future expansion easier.
   */
  function renderAllViews(): void {
    renderProjectsView();
    renderItemsView();
  }

  // ----------------------------------------------------------
  // EVENT: CREATE PROJECT
  // ----------------------------------------------------------

  dom.addProjectBtn.addEventListener("click", async () => {
    const name = window.prompt("Enter project name:");

    if (name === null) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    // ------------------------------------------------------
    // Persist project
    // ------------------------------------------------------

    const project = await createProject(trimmedName);

    // ------------------------------------------------------
    // Refresh state
    // ------------------------------------------------------

    await refreshProjectsState();

    // Auto-select created project
    setSelectedProjectId(project.id);

    // Reset item selection for new scope
    setSelectedItemId(null);

    // Refresh items cache for selected project
    await refreshItemsState();

    // ------------------------------------------------------
    // Rerender UI
    // ------------------------------------------------------

    renderAllViews();
  });

  // ----------------------------------------------------------
  // EVENT: CREATE ITEM
  // ----------------------------------------------------------

  dom.addItemBtn.addEventListener("click", async () => {
    const title = window.prompt("Enter item title:");

    if (title === null) {
      return;
    }

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    const content = window.prompt("Enter item content:");

    if (content === null) {
      return;
    }

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    const selectedProjectId = getSelectedProjectId();

    // ------------------------------------------------------
    // Safety guard
    // ------------------------------------------------------

    if (selectedProjectId === null) {
      return;
    }

    // ------------------------------------------------------
    // Persist item
    // ------------------------------------------------------

    const item = await createItem(
      selectedProjectId,
      "note",
      trimmedTitle,
      trimmedContent,
      {
        createdFrom: "manual",
      },
    );

    // ------------------------------------------------------
    // Update UI selection state
    // ------------------------------------------------------

    setSelectedItemId(item.id);

    // ------------------------------------------------------
    // Refresh cache
    // ------------------------------------------------------

    await refreshItemsState();

    // ------------------------------------------------------
    // Rerender UI
    // ------------------------------------------------------

    renderAllViews();
  });

  // ----------------------------------------------------------
  // BOOT SEQUENCE
  // ----------------------------------------------------------

  /**
   * Initial application hydration.
   *
   * ORDER MATTERS:
   * storage → state → render
   */
  await refreshProjectsState();

  await refreshItemsState();

  renderAllViews();
}
