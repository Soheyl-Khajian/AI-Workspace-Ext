// src/ui/sidebarRenderer.ts
// ------------------------------------------------------------
// SIDEBAR RENDER COORDINATOR
//
// Responsibility:
// - Read current UI state
// - Coordinate view rendering
// - Forward interaction callbacks
//
// Rules:
// - No state mutations
// - No storage access
// - No business logic
// - No async orchestration
// ------------------------------------------------------------

import {
  getSelectedProjectId,
  getSelectedItemId,
  getProjects,
  getItems,
} from "./state";

import { renderProjects } from "./renderProjects";
import { renderItems } from "./renderItems";
import { renderItemDetails } from "./renderItemDetails";

import type { SidebarDom } from "./dom";

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export type OnProjectSelect = (projectId: string) => void | Promise<void>;

export type OnItemSelect = (itemId: string) => void | Promise<void>;

type RenderUiParams = {
  dom: SidebarDom;
  onProjectSelect: OnProjectSelect;
  onItemSelect: OnItemSelect;
};

// ------------------------------------------------------------
// MAIN RENDER PIPELINE
// ------------------------------------------------------------

export function renderUi({
  dom,
  onProjectSelect,
  onItemSelect,
}: RenderUiParams): void {
  renderProjectsView();
  renderItemsView();
  renderItemDetailsView();

  // ----------------------------------------------------------
  // PROJECTS VIEW
  // ----------------------------------------------------------

  function renderProjectsView(): void {
    const projects = getProjects();

    const selectedProjectId = getSelectedProjectId();

    renderProjects(
      dom.projectsListEl,
      projects,
      selectedProjectId,
      onProjectSelect,
    );
  }

  // ----------------------------------------------------------
  // ITEMS VIEW
  // ----------------------------------------------------------

  function renderItemsView(): void {
    const selectedProjectId = getSelectedProjectId();

    if (selectedProjectId === null) {
      renderItems(dom.itemsListEl, [], null, () => {});

      return;
    }

    const items = getItems();

    const selectedItemId = getSelectedItemId();

    renderItems(dom.itemsListEl, items, selectedItemId, onItemSelect);
  }

  // ----------------------------------------------------------
  // ITEM DETAILS VIEW
  // ----------------------------------------------------------

  function renderItemDetailsView(): void {
    const items = getItems();

    const selectedItemId = getSelectedItemId();

    const selectedItem =
      items.find((item) => item.id === selectedItemId) ?? null;

    renderItemDetails(dom.itemDetailsEl, selectedItem);
  }
}
