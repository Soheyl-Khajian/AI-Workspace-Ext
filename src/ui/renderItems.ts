// src/ui/renderItems.ts
// ------------------------------------------------------------
// Responsibility:
// Render a list of Item domain objects into a DOM container.
//
// Rules:
// - Pure rendering (no state, no DB access)
// - Derives display text only (does not mutate data)
// - Delegates interaction via callback
// ------------------------------------------------------------

import { Item } from "../models/item";

/**
 * Maximum length for preview text when no title exists.
 * Note: ellipsis is added on overflow, so actual visible length may exceed slightly.
 */
const MAX_PREVIEW_LENGTH = 45;

/**
 * Renders item list into a container element.
 */
export function renderItems(
  container: HTMLElement,
  items: Item[],
  onItemClick?: (id: string) => void,
) {
  // Reset UI before re-render
  container.textContent = "";

  // Empty state rendering
  if (items.length === 0) {
    const emptyStateEl = document.createElement("div");
    emptyStateEl.textContent = "No items yet";
    emptyStateEl.className = "aiw-empty";

    container.append(emptyStateEl);
    return;
  }

  // Main render loop
  for (const item of items) {
    const itemRowEl = document.createElement("div");
    itemRowEl.className = "aiw-items-row";

    // Compute display label (UI concern only)
    const displayLabel = deriveItemLabel(item);

    itemRowEl.textContent = displayLabel;

    // Type-based styling hook (future: icons, colors, filters)
    itemRowEl.classList.add(`aiw-item--${item.type}`);

    // Useful for debugging / future event delegation
    itemRowEl.dataset.itemId = item.id;

    // Interaction binding
    if (onItemClick) {
      itemRowEl.addEventListener("click", () => {
        onItemClick(item.id);
      });
    }

    container.append(itemRowEl);
  }
}

/**
 * Derives a user-facing label for an item.
 *
 * Priority:
 * 1. Non-empty title
 * 2. Cleaned preview from content
 * 3. Fallback placeholder
 */
function deriveItemLabel(item: Item): string {
  const title = item.title.trim();

  if (title) {
    return title;
  }

  const normalizedContent = item.content.trim().replace(/\s+/g, " ");

  if (!normalizedContent) {
    return "Untitled item";
  }

  if (normalizedContent.length > MAX_PREVIEW_LENGTH) {
    return normalizedContent.slice(0, MAX_PREVIEW_LENGTH) + "...";
  }

  return normalizedContent;
}
