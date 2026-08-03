// src/ui/features/items/itemsMenuState.test.ts
// ------------------------------------------------------------
// ITEMS MENU STATE — CONTRACT TESTS
// ------------------------------------------------------------
//
// Responsibility:
// - pin the public contract of itemsMenuState: at most one open
//   menu (last write wins), fresh opens always on root, the
//   guarded movePicker door, snapshot reads, and both closing
//   doors (close + reset)
//
// IMPORTANT:
// - tests touch ONLY exported doors — never the private state
// - every test starts from a clean slate via beforeEach(reset)
// - "a page without an open menu" is structurally
//   unrepresentable, so there is no test for it — the shape IS
//   the defense. What the tests pin instead: a stale movePicker
//   can never leak into the NEXT open.
// ------------------------------------------------------------

import { beforeEach, describe, expect, it } from "vitest";

import {
  closeItemMenu,
  getOpenItemMenu,
  openItemMenu,
  resetItemsMenuState,
  showItemMenuMovePicker,
} from "./itemsMenuState";

describe("itemsMenuState", () => {
  beforeEach(() => {
    resetItemsMenuState();
  });

  // ------------------------------------------------------------
  // INITIAL STATE
  // ------------------------------------------------------------

  it("starts with no open menu", () => {
    expect(getOpenItemMenu()).toBeNull();
  });

  // ------------------------------------------------------------
  // OPENING
  // ------------------------------------------------------------

  it("openItemMenu opens on the root page", () => {
    openItemMenu("i1");

    expect(getOpenItemMenu()).toEqual({ itemId: "i1", page: "root" });
  });

  it("last write wins — opening another row's menu replaces the first", () => {
    openItemMenu("i1");

    openItemMenu("i2");

    expect(getOpenItemMenu()).toEqual({ itemId: "i2", page: "root" });
  });

  // ------------------------------------------------------------
  // MOVE PICKER PAGE
  // ------------------------------------------------------------

  it("showItemMenuMovePicker morphs the open menu to the move picker", () => {
    openItemMenu("i1");

    showItemMenuMovePicker();

    expect(getOpenItemMenu()).toEqual({ itemId: "i1", page: "movePicker" });
  });

  it("ignores the move picker while no menu is open — the guarded door keeps the contract", () => {
    showItemMenuMovePicker();

    expect(getOpenItemMenu()).toBeNull();
  });

  it("a stale move picker never leaks into the next open — fresh opens land on root", () => {
    openItemMenu("i1");
    showItemMenuMovePicker();

    openItemMenu("i2");

    expect(getOpenItemMenu()).toEqual({ itemId: "i2", page: "root" });
  });

  // ------------------------------------------------------------
  // SNAPSHOT READS
  // ------------------------------------------------------------

  it("getOpenItemMenu returns a snapshot — mutating it does not change state", () => {
    openItemMenu("i1");

    const snapshot = getOpenItemMenu();
    if (snapshot === null) throw new Error("expected an open menu");
    snapshot.page = "movePicker";

    expect(getOpenItemMenu()).toEqual({ itemId: "i1", page: "root" });
  });

  // ------------------------------------------------------------
  // CLOSING DOORS
  // ------------------------------------------------------------

  it("closeItemMenu returns the state to no-menu", () => {
    openItemMenu("i1");
    showItemMenuMovePicker();

    closeItemMenu();

    expect(getOpenItemMenu()).toBeNull();
  });

  it("resetItemsMenuState returns the state to no-menu (import/reload path)", () => {
    openItemMenu("i1");

    resetItemsMenuState();

    expect(getOpenItemMenu()).toBeNull();
  });
});
