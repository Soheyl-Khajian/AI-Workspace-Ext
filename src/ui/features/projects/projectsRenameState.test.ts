// src/ui/features/projects/projectsRenameState.test.ts
// ------------------------------------------------------------
// PROJECTS RENAME STATE — CONTRACT TESTS
// ------------------------------------------------------------
//
// Responsibility:
// - pin the public contract of projectsRenameState: the
//   not-editing/no-draft invariant, the null-vs-"" draft
//   distinction, and reset behavior
//
// IMPORTANT:
// - tests touch ONLY exported doors — never the private state
// - every test starts from a clean slate via beforeEach(reset)
// ------------------------------------------------------------

import { beforeEach, describe, expect, it } from "vitest";

import {
  getEditingProjectId,
  getRenameDraft,
  resetProjectsRenameState,
  setRenameDraft,
  startRenameEditing,
  stopRenameEditing,
} from "./projectsRenameState";

describe("projectsRenameState", () => {
  beforeEach(() => {
    resetProjectsRenameState();
  });

  it("starts with no edit and no draft", () => {
    expect(getEditingProjectId()).toBeNull();
    expect(getRenameDraft()).toBeNull();
  });

  it("startRenameEditing enters edit mode with a null draft (first-render signal)", () => {
    startRenameEditing("p1");

    expect(getEditingProjectId()).toBe("p1");
    expect(getRenameDraft()).toBeNull();
  });

  it("ignores draft text while not editing — the guarded door keeps the invariant", () => {
    setRenameDraft("fake text");

    expect(getRenameDraft()).toBeNull();
    expect(getEditingProjectId()).toBeNull();
  });

  it("setRenameDraft records in-flight text while editing", () => {
    startRenameEditing("p1");

    setRenameDraft("New name");

    expect(getRenameDraft()).toBe("New name");
  });

  it('treats "" as a real draft — cleared is not the same as no draft', () => {
    startRenameEditing("p1");

    setRenameDraft("");

    expect(getRenameDraft()).toBe("");
  });

  it("stopRenameEditing restores the invariant: no edit, no draft", () => {
    startRenameEditing("p1");
    setRenameDraft("half-typed");

    stopRenameEditing();

    expect(getEditingProjectId()).toBeNull();
    expect(getRenameDraft()).toBeNull();
  });

  it("starting a new edit discards the previous edit's stale draft", () => {
    startRenameEditing("p1");
    setRenameDraft("stale text");

    startRenameEditing("p2");

    expect(getEditingProjectId()).toBe("p2");
    expect(getRenameDraft()).toBeNull();
  });

  it("resetProjectsRenameState clears everything (import/reload path)", () => {
    startRenameEditing("p1");
    setRenameDraft("anything");

    resetProjectsRenameState();

    expect(getEditingProjectId()).toBeNull();
    expect(getRenameDraft()).toBeNull();
  });
});
