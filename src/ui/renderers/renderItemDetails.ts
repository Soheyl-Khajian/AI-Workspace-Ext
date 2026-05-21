// src/ui/renderItemDetails.ts
// ------------------------------------------------------------
// Responsibility:
// Render a single Item (or empty state) into the detail panel.
//
// Design rules:
// - Pure renderer (no state, no DB access)
// - Must be deterministic
// - Must not mutate input data
// - Must produce consistent DOM structure per render
// ------------------------------------------------------------

import type { Item } from "../models/item";

/**
 * Main render function for item details panel.
 *
 * @param container - DOM node representing the detail panel root
 * @param item - currently selected item (or null if none selected)
 */
export function renderItemDetails(
  container: HTMLElement,
  item: Item | null,
): void {
  // ------------------------------------------------------------
  // Reset previous render state
  // ------------------------------------------------------------
  container.textContent = "";

  // ------------------------------------------------------------
  // EMPTY STATE
  // ------------------------------------------------------------
  // When no item is selected, we render a single empty-state node.
  // This is intentionally NOT wrapped in the item layout container
  // because it represents a different UI mode.
  if (item === null) {
    const emptyStateEl = document.createElement("div");
    emptyStateEl.className = "aiw-empty";
    emptyStateEl.textContent = "No item selected yet";

    container.append(emptyStateEl);
    return;
  }

  // ------------------------------------------------------------
  // ITEM STATE WRAPPER
  // ------------------------------------------------------------
  // Wrapper acts as the structural "card container" for all item fields.
  const wrapperEl = document.createElement("div");
  wrapperEl.className = "aiw-item-details__wrapper";

  container.append(wrapperEl);

  // ------------------------------------------------------------
  // TITLE SECTION
  // ------------------------------------------------------------
  const titleEl = document.createElement("div");

  const hasTitle = Boolean(item.title && item.title.trim());

  if (!hasTitle) {
    titleEl.className = "aiw-empty";
    titleEl.textContent = "Untitled item";
  } else {
    titleEl.className = "aiw-item-details__title";
    titleEl.textContent = item.title;
  }

  wrapperEl.append(titleEl);

  // ------------------------------------------------------------
  // TYPE SECTION
  // ------------------------------------------------------------
  // Type is always expected to exist in your model,
  // so no fallback logic is required here.
  const typeEl = document.createElement("div");
  typeEl.className = "aiw-item-details__type";
  typeEl.textContent = item.type;

  wrapperEl.append(typeEl);

  // ------------------------------------------------------------
  // CONTENT SECTION
  // ------------------------------------------------------------
  const contentEl = document.createElement("div");

  const hasContent = Boolean(item.content && item.content.trim());

  if (!hasContent) {
    contentEl.className = "aiw-empty";
    contentEl.textContent = "No content";
  } else {
    contentEl.className = "aiw-item-details__content";
    contentEl.textContent = item.content;
  }

  wrapperEl.append(contentEl);
}
