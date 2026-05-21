// src/ui/renderers/renderSidebar.ts
// ------------------------------------------------------------
// SIDEBAR RENDER COORDINATOR
//
// Responsibility:
// - Read current UI state
// - Coordinate UI rendering
// - Forward user interaction callbacks into renderers
//
// IMPORTANT RULES:
// - NO state mutations
// - NO IndexedDB access
// - NO business logic
// - NO async orchestration
// - NO direct DOM querying
//
// ARCHITECTURE:
//
// state
//   ↓
// renderUi(...)
//   ↓
// child renderers
//   ↓
// interaction callbacks
//   ↓
// external controllers update state
//   ↓
// rerender
// ------------------------------------------------------------

import {
  getProjects,
  getSelectedProjectId,
  isProjectFormOpen,
  getProjectDraftName,
  getItems,
  getSelectedItemId,
  isItemFormOpen,
  getItemDraftTitle,
  getItemDraftContent,
} from "../state";

import type { SidebarDom } from "../dom";

import { renderProjects } from "./renderProjects";
import { renderProjectForm } from "./renderProjectForm";
import { renderItems } from "./renderItems";
import { renderItemForm } from "./renderItemForm";
import { renderItemDetails } from "./renderItemDetails";

// ------------------------------------------------------------
// INTERACTION CALLBACK TYPES
// ------------------------------------------------------------

export type OnProjectSelect = (projectId: string) => void;

export type OnProjectDraftInput = (projectName: string) => void;

export type OnProjectSubmit = () => void;

export type OnProjectCancel = () => void;

export type OnItemSelect = (itemId: string) => void;

export type OnItemTitleInput = (title: string) => void;

export type OnItemContentInput = (content: string) => void;

export type OnItemSubmit = () => void;

export type OnItemCancel = () => void;

// ------------------------------------------------------------
// RENDER PARAMS
// ------------------------------------------------------------

type RenderUiParams = {
  dom: SidebarDom;

  // ----------------------------------------------------------
  // Project interactions
  // ----------------------------------------------------------

  onProjectSelect: OnProjectSelect;
  onProjectDraftInput: OnProjectDraftInput;
  onProjectSubmit: OnProjectSubmit;
  onProjectCancel: OnProjectCancel;

  // ----------------------------------------------------------
  // Item interactions
  // ----------------------------------------------------------

  onItemSelect: OnItemSelect;
  onItemTitleInput: OnItemTitleInput;
  onItemContentInput: OnItemContentInput;
  onItemSubmit: OnItemSubmit;
  onItemCancel: OnItemCancel;
};

// ------------------------------------------------------------
// MAIN RENDER PIPELINE
// ------------------------------------------------------------

export function renderUi({
  dom,

  onProjectSelect,
  onProjectDraftInput,
  onProjectSubmit,
  onProjectCancel,

  onItemSelect,
  onItemTitleInput,
  onItemContentInput,
  onItemSubmit,
  onItemCancel,
}: RenderUiParams): void {
  renderProjectsView();
  renderProjectFormView();

  renderItemsView();
  renderItemFormView();

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
  // PROJECT FORM VIEW
  // ----------------------------------------------------------

  function renderProjectFormView(): void {
    const projectFormOpen = isProjectFormOpen();

    const projectDraftName = getProjectDraftName();

    renderProjectForm(
      dom.projectFormEl,
      projectFormOpen,
      projectDraftName,
      onProjectDraftInput,
      onProjectSubmit,
      onProjectCancel,
    );
  }

  // ----------------------------------------------------------
  // ITEMS VIEW
  // ----------------------------------------------------------

  function renderItemsView(): void {
    const selectedProjectId = getSelectedProjectId();

    // --------------------------------------------------------
    // No selected project
    // --------------------------------------------------------

    if (selectedProjectId === null) {
      renderItems(dom.itemsListEl, [], null, noopItemSelect);

      return;
    }

    const items = getItems();

    const selectedItemId = getSelectedItemId();

    renderItems(dom.itemsListEl, items, selectedItemId, onItemSelect);
  }

  // ----------------------------------------------------------
  // ITEM FORM VIEW
  // ----------------------------------------------------------

  function renderItemFormView(): void {
    const itemFormOpen = isItemFormOpen();

    const itemDraftTitle = getItemDraftTitle();

    const itemDraftContent = getItemDraftContent();

    renderItemForm(
      dom.itemFormEl,
      itemFormOpen,
      itemDraftTitle,
      itemDraftContent,
      onItemTitleInput,
      onItemContentInput,
      onItemSubmit,
      onItemCancel,
    );
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

// ------------------------------------------------------------
// INTERNAL NOOP CALLBACKS
// ------------------------------------------------------------

function noopItemSelect(): void {
  // Intentionally empty
}
