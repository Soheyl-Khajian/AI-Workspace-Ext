// src/ui/features/search/renderSearchPanel.ts
// ------------------------------------------------------------
// SEARCH PANEL RENDERER
// ------------------------------------------------------------
//
// Responsibility:
//
// - render search floating panel UI (search bar + results region)
// - render search runtime states (loading / error / placeholder /
//   empty / results)
// - mount panel DOM into provided container
//
// IMPORTANT:
//
// - PURE renderer
// - NO state mutation
// - NO storage access
// - NO global DOM queries
// - NO business logic
// - NO async logic
//
// SCOPED RE-RENDER (why renderSearchResults is exported):
//
// - the search input must SURVIVE keystroke-driven re-renders;
//   a full wipe-rebuild would destroy the element mid-typing
//   (focus loss — the disease drafts cure for rename)
// - so query changes re-render ONLY the results region: the
//   debounced input handler asks the composition root to call
//   renderSearchResults on the existing container
// - full panel renders (open / reload) rebuild everything and
//   re-hydrate the input from the query draft
// ------------------------------------------------------------

import type { Item } from "../../../models/item";
import type { Project } from "../../../models/project";

import { createFloatingPanelShell } from "../../shared/createFloatingPanelShell";
import { createPanelState } from "../../shared/createPanelState";
import { filterWorkspace } from "./searchFilter";

import { getSearchQueryDraft } from "./searchDraftState";
import {
  getSearchError,
  getSearchItems,
  getSearchProjects,
  isSearchLoading,
  isSearchLoadingIndicatorVisible,
} from "./searchState";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const SEARCH_RESULTS_CLASS = "aiw-search-results";

/*
  Exported for the composition root: the debounced input handler
  needs to locate the results container inside the live panel to
  perform the scoped re-render (see header).
*/
export const SEARCH_RESULTS_SELECTOR = `.${SEARCH_RESULTS_CLASS}`;

// ------------------------------------------------------------
// PANEL RENDERER
// ------------------------------------------------------------

export function renderSearchPanel(containerEl: HTMLElement): HTMLElement {
  const shell = createFloatingPanelShell("Search");

  // ------------------------------------------------------------
  // SEARCH BAR (pinned between header and scrollable body so it
  // never scrolls away with long result lists)
  // ------------------------------------------------------------

  const searchBarEl = document.createElement("div");
  searchBarEl.className = "aiw-search-bar";

  const inputEl = document.createElement("input");
  inputEl.className = "aiw-search-input";
  inputEl.type = "text";
  inputEl.placeholder = "Search projects and items";

  // Hydrate from draft; null and "" are different facts (see
  // searchDraftState) — hence ?? and never truthiness.
  inputEl.value = getSearchQueryDraft() ?? "";

  searchBarEl.append(inputEl);
  shell.panelEl.insertBefore(searchBarEl, shell.bodyEl);

  // ------------------------------------------------------------
  // RESULTS REGION (single render path: full panel renders and
  // scoped keystroke renders both flow through renderSearchResults)
  // ------------------------------------------------------------

  const resultsEl = document.createElement("div");
  resultsEl.className = SEARCH_RESULTS_CLASS;

  shell.bodyEl.append(resultsEl);

  renderSearchResults(resultsEl);

  // ------------------------------------------------------------
  // FINAL ASSEMBLY
  // ------------------------------------------------------------

  containerEl.append(shell.panelEl);

  return shell.panelEl;
}

// ------------------------------------------------------------
// RESULTS RENDERER (scoped re-render target)
// ------------------------------------------------------------

export function renderSearchResults(resultsEl: HTMLElement): void {
  resultsEl.textContent = "";

  // ------------------------------------------------------------
  // RUNTIME STATES (loading / error)
  // ------------------------------------------------------------

  if (isSearchLoading()) {
    /*
      Quiet window: loading, but the indicator delay hasn't
      elapsed. Render an intentionally empty region — fast loads
      finish inside this window with no intermediate frame.
    */
    if (isSearchLoadingIndicatorVisible()) {
      resultsEl.append(
        createPanelState({ variant: "loading", message: "Loading..." }),
      );
    }
    return;
  }

  const error = getSearchError();
  if (error !== null) {
    resultsEl.append(createPanelState({ variant: "error", message: error }));
    return;
  }

  // ------------------------------------------------------------
  // QUERY-DRIVEN STATES (placeholder / empty / results)
  // ------------------------------------------------------------

  const query = getSearchQueryDraft() ?? "";

  // Empty/whitespace queries show nothing by design (searchFilter
  // contract); the placeholder invites typing instead.
  if (query.trim().length === 0) {
    resultsEl.append(
      createPanelState({ variant: "placeholder", message: "Type to search" }),
    );
    return;
  }

  const results = filterWorkspace(query, getSearchProjects(), getSearchItems());

  const isEmpty = results.projects.length === 0 && results.items.length === 0;

  if (isEmpty) {
    resultsEl.append(
      createPanelState({ variant: "empty", message: "No results" }),
    );
    return;
  }

  if (results.projects.length > 0) {
    resultsEl.append(createSectionHeading("Projects"));

    for (const project of results.projects) {
      resultsEl.append(createProjectResultRow(project));
    }
  }

  if (results.items.length > 0) {
    resultsEl.append(createSectionHeading("Items"));

    for (const item of results.items) {
      resultsEl.append(createItemResultRow(item));
    }
  }
}

// ------------------------------------------------------------
// ROW BUILDERS (internal)
// ------------------------------------------------------------

function createSectionHeading(label: string): HTMLElement {
  const headingEl = document.createElement("h3");
  headingEl.className = "aiw-search-section-heading";
  headingEl.textContent = label;

  return headingEl;
}

/*
  Rows are buttons from day one (keyboard reachable, obvious
  interaction affordance) and carry dataset ids so a future
  navigation handler can delegate without renderer changes.
  They deliberately do NOT reuse .aiw-project-row / .aiw-item-row:
  those classes are behavior hooks owned by sibling features'
  delegated handlers — sharing them would let projects/items
  handlers capture clicks inside the search panel.
*/

function createProjectResultRow(project: Project): HTMLElement {
  const rowEl = document.createElement("button");
  rowEl.type = "button";
  rowEl.className = "aiw-search-result-row";
  rowEl.dataset.projectId = project.id;

  const textEl = document.createElement("span");
  textEl.className = "aiw-search-result-text";
  textEl.textContent = project.name;

  rowEl.append(textEl);

  return rowEl;
}

function createItemResultRow(item: Item): HTMLElement {
  const rowEl = document.createElement("button");
  rowEl.type = "button";
  rowEl.className = "aiw-search-result-row";
  rowEl.dataset.itemId = item.id;

  const textEl = document.createElement("span");
  textEl.className = "aiw-search-result-text";

  if (item.title.length > 0) {
    textEl.textContent = item.title;
  } else {
    textEl.textContent = "Untitled";
    textEl.classList.add("aiw-search-result-text--untitled");
  }

  rowEl.append(textEl);

  return rowEl;
}
