// src/ui/features/items/itemsMenuState.ts
// ------------------------------------------------------------
// ITEMS ROW MENU STATE
// ------------------------------------------------------------
//
// Responsibility:
// - track which item row's "…" menu is open (at most one) and
//   which page it is showing (root actions / move picker)
//
// IMPORTANT:
// - menu openness is STATE, not DOM: renderers re-project the
//   open menu after every wipe-rebuild, so a background
//   re-render can never close it (DOM-held-state ledger)
// - SHAPE: one nullable object, not two fields. "A page without
//   an open menu" is unrepresentable — the invariant is
//   structural. This is a deliberate step past the
//   two-primitives-plus-guarded-door shape of
//   projectsRenameState, which needs separate fields because
//   its null draft is a meaningful signal while editing.
//   Nothing forces separation here, so the stronger shape wins.
// - "only one open" WITHIN this feature is structural. ACROSS
//   features it is owned by the coordinator glue in the
//   composition root.
// ------------------------------------------------------------

export type ItemMenuPage = "root" | "movePicker";

export type OpenItemMenu = {
  itemId: string;
  page: ItemMenuPage;
};

let openMenu: OpenItemMenu | null = null;

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

export function getOpenItemMenu(): OpenItemMenu | null {
  if (openMenu === null) return null;

  // Snapshot copy: callers can never mutate module state through
  // the returned object. Transitions happen only via the doors.
  return { ...openMenu };
}

// ------------------------------------------------------------
// TRANSITIONS
// ------------------------------------------------------------

export function openItemMenu(itemId: string): void {
  // A fresh open ALWAYS lands on the root page — a stale
  // movePicker can never leak into the next open because the
  // whole object is replaced. Last write wins across rows.
  openMenu = { itemId, page: "root" };
}

export function showItemMenuMovePicker(): void {
  // Guarded door: morphing to a page only means something while
  // a menu is open. Ignoring the call keeps the contract without
  // an error path (same posture as setRenameDraft outside an
  // active rename edit).
  if (openMenu === null) return;

  openMenu = { itemId: openMenu.itemId, page: "movePicker" };
}

export function closeItemMenu(): void {
  openMenu = null;
}

// ------------------------------------------------------------
// RESET (import/reload path)
// ------------------------------------------------------------
//
// Same body as closeItemMenu today, but a separate door on
// purpose: every state module exposes reset* for the
// import/reload path, and the two doors may diverge later.
// ------------------------------------------------------------

export function resetItemsMenuState(): void {
  openMenu = null;
}
