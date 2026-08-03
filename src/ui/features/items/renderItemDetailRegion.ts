// src/ui/features/items/renderItemDetailRegion.ts
// ------------------------------------------------------------
// ITEM DETAIL REGION RENDERER
// ------------------------------------------------------------
//
// Responsibility:
//
// - render the detail column of the master-detail items panel
// - display the selected item's fields in an editable form
// - render the column empty state when nothing is selected
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
// Succeeds renderItemDetailPanel (retired with the standalone
// itemDetail panel): same form, same behavior-hook class names,
// so the itemsHandlers selectors bind unchanged.
// ------------------------------------------------------------

import type { Item } from "../../../models/item";

import { createPanelState } from "../../shared/createPanelState";
import {
  getItemDetailTitleDraft,
  getItemDetailContentDraft,
} from "./itemsDraftState";

export function renderItemDetailRegion(item: Item | undefined): HTMLElement {
  const detailColEl = document.createElement("div");
  detailColEl.className = "aiw-item-detail-col";

  // ------------------------------------------------------------
  // EMPTY STATE
  //
  // No selection, or the selection points at an item that is no
  // longer in the loaded snapshot (deleted / moved away).
  // ------------------------------------------------------------

  if (item === undefined) {
    const placeholderStateEl = createPanelState({
      variant: "placeholder",
      message: "Select an item",
    });

    detailColEl.append(placeholderStateEl);

    return detailColEl;
  }

  // ------------------------------------------------------------
  // DETAIL FORM
  //
  // Fills the column: the title keeps its content height, the
  // content textarea absorbs the free space, and the save button
  // pins to the bottom.
  // ------------------------------------------------------------

  const formEl = document.createElement("div");
  formEl.className = "aiw-item-detail-form";

  const titleInputEl = document.createElement("input");
  titleInputEl.className = "aiw-item-detail-title";
  titleInputEl.type = "text";
  // Draft wins over the stored value; ?? keeps a deliberately
  // cleared ("") draft from resurrecting the old text
  titleInputEl.value = getItemDetailTitleDraft(item.id) ?? item.title;

  const contentInputEl = document.createElement("textarea");
  contentInputEl.className = "aiw-item-detail-content";
  contentInputEl.value = getItemDetailContentDraft(item.id) ?? item.content;

  const buttonEl = document.createElement("button");
  buttonEl.className = "aiw-item-detail-save";
  buttonEl.type = "button";
  buttonEl.textContent = "Save";
  buttonEl.dataset.itemId = item.id;

  formEl.append(titleInputEl, contentInputEl, buttonEl);

  detailColEl.append(formEl);

  return detailColEl;
}
