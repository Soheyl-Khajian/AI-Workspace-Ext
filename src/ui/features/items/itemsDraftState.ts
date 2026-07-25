// src/ui/features/items/itemsDraftState.ts
// ------------------------------------------------------------
// ITEMS DRAFT STATE
// ------------------------------------------------------------
//
// Responsibility:
// - hold in-flight (not yet submitted) form text for the items
//   feature: create-item form and item-detail form
// - survive wipe-rebuild re-renders: renderers re-hydrate inputs
//   from here instead of losing typed text
//
// IMPORTANT:
//
// - null and "" are DIFFERENT facts:
//   null = "no draft — show the source of truth"
//   ""   = "user deliberately cleared the field — keep it empty"
//   Callers must hydrate with `draft ?? fallback`, never truthiness.
// - detail drafts are keyed by item id (DECISION): a draft belongs
//   to an item, so navigating between items preserves each item's
//   half-edit and cross-contamination is structurally impossible
// - runtime-only memory state — NOT persistent storage
// - NO DOM access, NO rendering, NO business orchestration
// ------------------------------------------------------------

// ------------------------------------------------------------
// STATE SHAPE
// ------------------------------------------------------------

type ItemDetailDraft = {
  title: string | null;
  content: string | null;
};

type ItemsDraftState = {
  createTitle: string | null;
  createContent: string | null;
  detailDrafts: Map<string, ItemDetailDraft>;
};

// ------------------------------------------------------------
// PRIVATE STATE
// ------------------------------------------------------------

const state: ItemsDraftState = {
  createTitle: null,
  createContent: null,
  detailDrafts: new Map(),
};

// ------------------------------------------------------------
// CREATE-ITEM DRAFT
// ------------------------------------------------------------

export function getCreateItemTitleDraft(): string | null {
  return state.createTitle;
}

export function getCreateItemContentDraft(): string | null {
  return state.createContent;
}

export function setCreateItemTitleDraft(value: string): void {
  state.createTitle = value;
}

export function setCreateItemContentDraft(value: string): void {
  state.createContent = value;
}

export function clearCreateItemDraft(): void {
  state.createTitle = null;
  state.createContent = null;
}

// ------------------------------------------------------------
// ITEM-DETAIL DRAFT (keyed by item id)
// ------------------------------------------------------------

export function getItemDetailTitleDraft(itemId: string): string | null {
  return state.detailDrafts.get(itemId)?.title ?? null;
}

export function getItemDetailContentDraft(itemId: string): string | null {
  return state.detailDrafts.get(itemId)?.content ?? null;
}

export function setItemDetailTitleDraft(itemId: string, value: string): void {
  const draft = state.detailDrafts.get(itemId) ?? {
    title: null,
    content: null,
  };
  draft.title = value;
  state.detailDrafts.set(itemId, draft);
}

export function setItemDetailContentDraft(itemId: string, value: string): void {
  const draft = state.detailDrafts.get(itemId) ?? {
    title: null,
    content: null,
  };
  draft.content = value;
  state.detailDrafts.set(itemId, draft);
}

export function clearItemDetailDraft(itemId: string): void {
  state.detailDrafts.delete(itemId);
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------

export function resetItemsDraftState(): void {
  state.createTitle = null;
  state.createContent = null;
  state.detailDrafts.clear();
}
