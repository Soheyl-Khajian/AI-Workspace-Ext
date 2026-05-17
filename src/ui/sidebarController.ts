// src/ui/sidebarController.ts
// ------------------------------------------------------------
// SIDEBAR CONTROLLER (MVP STABLE VERSION)
//
// Responsibility:
// - Orchestrates storage ↔ state ↔ rendering flow
// - Ensures UI state consistency
// - Handles user interaction events
//
// Core rules:
// - No DOM querying here
// - No HTML generation here
// - Storage access ONLY via storage layer
// - Rendering delegated to render functions
// - ALWAYS keep async state in sync before rendering
// ------------------------------------------------------------

import {
  createProject,
  listProjects,
  listItemsByProject,
  createItem,
} from "../storage/index";

import { renderProjects } from "./renderProjects";
import { renderItems } from "./renderItems";
import { renderItemDetails } from "./renderItemDetails";

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
  // STATE SYNC: PROJECTS
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // STATE SYNC: ITEMS
  // ----------------------------------------------------------

  async function refreshItemsState(): Promise<void> {
    const selectedProjectId = getSelectedProjectId();

    if (selectedProjectId === null) {
      setItems([]);
      setSelectedItemId(null);
      return;
    }

    const items = await listItemsByProject(selectedProjectId);
    setItems(items);

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
      async (clickedProjectId) => {
        // 1. update selection state
        setSelectedProjectId(clickedProjectId);
        setSelectedItemId(null);

        // 2. sync dependent state BEFORE rendering
        await refreshItemsState();

        // 3. render only after state is consistent
        renderAllViews();
      },
    );
  }

  // ----------------------------------------------------------
  // RENDER: ITEMS
  // ----------------------------------------------------------

  function renderItemsView(): void {
    const selectedProjectId = getSelectedProjectId();

    if (selectedProjectId === null) {
      renderItems(dom.itemsListEl, [], null, () => {});
      return;
    }

    const items = getItems();
    const selectedItemId = getSelectedItemId();

    renderItems(dom.itemsListEl, items, selectedItemId, (clickedItemId) => {
      // 1. update state
      setSelectedItemId(clickedItemId);

      // 2. render dependent UI only (NO async refresh needed here)
      renderItemDetailsView();
      renderItemsView();
    });
  }

  // ----------------------------------------------------------
  // RENDER: ITEM DETAILS
  // ----------------------------------------------------------

  function renderItemDetailsView(): void {
    const selectedItemId = getSelectedItemId();
    const items = getItems();

    const selectedItem =
      items.find((item) => item.id === selectedItemId) ?? null;

    renderItemDetails(dom.itemDetailsEl, selectedItem);
  }

  // ----------------------------------------------------------
  // FULL RENDER PIPELINE
  // ----------------------------------------------------------

  function renderAllViews(): void {
    renderProjectsView();
    renderItemsView();
    renderItemDetailsView();
  }

  // ----------------------------------------------------------
  // EVENT: CREATE PROJECT
  // ----------------------------------------------------------

  dom.addProjectBtn.addEventListener("click", async () => {
    const name = window.prompt("Enter project name:");
    if (!name) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    const project = await createProject(trimmed);

    await refreshProjectsState();

    setSelectedProjectId(project.id);
    setSelectedItemId(null);

    await refreshItemsState();

    renderAllViews();
  });

  // ----------------------------------------------------------
  // EVENT: CREATE ITEM
  // ----------------------------------------------------------

  dom.addItemBtn.addEventListener("click", async () => {
    const title = window.prompt("Enter item title:");
    if (!title) return;

    const content = window.prompt("Enter item content:");
    if (!content) return;

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) return;

    const selectedProjectId = getSelectedProjectId();
    if (!selectedProjectId) return;

    const item = await createItem(
      selectedProjectId,
      "note",
      trimmedTitle,
      trimmedContent,
      { createdFrom: "manual" },
    );

    await refreshItemsState();

    setSelectedItemId(item.id);

    renderAllViews();
  });

  // ----------------------------------------------------------
  // BOOTSTRAP
  // ----------------------------------------------------------

  await refreshProjectsState();
  await refreshItemsState();
  renderAllViews();
}
