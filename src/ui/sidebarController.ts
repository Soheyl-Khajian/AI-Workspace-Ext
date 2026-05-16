// src/ui/sidebarController.ts
// ------------------------------------------------------------
// Orchestration layer: connects storage + state + rendering + events
// DOM is injected via dom.ts (no querying here)
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
  getProjects,
  setProjects,
} from "./state";

import type { Item } from "../models/item";
import { createSidebarDom } from "./dom";

// ------------------------------------------------------------
// Main initializer
// ------------------------------------------------------------
export async function initSidebarController(root: HTMLElement): Promise<void> {
  const dom = createSidebarDom(root);

  // ------------------------------------------------------------
  // Sync storage → state
  // ------------------------------------------------------------
  async function refreshProjectsState(): Promise<void> {
    const projects = await listProjects();
    setProjects(projects);

    const selectedProjectId = getSelectedProjectId();

    const stillExists = projects.some((p) => p.id === selectedProjectId);

    if (!stillExists) {
      setSelectedProjectId(null);
    }
  }

  // ------------------------------------------------------------
  // Render projects list
  // ------------------------------------------------------------
  function renderProjectsView(): void {
    const projects = getProjects();
    const selectedProjectId = getSelectedProjectId();

    renderProjects(
      dom.projectsListEl,
      projects,
      selectedProjectId,
      async (clickedProjectId) => {
        setSelectedProjectId(clickedProjectId);
        await renderAllViews();
      },
    );
  }

  // ------------------------------------------------------------
  // Render items for selected project
  // ------------------------------------------------------------
  async function renderItemsView(): Promise<void> {
    const selectedProjectId = getSelectedProjectId();

    if (!selectedProjectId) {
      renderItems(dom.itemsListEl, []);
      return;
    }

    const items: Item[] = await listItemsByProject(selectedProjectId);

    renderItems(dom.itemsListEl, items);
  }

  // ------------------------------------------------------------
  // Full UI refresh
  // ------------------------------------------------------------
  async function renderAllViews(): Promise<void> {
    renderProjectsView();
    await renderItemsView();
  }

  // ------------------------------------------------------------
  // Event: create project + create item
  // ------------------------------------------------------------
  dom.addProjectBtn.addEventListener("click", async () => {
    const name = window.prompt("Enter project name:");

    if (name === null) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    const project = await createProject(trimmed);

    await refreshProjectsState();

    setSelectedProjectId(project.id);

    await renderAllViews();
  });

  dom.addItemBtn.addEventListener("click", async () => {
    const title = window.prompt("Enter item title:");

    if (title === null) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const content = window.prompt("Enter item content:");

    if (content === null) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    const selectedProjectId = getSelectedProjectId();
    if (selectedProjectId === null) {
      return;
    }

    await createItem(selectedProjectId, "note", trimmedTitle, trimmedContent, {
      createdFrom: "manual",
    });

    await renderItemsView();
  });

  // ------------------------------------------------------------
  // Boot sequence
  // ------------------------------------------------------------
  await refreshProjectsState();
  await renderAllViews();
}
