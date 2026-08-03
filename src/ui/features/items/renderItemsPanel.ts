// src/ui/features/items/renderItemsPanel.ts
// ------------------------------------------------------------
// ITEMS PANEL RENDERER (MASTER-DETAIL)
// ------------------------------------------------------------
//
// Responsibility:
//
// - render the items floating panel as a master-detail split:
//   list column (rows + create form) beside the detail column
// - render items runtime states into the list column
// - delegate the detail column to renderItemDetailRegion
// - mount items UI into provided container
//
// IMPORTANT:
//
// - PURE renderer
// - NO state mutation
// - NO storage access
// - NO async logic
// - NO business logic
// - NO global DOM queries
// ------------------------------------------------------------

import type { Item } from "../../../models/item";
import type { Project } from "../../../models/project";

import { createFloatingPanelShell } from "../../shared/createFloatingPanelShell";
import { createItemRow } from "./createItemRow";
import { createPanelState } from "../../shared/createPanelState";
import { renderItemDetailRegion } from "./renderItemDetailRegion";

import {
  getItems,
  getItemsError,
  getItemsListScrollTop,
  isItemsLoading,
  isItemsLoadingIndicatorVisible,
} from "./itemsState";
import {
  getCreateItemTitleDraft,
  getCreateItemContentDraft,
} from "./itemsDraftState";
import { isItemSelected, getSelectedItemsCount } from "./itemSelectionState";
import { getOpenItemMenu } from "./itemsMenuState";

import {
  getSelectedProjectId,
  getSelectedItemId,
} from "../../core/sessionState";

