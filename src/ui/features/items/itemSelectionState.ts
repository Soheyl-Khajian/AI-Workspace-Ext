// src/ui/features/items/itemSelectionState.ts
// ------------------------------------------------------------
// ITEM SELECTION STATE (CONTEXT PACK)
// ------------------------------------------------------------
//
// Responsibility:
//
// - own the ephemeral set of item IDs ticked for the context pack
// - expose toggle / query / clear operations over that set
//
// IMPORTANT:
//
// - this is MULTI-select batch marking, NOT navigation
// - distinct from sessionState.selectedItemId, which tracks the single
//   item whose detail panel is open (one-at-a-time, drives navigation)
// - selection is runtime-only (never persisted) and is cleared on
//   project switch
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO DOM access
// - NO rendering logic
// - NO storage access
// - NO async work
//
// This layer ONLY owns selection state.
// ------------------------------------------------------------

const selectedItemIds = new Set<string>();

export function toggleItemSelection(id: string): void {
  if (selectedItemIds.has(id)) {
    selectedItemIds.delete(id);
  } else {
    selectedItemIds.add(id);
  }
}

export function isItemSelected(id: string): boolean {
  return selectedItemIds.has(id);
}

export function getSelectedItemIds(): string[] {
  return [...selectedItemIds];
}

export function getSelectedItemsCount(): number {
  return selectedItemIds.size;
}

export function clearItemSelection(): void {
  selectedItemIds.clear();
}
