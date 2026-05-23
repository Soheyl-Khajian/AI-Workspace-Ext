// src/ui/renderers/renderItems.ts
// ------------------------------------------------------------
// ITEMS RENDERER
//
// Responsibility:
// - Render Item domain objects into DOM
// - Derive lightweight display labels
// - Apply selection styling
// - Delegate interaction through callbacks
//
// IMPORTANT RULES:
// - NO IndexedDB access
// - NO global state access
// - NO business logic
// - NO mutation of domain objects
//
// This module should remain PURE:
// input state → rendered DOM
// ------------------------------------------------------------

import type { Item } from "../../models/item";

/**
 * Maximum preview length when deriving fallback text
 * from item content.
 *
 * NOTE:
 * Ellipsis is appended manually on overflow.
 */
const MAX_PREVIEW_LENGTH = 45;

/**
 * Shared no-op callback used for empty render states.
 *
 * Prevents unnecessary inline function allocation.
 */
const NOOP = (): void => {};

/**
 * Render item list into a container element.
 *
 * FLOW:
 * 1. Clear existing DOM
 * 2. Render empty state OR item rows
 * 3. Bind interaction callbacks
 */
export function renderItems(
  container: HTMLElement,
  items: Item[],
  selectedItemId: string | null,
  onItemClick: (id: string) => void = NOOP,
): void {
  // ----------------------------------------------------------
  // Clear previous render tree
  // ----------------------------------------------------------

  container.textContent = "";

  // ----------------------------------------------------------
  // Empty state
  // ----------------------------------------------------------

  if (items.length === 0) {
    const emptyStateEl = document.createElement("div");

    emptyStateEl.className = "aiw-empty";
    emptyStateEl.textContent = "No items yet";

    container.append(emptyStateEl);

    return;
  }

  // ----------------------------------------------------------
  // Main render loop
  // ----------------------------------------------------------

  for (const item of items) {
    const itemRowEl = createItemRow(item, selectedItemId, onItemClick);

    container.append(itemRowEl);
  }
}

/**
 * Create a single item row element.
 */
function createItemRow(
  item: Item,
  selectedItemId: string | null,
  onItemClick: (id: string) => void,
): HTMLDivElement {
  const itemRowEl = document.createElement("div");

  // ----------------------------------------------------------
  // Base styling
  // ----------------------------------------------------------

  itemRowEl.className = "aiw-items-row";

  // ----------------------------------------------------------
  // Display label
  // ----------------------------------------------------------

  const displayLabel = deriveItemLabel(item);

  itemRowEl.textContent = displayLabel;

  // ----------------------------------------------------------
  // Metadata hooks
  // ----------------------------------------------------------

  /**
   * Useful for:
   * - debugging
   * - future event delegation
   * - testing
   */
  itemRowEl.dataset.itemId = item.id;

  /**
   * Future styling hook:
   * aiw-item--note
   * aiw-item--prompt
   * aiw-item--chat
   */
  itemRowEl.classList.add(`aiw-item--${item.type}`);

  // ----------------------------------------------------------
  // Selected-state styling
  // ----------------------------------------------------------

  if (item.id === selectedItemId) {
    itemRowEl.classList.add("aiw-items-row--active");
  }

  // ----------------------------------------------------------
  // Interaction
  // ----------------------------------------------------------

  itemRowEl.addEventListener("click", () => {
    onItemClick(item.id);
  });

  return itemRowEl;
}

/**
 * Derives a user-facing label for an item.
 *
 * PRIORITY:
 * 1. Non-empty title
 * 2. Content preview
 * 3. Placeholder fallback
 */
function deriveItemLabel(item: Item): string {
  // ----------------------------------------------------------
  // Prefer explicit title
  // ----------------------------------------------------------

  const title = item.title.trim();

  if (title) {
    return title;
  }

  // ----------------------------------------------------------
  // Normalize content preview
  // ----------------------------------------------------------

  /**
   * Collapses repeated whitespace/newlines
   * into a single readable space.
   */
  const normalizedContent = item.content.trim().replace(/\s+/g, " ");

  // ----------------------------------------------------------
  // Empty fallback
  // ----------------------------------------------------------

  if (!normalizedContent) {
    return "Untitled item";
  }

  // ----------------------------------------------------------
  // Truncate long previews
  // ----------------------------------------------------------

  if (normalizedContent.length > MAX_PREVIEW_LENGTH) {
    return normalizedContent.slice(0, MAX_PREVIEW_LENGTH) + "...";
  }

  return normalizedContent;
}
