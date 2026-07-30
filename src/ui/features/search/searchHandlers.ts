// src/ui/features/search/searchHandlers.ts
// ------------------------------------------------------------
// SEARCH EVENT HANDLERS (FEATURE BINDINGS)
// ------------------------------------------------------------
//
// Responsibility:
//
// - own the search panel's DOM event handlers (query input)
// - own the search selector constants + debounce delay
// - contribute EventBinding[] to the floating controller's
//   declarative add/remove table via createSearchHandlers()
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO direct storage access (keystrokes filter in memory only)
// - NO rendering logic: the scoped results re-render is injected
//   as deps.renderResults — the composition root owns locating
//   the results container and calling the renderer
// - NO global DOM queries (delegation is scoped to deps.panelsEl)
// - listener lifecycle is owned by the CALLER (register + teardown)
//
// DEBOUNCE (trailing edge):
//
// - the draft write is IMMEDIATE on every keystroke (truth);
//   only the results re-render is debounced (presentation)
// - every keystroke cancels the pending countdown and starts a
//   fresh one; only a countdown no keystroke kills ever fires
// ------------------------------------------------------------

import type { EventBinding } from "../../core/eventBindings";
import { asListener } from "../../core/eventBindings";
import { setSearchQueryDraft } from "./searchDraftState";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const SEARCH_INPUT_SELECTOR = ".aiw-search-input";

/*
  Below ~150ms barely debounces (most inter-keystroke gaps are
  longer); above ~300ms local search starts to feel laggy.
*/
const SEARCH_DEBOUNCE_MS = 200;

// ------------------------------------------------------------
// DEPENDENCIES
// ------------------------------------------------------------

type SearchHandlersDependencies = {
  panelsEl: HTMLElement;
  renderResults: () => void;
};

export function createSearchHandlers(
  deps: SearchHandlersDependencies,
): EventBinding[] {
  /*
    Closure state: the pending countdown's id must survive between
    handler invocations, so it lives in the factory scope — every
    call of handleSearchInput reads and writes this one variable.
  */
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // ----------------------------------------------------------
  // QUERY INPUT HANDLER (debounced results re-render)
  // ----------------------------------------------------------

  function handleSearchInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    // matches(), not closest(): an <input> has no children, so the
    // event target is either the search input itself or irrelevant.
    if (!target.matches(SEARCH_INPUT_SELECTOR)) {
      return;
    }

    // Truth first, immediately: the draft must always hold the
    // current field text (re-renders hydrate from it). Never
    // debounce the draft — only the reaction to it.
    setSearchQueryDraft(target.value);

    // Kill the previous keystroke's countdown (if still pending)...
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
    }

    // ...and start this keystroke's countdown. If no further
    // keystroke arrives within the delay, the render fires with
    // the final query; otherwise the next keystroke kills it.
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      deps.renderResults();
    }, SEARCH_DEBOUNCE_MS);
  }

  // ----------------------------------------------------------
  // BINDINGS TABLE
  // ----------------------------------------------------------

  const eventBindings: EventBinding[] = [
    [deps.panelsEl, "input", asListener(handleSearchInput)],
  ];

  return eventBindings;
}
