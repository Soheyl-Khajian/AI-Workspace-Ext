// src/ui/floating/components/createItemRow.ts
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

export function createItemRow(item: Item): HTMLButtonElement {
  // ------------------------------------------------------------
  // ROOT ROW ELEMENT
  // ------------------------------------------------------------

  const rowEl = document.createElement("button");

  rowEl.type = "button";
  rowEl.className = "aiw-item-row";

  // ------------------------------------------------------------
  // CONTENT
  // ------------------------------------------------------------

  /*
    Temporary presentation.

    Later iterations may introduce:
    - description preview
    - icons
    - metadata
    - timestamps
    - item type indicators
  */
  rowEl.textContent = item.title;

  // ------------------------------------------------------------
  // DOM METADATA
  // ------------------------------------------------------------

  /*
    Expose stable item identity to parent interaction systems.

    Used by:
    - event delegation
    - controller event routing
    - future selection flows
  */
  rowEl.dataset.itemId = item.id;

  return rowEl;
}
