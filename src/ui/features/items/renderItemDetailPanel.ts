// src/ui/features/items/renderItemDetailPanel.ts
// ------------------------------------------------------------
// ITEM DETAIL PANEL RENDERER
// ------------------------------------------------------------
//
// Responsibility:
//
// - render item detail floating panel
// - display selected item fields in editable form
// - mount item detail UI into provided container
//
// IMPORTANT:
//
// - PURE renderer
// - NO state mutation
// - NO storage access
// - NO async logic
// - NO business logic
// - NO global DOM queries
//
// Derives item from selectedItemId in sessionState
// matched against current items snapshot in itemsState.
// ------------------------------------------------------------

import { getSelectedItemId } from "../../core/sessionState";
import { createFloatingPanelShell } from "../../shared/createFloatingPanelShell";
import { createPanelState } from "../../shared/createPanelState";
import { getItems } from "./itemsState";

export function renderItemDetailPanel(containerEl: HTMLElement): void {
  // ------------------------------------------------------------
  // PANEL SHELL
  // ------------------------------------------------------------

  const shell = createFloatingPanelShell("Item Detail");

  const backButtonEl = document.createElement("button");
  backButtonEl.type = "button";
  backButtonEl.className = "aiw-panel-back-button";
  backButtonEl.textContent = "←";

  shell.headerEl.prepend(backButtonEl);

  // ------------------------------------------------------------
  // READ RUNTIME STATE SNAPSHOT
  // ------------------------------------------------------------

  const selectedItemId = getSelectedItemId();
  const items = getItems();

  // ------------------------------------------------------------
  // STATE-DRIVEN RENDER FLOW
  // ------------------------------------------------------------

  const itemObject = items.find((item) => item.id === selectedItemId);
  if (!itemObject) {
    const placeholderStateEl = createPanelState({
      variant: "placeholder",
      message: "Item not found",
    });

    shell.bodyEl.append(placeholderStateEl);
  }

  // ------------------------------------------------------------
  // CREATE FORM
  // ------------------------------------------------------------

  if (itemObject !== undefined) {
    const formEl = document.createElement("div");
    formEl.className = "aiw-item-detail-form";

    const titleInputEl = document.createElement("input");
    titleInputEl.className = "aiw-item-detail-title";
    titleInputEl.type = "text";
    titleInputEl.value = itemObject.title;

    const contentInputEl = document.createElement("textarea");
    contentInputEl.className = "aiw-item-detail-content";
    contentInputEl.value = itemObject.content;

    const buttonEl = document.createElement("button");
    buttonEl.className = "aiw-item-detail-save";
    buttonEl.type = "button";
    buttonEl.textContent = "Save";
    buttonEl.dataset.itemId = itemObject.id;

    formEl.append(titleInputEl, contentInputEl, buttonEl);
    shell.panelEl.append(formEl);
  }

  // ------------------------------------------------------------
  // FINAL ASSEMBLY
  // ------------------------------------------------------------

  containerEl.append(shell.panelEl);
}
