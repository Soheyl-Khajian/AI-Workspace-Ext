// src/ui/features/search/searchDraftState.ts
// ------------------------------------------------------------
// SEARCH DRAFT STATE
// ------------------------------------------------------------
//
// Responsibility:
// - hold the in-flight search query text
// - survive wipe-rebuild re-renders: the renderer re-hydrates
//   the input from here instead of losing typed text
//
// IMPORTANT:
//
// - null and "" are DIFFERENT facts:
//   null = "no draft — show the source of truth"
//   ""   = "user deliberately cleared the field — keep it empty"
//   Callers must hydrate with `draft ?? fallback`, never truthiness.
// - unlike form drafts, this draft also DRIVES rendering: the
//   debounced input handler re-renders the results region from
//   it (draft write is immediate; only the render is debounced)
// - runtime-only memory state — NOT persistent storage
// - NO DOM access, NO rendering, NO business orchestration
// ------------------------------------------------------------

// ------------------------------------------------------------
// PRIVATE STATE
// ------------------------------------------------------------

type SearchDraftState = {
  query: string | null;
};

const state: SearchDraftState = {
  query: null,
};

// ------------------------------------------------------------
// QUERY DRAFT
// ------------------------------------------------------------

export function getSearchQueryDraft(): string | null {
  return state.query;
}

export function setSearchQueryDraft(value: string): void {
  state.query = value;
}

export function clearSearchQueryDraft(): void {
  state.query = null;
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------

export function resetSearchDraftState(): void {
  state.query = null;
}
