// src/ui/features/search/searchFilter.test.ts
// ------------------------------------------------------------
// SEARCH FILTER — CONTRACT TESTS
// ------------------------------------------------------------
//
// Responsibility:
// - pin the search matching contract: empty/whitespace queries,
//   per-field matching, case-insensitivity, substring matching,
//   query trimming, and the type/meta exclusions
//
// IMPORTANT:
// - written test-first: this file IS the design record of what
//   "a match" means
// - builders provide boring valid defaults; each test overrides
//   only the fields it is about
// - filterWorkspace is pure, so there is no state to reset
//   between tests — no beforeEach needed
// ------------------------------------------------------------

import { describe, expect, it } from "vitest";

import { filterWorkspace } from "./searchFilter";

import type { Item } from "../../../models/item";
import type { Project } from "../../../models/project";

// ------------------------------------------------------------
// TEST DATA BUILDERS
// ------------------------------------------------------------
//
// Boring valid defaults; overrides win via spread. Defaults are
// chosen to never accidentally match the queries used below.
// ------------------------------------------------------------

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "Default project",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    projectId: "project-1",
    type: "note",
    title: "Default title",
    content: "Default content",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    meta: { createdFrom: "manual" },
    ...overrides,
  };
}

describe("searchFilter", () => {
  // ------------------------------------------------------------
  // EMPTY QUERIES
  // ------------------------------------------------------------

  it("empty query returns no matches", () => {
    // Empty-string FIELDS on purpose: a naive implementation
    // would "match" an empty query against empty fields — this
    // pins that no query means no answer, ever.
    const projects = [makeProject({ name: "" })];
    const items = [makeItem({ title: "" })];

    const result = filterWorkspace("", projects, items);

    expect(result).toEqual({ projects: [], items: [] });
  });

  it("whitespace-only query returns no matches", () => {
    // Whitespace fields for the same reason as above: "   "
    // must count as no question, even when it would substring-
    // match real field text.
    const projects = [makeProject({ name: "   " })];
    const items = [makeItem({ title: "   " })];

    const result = filterWorkspace("   ", projects, items);

    expect(result).toEqual({ projects: [], items: [] });
  });

  // ------------------------------------------------------------
  // SEARCHED FIELDS (one test per visible field)
  // ------------------------------------------------------------

  it("matches a project by name", () => {
    const projects = [makeProject({ name: "Recipe Ideas" })];
    const items = [makeItem()];

    const result = filterWorkspace("Recipe Ideas", projects, items);

    expect(result).toEqual({ projects, items: [] });
  });

  it("matches an item by title", () => {
    const projects = [makeProject()];
    const items = [makeItem({ title: "Pasta carbonara" })];

    const result = filterWorkspace("Pasta carbonara", projects, items);

    expect(result).toEqual({ projects: [], items });
  });

  it("matches an item by content", () => {
    const projects = [makeProject()];
    const items = [makeItem({ content: "Boil the pasta water first" })];

    const result = filterWorkspace(
      "Boil the pasta water first",
      projects,
      items,
    );

    expect(result).toEqual({ projects: [], items });
  });

  // ------------------------------------------------------------
  // MATCHING RULES
  // ------------------------------------------------------------

  it("matches case-insensitively", () => {
    // Mixed-case DATA is the point: an implementation that
    // normalizes only the query passes an all-lowercase-data
    // test but fails against real data, which has capitals.
    const projects = [makeProject({ name: "Recipe Ideas" })];
    const items = [makeItem({ title: "Pasta Carbonara" })];

    const resultForUpperQuery = filterWorkspace(
      "RECIPE IDEAS",
      projects,
      items,
    );
    const resultForLowerQuery = filterWorkspace(
      "pasta carbonara",
      projects,
      items,
    );

    expect(resultForUpperQuery).toEqual({ projects, items: [] });
    expect(resultForLowerQuery).toEqual({ projects: [], items });
  });

  it("matches a substring inside a longer word", () => {
    const projects = [makeProject({ name: "Recipe Ideas" })];
    const items = [makeItem({ content: "Boil the pasta water" })];

    const resultForNameFragment = filterWorkspace("cip", projects, items);
    const resultForContentFragment = filterWorkspace(
      "asta wat",
      projects,
      items,
    );

    expect(resultForNameFragment).toEqual({ projects, items: [] });
    expect(resultForContentFragment).toEqual({ projects: [], items });
  });

  it("ignores whitespace around the query", () => {
    // Stray spaces from keyboards/paste must not hide results.
    const projects = [makeProject({ name: "Recipe Ideas" })];
    const items = [makeItem()];

    const result = filterWorkspace("  recipe  ", projects, items);

    expect(result).toEqual({ projects, items: [] });
  });

  it("no occurrence anywhere returns empty result groups", () => {
    const projects = [makeProject({ name: "Recipe Ideas" })];
    const items = [makeItem()];

    const result = filterWorkspace("zzz", projects, items);

    // Empty ARRAYS, never null/undefined — the renderer relies
    // on this shape without defensive checks.
    expect(result).toEqual({ projects: [], items: [] });
  });

  // ------------------------------------------------------------
  // DELIBERATE EXCLUSIONS (decisions, not accidents)
  // ------------------------------------------------------------

  it("does NOT match on type", () => {
    // "note" appears only in the invisible type field, so this
    // item must stay invisible to search.
    const projects = [makeProject()];
    const items = [makeItem({ type: "note" })];

    const result = filterWorkspace("note", projects, items);

    expect(result).toEqual({ projects: [], items: [] });
  });

  it("does NOT match on meta", () => {
    // Capture provenance is not visible in the UI yet; a match
    // the user cannot see looks like a bug. When sourceUrl
    // becomes visible, it graduates into the searchable set —
    // and this test changes with it.
    const projects = [makeProject()];
    const items = [
      makeItem({
        meta: {
          createdFrom: "selection",
          sourceUrl: "https://chatgpt.com/c/pasta-thread",
        },
      }),
    ];

    const result = filterWorkspace("chatgpt", projects, items);

    expect(result).toEqual({ projects: [], items: [] });
  });
});