export function renderItemsPanel(
  containerEl: HTMLElement,
  projectName: string | null,
  projects: Project[],
): HTMLElement {
  // ------------------------------------------------------------
  // READ RUNTIME STATE SNAPSHOT
  // ------------------------------------------------------------

  const selectedProjectId = getSelectedProjectId();
  const selectedItemId = getSelectedItemId();

  const loading = isItemsLoading();
  const loadingIndicatorVisible = isItemsLoadingIndicatorVisible();
  const error = getItemsError();
  const items = getItems();
  const openItemMenu = getOpenItemMenu();

  const isEmpty = items.length === 0;

  // ------------------------------------------------------------
  // PANEL SHELL
  // ------------------------------------------------------------
  let muted = false;
  let label = projectName;

  if (label === null) {
    muted = true;
    label = "Select a project";
  }

  const shell = createFloatingPanelShell("Items", { label, muted });

  const backButtonEl = document.createElement("button");
  backButtonEl.type = "button";
  backButtonEl.className = "aiw-panel-back-button";
  backButtonEl.textContent = "←";

  shell.headerEl.prepend(backButtonEl);

  // ------------------------------------------------------------
  // NO SELECTED PROJECT: SINGLE-REGION PLACEHOLDER
  //
  // Without a selected project there is no valid items query
  // scope - and no meaningful split, so the body stays a plain
  // single region.
  // ------------------------------------------------------------

  if (selectedProjectId === null) {
    const placeholderStateEl = createPanelState({
      variant: "placeholder",
      message: "Select a project to view items",
    });

    shell.bodyEl.append(placeholderStateEl);

    containerEl.append(shell.panelEl);

    return shell.panelEl;
  }

  // ------------------------------------------------------------
  // MASTER-DETAIL SPLIT
  //
  // The shared body stops padding/scrolling (base.css --split
  // modifier); each column owns its own scroll region instead.
  // ------------------------------------------------------------

  shell.bodyEl.classList.add("aiw-floating-panel__body--split");

  const layoutEl = document.createElement("div");
  layoutEl.className = "aiw-items-layout";

  const listColEl = document.createElement("div");
  listColEl.className = "aiw-items-list-col";

  const listScrollEl = document.createElement("div");
  listScrollEl.className = "aiw-items-list-scroll";

  listColEl.append(listScrollEl);

  // ------------------------------------------------------------
  // LIST COLUMN: STATE-DRIVEN RENDER FLOW
  // ------------------------------------------------------------

  if (loading) {
    /*
      Quiet window: loading, but the indicator delay hasn't
      elapsed. Render an intentionally empty region - fast loads
      finish inside this window, so content replaces content
      with no intermediate frame.
    */
    if (loadingIndicatorVisible) {
      const loadingStateEl = createPanelState({
        variant: "loading",
        message: "Loading items...",
      });

      listScrollEl.append(loadingStateEl);
    }
  } else if (error !== null) {
    const errorStateEl = createPanelState({
      variant: "error",
      message: error,
    });

    listScrollEl.append(errorStateEl);
  } else if (isEmpty) {
    const emptyStateEl = createPanelState({
      variant: "empty",
      message: "No items yet",
    });

    listScrollEl.append(emptyStateEl);
  } else {
    const listEl = document.createElement("div");

    listEl.className = "aiw-items-list";

    // Move targets for the menu's picker page: every project
    // except the one the listed items already live in.
    const moveTargets = projects.filter(
      (project) => project.id !== selectedProjectId,
    );

    for (const item of items) {
      const selectedItem = item.id === selectedItemId;
      const menuPage =
        openItemMenu !== null && openItemMenu.itemId === item.id
          ? openItemMenu.page
          : null;
      const rowEl = createItemRow(
        item,
        {
          selected: selectedItem,
          checkboxChecked: isItemSelected(item.id),
          menuPage,
        },
        moveTargets,
      );

      listEl.append(rowEl);
    }

    listScrollEl.append(listEl);
  }

  // ------------------------------------------------------------
  // CREATE FORM (list column footer)
  // ------------------------------------------------------------

  const formEl = document.createElement("div");
  formEl.className = "aiw-create-item-form";

  const titleInputEl = document.createElement("input");
  titleInputEl.className = "aiw-create-item-title";
  titleInputEl.type = "text";
  titleInputEl.placeholder = "Title";

  titleInputEl.value = getCreateItemTitleDraft() ?? "";

  const contentInputEl = document.createElement("textarea");
  contentInputEl.className = "aiw-create-item-content";
  contentInputEl.placeholder = "Content";

  contentInputEl.value = getCreateItemContentDraft() ?? "";

  const buttonEl = document.createElement("button");
  buttonEl.className = "aiw-create-item-submit";
  buttonEl.type = "button";
  buttonEl.textContent = "Add";

  formEl.append(titleInputEl, contentInputEl, buttonEl);
  listColEl.append(formEl);

  // ------------------------------------------------------------
  // DETAIL COLUMN
  //
  // Derives the subject from selectedItemId matched against the
  // loaded items snapshot; a missing match (nothing selected, or
  // the selection was deleted/moved away) renders the column's
  // empty state.
  // ------------------------------------------------------------

  const detailItem: Item | undefined = items.find(
    (candidate) => candidate.id === selectedItemId,
  );

  layoutEl.append(listColEl, renderItemDetailRegion(detailItem, projects));

  shell.bodyEl.append(layoutEl);

  // ------------------------------------------------------------
  // BUILD CONTEXT ACTION
  // ------------------------------------------------------------

  const buildContextBarEl = document.createElement("div");
  buildContextBarEl.className = "aiw-build-context-bar";

  const selectedCount = getSelectedItemsCount();

  const buildContextButtonEl = document.createElement("button");
  buildContextButtonEl.type = "button";
  buildContextButtonEl.className = "aiw-build-context";
  buildContextButtonEl.textContent = `Build context (${selectedCount})`;

  buildContextBarEl.append(buildContextButtonEl);
  shell.headerEl.append(buildContextBarEl);

  // ------------------------------------------------------------
  // FINAL ASSEMBLY
  // ------------------------------------------------------------

  containerEl.append(shell.panelEl);

  /*
    Wipe-rebuild renders reset the list column's scroll position;
    restore the position captured by the scroll handler. Restoring
    the REAL position (not scrollIntoView on the selected row) means
    renders triggered while scrolled away — checkbox toggles, saves —
    never yank the list back to the selection. Runs after the panel
    is appended: scrollTop only sticks once the element has layout.
  */
  listScrollEl.scrollTop = getItemsListScrollTop();

  return shell.panelEl;
}
