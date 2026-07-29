// src/ui/features/projects/projectsDraftState.test.ts
// ------------------------------------------------------------
// PROJECTS DRAFT STATE — CONTRACT TESTS
// ------------------------------------------------------------
//
// Responsibility:
// - pin the public contract of projectsDraftState: the
//   null-vs-"" draft distinction, last-write-wins setter
//   behavior, and both clearing doors (clear + reset)
//
// IMPORTANT:
// - tests touch ONLY exported doors — never the private state
// - every test starts from a clean slate via beforeEach(reset)
// - this module has no invariant and no guarded door (unlike
//   projectsRenameState), so its contract — and this file —
//   is deliberately smaller
// ------------------------------------------------------------

import { beforeEach, describe, expect, it } from "vitest";

import {
  clearCreateProjectNameDraft,
  getCreateProjectNameDraft,
  resetProjectsDraftState,
  setCreateProjectNameDraft,
} from "./projectsDraftState";

describe("projectsDraftState", () => {
  beforeEach(() => {
    resetProjectsDraftState();
  });

  // ------------------------------------------------------------
  // INITIAL STATE
  // ------------------------------------------------------------

  it("starts with no draft", () => {
    expect(getCreateProjectNameDraft()).toBeNull();
  });

  // ------------------------------------------------------------
  // RECORDING DRAFTS
  // ------------------------------------------------------------

  it("setCreateProjectNameDraft records in-flight text", () => {
    setCreateProjectNameDraft("New Project");

    expect(getCreateProjectNameDraft()).toBe("New Project");
  });

  it("last write wins — setting again replaces the previous draft", () => {
    setCreateProjectNameDraft("first");

    setCreateProjectNameDraft("second");

    expect(getCreateProjectNameDraft()).toBe("second");
  });

  it('treats "" as a real draft — cleared is not the same as no draft', () => {
    setCreateProjectNameDraft("");

    expect(getCreateProjectNameDraft()).toBe("");
  });

  // ------------------------------------------------------------
  // CLEARING DOORS
  // ------------------------------------------------------------
  //
  // clear and reset currently do the same thing, but they are two
  // separate public doors with different jobs: clear = "the draft
  // was consumed or abandoned"; reset = "wipe the whole module
  // (import/reload path)". Pinning both means that if reset ever
  // grows more fields, neither door silently loses coverage.

  it("clearCreateProjectNameDraft returns the state to no-draft", () => {
    setCreateProjectNameDraft("New Project");

    clearCreateProjectNameDraft();

    expect(getCreateProjectNameDraft()).toBeNull();
  });

  it("resetProjectsDraftState returns the state to no-draft (import/reload path)", () => {
    setCreateProjectNameDraft("New Project");

    resetProjectsDraftState();

    expect(getCreateProjectNameDraft()).toBeNull();
  });
});
