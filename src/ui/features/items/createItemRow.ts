// src/ui/features/items/createItemRow.ts
// ------------------------------------------------------------
// ITEM ROW COMPONENT
// ------------------------------------------------------------
//
// Responsibility:
//
// - create one item row button
// - expose item identity through dataset
// - remain purely presentational
//
// IMPORTANT:
//
// - NO click listeners
// - NO state mutation
// - NO business logic
// - NO imports except TYPE
// ------------------------------------------------------------

import type { Item } from "../../../models/item";

export function createItemRow(item: Item, selected: boolean): HTMLDivElement {
  // ------------------------------------------------------------
  // ITEM ROW
  // ------------------------------------------------------------

  const rowEl = document.createElement("div");
  rowEl.className = "aiw-item-row";

  const itemTextEl = document.createElement("span");
  itemTextEl.className = "aiw-item-text";
  itemTextEl.textContent = item.title;
  rowEl.append(itemTextEl);

  // Expose item identity to parent interaction systems
  rowEl.dataset.itemId = item.id;

  if (selected) {
    rowEl.classList.add("aiw-item-row--selected");
  }

  // ----------------------------------------------------------
  // DELETE BUTTON
  // ----------------------------------------------------------

  const deleteButtonEl = document.createElement("button");
  deleteButtonEl.type = "button";
  deleteButtonEl.className = "aiw-item-delete";
  deleteButtonEl.textContent = "×";

  // Expose item identity to parent interaction systems
  deleteButtonEl.dataset.itemId = item.id;

  rowEl.append(deleteButtonEl);

  return rowEl;
}
