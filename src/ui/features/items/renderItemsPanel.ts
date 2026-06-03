// src/ui/features/items/renderItemsPanel.ts
// ------------------------------------------------------------
// ITEMS PANEL RENDERER
// ------------------------------------------------------------
//
// Responsibility:
//
// - render items floating panel
// - render items runtime states
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

import { createFloatingPanelShell } from "../../shared/createFloatingPanelShell";
import { createItemRow } from "./createItemRow";
import { createPanelState } from "../../shared/createPanelState";

import { getItems, getItemsError, isItemsLoading } from "./itemsState";

import {
  getSelectedProjectId,
  getSelectedItemId,
} from "../../core/sessionState";

export function renderItemsPanel(containerEl: HTMLElement): void {
  // ------------------------------------------------------------
  // PANEL SHELL
  // ------------------------------------------------------------

  const shell = createFloatingPanelShell("Items");

  const backButtonEl = document.createElement("button");
  backButtonEl.type = "button";
  backButtonEl.className = "aiw-panel-back-button";
  backButtonEl.textContent = "←";

  shell.headerEl.prepend(backButtonEl);

  // ------------------------------------------------------------
  // READ RUNTIME STATE SNAPSHOT
  // ------------------------------------------------------------

  const selectedProjectId = getSelectedProjectId();
  const selectedItemId = getSelectedItemId();

  const loading = isItemsLoading();
  const error = getItemsError();
  const items = getItems();

  const isEmpty = items.length === 0;

  // ------------------------------------------------------------
  // RENDER HELPERS
  // ------------------------------------------------------------

  function renderItemsList(itemsList: Item[]): void {
    const listEl = document.createElement("div");

    listEl.className = "aiw-items-list";

    for (const item of itemsList) {
      const selectedItem = item.id === selectedItemId;
      const rowEl = createItemRow(item, selectedItem);

      listEl.append(rowEl);
    }

    shell.bodyEl.append(listEl);
  }

  // ------------------------------------------------------------
  // STATE-DRIVEN RENDER FLOW
  // ------------------------------------------------------------

  /*
    Items panel depends on a selected project.

    Without a selected project there is no valid
    items query scope.
  */
  if (selectedProjectId === null) {
    const placeholderStateEl = createPanelState({
      variant: "placeholder",
      message: "Select a project to view items",
    });

    shell.bodyEl.append(placeholderStateEl);
  } else if (loading) {
    const loadingStateEl = createPanelState({
      variant: "loading",
      message: "Loading items...",
    });

    shell.bodyEl.append(loadingStateEl);
  } else if (error !== null) {
    const errorStateEl = createPanelState({
      variant: "error",
      message: error,
    });

    shell.bodyEl.append(errorStateEl);
  } else if (isEmpty) {
    const emptyStateEl = createPanelState({
      variant: "empty",
      message: "No items yet",
    });

    shell.bodyEl.append(emptyStateEl);
  } else {
    renderItemsList(items);
  }

  // ------------------------------------------------------------
  // FINAL ASSEMBLY
  // ------------------------------------------------------------

  containerEl.append(shell.panelEl);
}
