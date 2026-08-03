// src/ui/features/projects/projectsMenuState.test.ts
// ------------------------------------------------------------
// PROJECTS MENU STATE — CONTRACT TESTS
// ------------------------------------------------------------
//
// Responsibility:
// - pin the public contract of projectsMenuState: at most one
//   open menu (last write wins), both closing doors
//   (close + reset)
//
// IMPORTANT:
// - tests touch ONLY exported doors — never the private state
// - every test starts from a clean slate via beforeEach(reset)
// - this module has no second page and no guarded door: its
//   contract — and this file — is deliberately the smallest of
//   the menu pair (the items module owns "movePicker")
// ------------------------------------------------------------

import { beforeEach, describe, expect, it } from "vitest";

import {
  closeProjectMenu,
  getOpenProjectMenuId,
  openProjectMenu,
  resetProjectsMenuState,
} from "./projectsMenuState";

describe("projectsMenuState", () => {
  beforeEach(() => {
    resetProjectsMenuState();
  });

  // ------------------------------------------------------------
  // INITIAL STATE
  // ------------------------------------------------------------

  it("starts with no open menu", () => {
    expect(getOpenProjectMenuId()).toBeNull();
  });

  // ------------------------------------------------------------
  // OPENING
  // ------------------------------------------------------------

  it("openProjectMenu records the open row", () => {
    openProjectMenu("p1");

    expect(getOpenProjectMenuId()).toBe("p1");
  });

  it("last write wins — opening another row's menu replaces the first", () => {
    openProjectMenu("p1");

    openProjectMenu("p2");

    expect(getOpenProjectMenuId()).toBe("p2");
  });

  // ------------------------------------------------------------
  // CLOSING DOORS
  // ------------------------------------------------------------

  it("closeProjectMenu returns the state to no-menu", () => {
    openProjectMenu("p1");

    closeProjectMenu();

    expect(getOpenProjectMenuId()).toBeNull();
  });

  it("resetProjectsMenuState returns the state to no-menu (import/reload path)", () => {
    openProjectMenu("p1");

    resetProjectsMenuState();

    expect(getOpenProjectMenuId()).toBeNull();
  });
});
