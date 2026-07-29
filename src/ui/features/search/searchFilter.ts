// src/ui/features/search/searchFilter.ts
// ------------------------------------------------------------
// SEARCH FILTER
// ------------------------------------------------------------
//
// Responsibility:
// - pure in-memory matching for workspace search: query in,
//   grouped project/item matches out
//
// IMPORTANT:
// - matching is case-insensitive substring over USER-VISIBLE
//   text only: project name, item title, item content
// - type and meta are DELIBERATELY not searched — a match must
//   always be explainable by looking at the result
// - empty/whitespace query returns empty groups: no question,
//   no answer (the panel shows a placeholder instead)
// - pure module: NO DOM, NO storage, NO state imports — all
//   data arrives as parameters (this is what makes it testable)
// ------------------------------------------------------------

import type { Project } from "../../../models/project";
import type { Item } from "../../../models/item";

// ------------------------------------------------------------
// RESULT SHAPE
// ------------------------------------------------------------
//
// Grouped, not ranked: the renderer shows a Projects section and
// an Items section. If relevance ranking ever becomes real, this
// shape changes then — under the supervision of the tests.
// ------------------------------------------------------------

export type SearchResults = {
  projects: Project[];
  items: Item[];
};

// ------------------------------------------------------------
// FILTER
// ------------------------------------------------------------

export function filterWorkspace(
  query: string,
  projects: Project[],
  items: Item[],
): SearchResults {
  // Normalize ONCE, use everywhere:
  // - trim: stray whitespace from keyboards/paste must not hide
  //   results ("recipe " still finds "recipe")
  // - lowercase: matching is case-insensitive; every field below
  //   is lowercased too — normalizing only one side is the
  //   classic bug the tests pin against
  const normalizedQuery = query.trim().toLowerCase();

  // No question, no answer. Empty groups — never null.
  if (normalizedQuery === "") {
    return { projects: [], items: [] };
  }

  return {
    projects: projects.filter((project) =>
      project.name.toLowerCase().includes(normalizedQuery),
    ),
    items: items.filter(
      (item) =>
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.content.toLowerCase().includes(normalizedQuery),
    ),
  };
}
