// src/storage/index.test.ts
// ------------------------------------------------------------
// STORAGE FACADE CONTRACT TESTS
// ------------------------------------------------------------
//
// Contract under test (see index.ts):
//
// - the facade is the only door: tests arrange AND assert through
//   exported functions, never through repos or raw IndexedDB
// - projects: create/list round-trip, get-or-create idempotence,
//   rename with immutable id/createdAt
// - items: creation normalization (generated id, trimmed title,
//   stamped createdAt), per-project filtering, newest-first
//   cross-project listing, partial update with immutable
//   id/projectId/createdAt
// - move: moveItemToProject is the ONLY door that changes an
//   item's projectId (updateItem deliberately ignores it). Moves
//   touch projectId and updatedAt only, require an existing
//   target project, and are no-ops when the item is already there
// - backup: exportAllData/replaceAllData restore a snapshot
//   verbatim and wipe whatever was there before
//
// Environment:
//
// - fake-indexeddb provides the IndexedDB global. Per-file import
//   rather than setupFiles: this is the only DB-backed suite, and
//   the import documents that fact.
// - isolation: every test gets a brand-new IDBFactory, so openDb
//   re-runs migrations against an empty database each time.
//   Nothing leaks between tests, and unlike deleteDatabase this
//   can never block on a lingering connection.
// - clock: vi.useFakeTimers fakes ONLY Date. fake-indexeddb
//   schedules its async work with real timers; faking those would
//   hang every storage call forever.
//
// Scope note: the null/empty-id argument guards are pinned once,
// on updateItem, as representative of the validation pattern all
// facade doors share. If a door's validation diverges, test it
// separately then.
// ------------------------------------------------------------

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

import type { Item } from "../models/item";
import {
  createItem,
  createProject,
  deleteItem,
  deleteProjectCascade,
  exportAllData,
  getOrCreateProjectByName,
  listAllItems,
  listItemsByProject,
  listProjects,
  moveItemToProject,
  renameProject,
  replaceAllData,
  updateItem,
} from ".";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

// Shape promised by crypto.randomUUID(), including the version
// nibble (4) and variant nibble ([89ab]).
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ------------------------------------------------------------
// FIXTURES
// ------------------------------------------------------------

/**
 * Create a note item through the facade with the boilerplate
 * arguments filled in, so each test states only the facts it
 * asserts about. Tests that assert on createItem's argument
 * handling call the facade directly instead.
 */
function createNote(projectId: string, title: string): Promise<Item> {
  return createItem(projectId, "note", title, `${title} content`, {
    createdFrom: "manual",
  });
}

describe("storage facade", () => {
  beforeEach(() => {
    // Fresh database per test; openDb migrates it on first touch.
    indexedDB = new IDBFactory();
    // Surgical fake: Date only — see header.
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ------------------------------------------------------------
  // PROJECTS
  // ------------------------------------------------------------

  it("createProject persists a project that listProjects returns", async () => {
    const project = await createProject("Project-1");

    await expect(listProjects()).resolves.toEqual([project]);
  });

  it("getOrCreateProjectByName returns the existing project instead of creating a duplicate", async () => {
    const first = await getOrCreateProjectByName("inbox");
    const second = await getOrCreateProjectByName("inbox");

    expect(second).toEqual(first);
    await expect(listProjects()).resolves.toEqual([first]);
  });

  it("renameProject renames but preserves id and createdAt", async () => {
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    const project = await createProject("Project-1");

    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    const renamed = await renameProject(project.id, "Renamed Project");

    // Expected built from the PRE-rename record, so id/createdAt
    // drift cannot hide inside the returned value.
    expect(renamed).toEqual({
      ...project,
      name: "Renamed Project",
      updatedAt: Date.parse("2026-01-01T12:00:00.000Z"),
    });
    await expect(listProjects()).resolves.toEqual([renamed]);
  });

  // ------------------------------------------------------------
  // ITEMS: CREATE + LIST
  // ------------------------------------------------------------

  it("createItem generates an id, trims the title, stamps createdAt, and persists", async () => {
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    const project = await createProject("Project-1");

    const item = await createItem(
      project.id,
      "note",
      "  Item-1  ",
      "Item-1 content",
      { createdFrom: "manual" },
    );

    expect(item.id).toMatch(UUID_V4_REGEX);
    expect(item.title).toBe("Item-1");
    expect(item.createdAt).toBe(Date.parse("2026-01-01T10:00:00.000Z"));
    await expect(listItemsByProject(project.id)).resolves.toEqual([item]);
  });

  it("listItemsByProject returns only that project's items", async () => {
    const projectA = await createProject("Project-A");
    const projectB = await createProject("Project-B");
    const itemA = await createNote(projectA.id, "Item-A");
    await createNote(projectB.id, "Item-B");

    await expect(listItemsByProject(projectA.id)).resolves.toEqual([itemA]);
  });

  it("listAllItems returns items across all projects, newest-first", async () => {
    const projectA = await createProject("Project-A");
    const projectB = await createProject("Project-B");

    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    const oldest = await createNote(projectA.id, "Item-1");
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    const middle = await createNote(projectB.id, "Item-2");
    vi.setSystemTime(new Date("2026-01-01T14:00:00.000Z"));
    const newest = await createNote(projectA.id, "Item-3");

    await expect(listAllItems()).resolves.toEqual([newest, middle, oldest]);
  });

  // ------------------------------------------------------------
  // ITEMS: UPDATE
  // ------------------------------------------------------------

  it("updateItem merges updates but preserves id, projectId and createdAt", async () => {
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    const project = await createProject("Project-1");
    const item = await createNote(project.id, "Item-1");

    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    const updatedItem = await updateItem(item.id, {
      title: "updated-title",
      content: "updated-content",
      // Attempted overwrites of the immutable fields — all must be ignored.
      id: "changed-id",
      projectId: "changed-project-id",
      createdAt: Date.now(),
    });

    // Everything as created, except exactly what an update may touch.
    expect(updatedItem).toEqual({
      ...item,
      title: "updated-title",
      content: "updated-content",
      updatedAt: Date.parse("2026-01-01T12:00:00.000Z"),
    });
    await expect(listAllItems()).resolves.toEqual([updatedItem]);
  });

  it("updateItem rejects when the item id is null", async () => {
    // Deliberate lie to the compiler: this guard exists for untyped
    // JS callers, which the type system cannot represent.
    await expect(updateItem(null as unknown as string, {})).rejects.toThrow(
      "item id is required (null/undefined)",
    );
  });

  it("updateItem rejects when the item id is empty", async () => {
    await expect(updateItem("", {})).rejects.toThrow("item id cannot be empty");
    await expect(updateItem("   ", {})).rejects.toThrow(
      "item id cannot be empty",
    );
  });

  it("updateItem rejects when no item exists with the given id", async () => {
    await expect(updateItem("missing-id", {})).rejects.toThrow(
      "Item not found: missing-id",
    );
  });

  // ------------------------------------------------------------
  // ITEMS: MOVE
  // ------------------------------------------------------------

  it("moveItemToProject moves the item to the target project and stamps updatedAt", async () => {
    const projectA = await createProject("Project-A");
    const projectB = await createProject("Project-B");

    // Deliberately distinctive meta (not the fixture default): the
    // spread-form assertion below then proves a move PRESERVES meta
    // rather than fabricating it. A fixture-uniform meta could hide
    // that class of bug.
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    const item = await createItem(
      projectA.id,
      "note",
      "Item-1",
      "Item-1 content",
      { createdFrom: "selection", sourceUrl: "https://example.com/article" },
    );

    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    const movedItem = await moveItemToProject(item.id, projectB.id);

    // Everything as created, except exactly what a move may touch.
    expect(movedItem).toEqual({
      ...item,
      projectId: projectB.id,
      updatedAt: Date.parse("2026-01-01T12:00:00.000Z"),
    });
    await expect(listItemsByProject(projectA.id)).resolves.toEqual([]);
    await expect(listItemsByProject(projectB.id)).resolves.toEqual([movedItem]);
  });

  it("moveItemToProject returns the item unchanged when it is already in the target project", async () => {
    const projectA = await createProject("Project-A");
    const item = await createNote(projectA.id, "Item-1");

    const movedItem = await moveItemToProject(item.id, projectA.id);

    // "Unchanged" includes updatedAt: a same-target move must not
    // rewrite the record.
    expect(movedItem).toEqual(item);
    await expect(listItemsByProject(projectA.id)).resolves.toEqual([item]);
  });

  it("moveItemToProject rejects when the item doesn't exist", async () => {
    const project = await createProject("Project-A");

    await expect(moveItemToProject("missing-id", project.id)).rejects.toThrow(
      "Item not found: missing-id",
    );
  });

  it("moveItemToProject rejects when the target project doesn't exist", async () => {
    const projectA = await createProject("Project-A");
    const item = await createNote(projectA.id, "Item-1");

    await expect(
      moveItemToProject(item.id, "missing-project-id"),
    ).rejects.toThrow("Project not found: missing-project-id");
  });

  // ------------------------------------------------------------
  // DELETION
  // ------------------------------------------------------------

  it("deleteItem removes the item", async () => {
    const project = await createProject("Project-1");
    const item = await createNote(project.id, "Item-1");

    await deleteItem(item.id);

    await expect(listAllItems()).resolves.toEqual([]);
  });

  it("deleteProjectCascade deletes the project and its items, leaving other projects intact", async () => {
    const doomedProject = await createProject("Project-1");
    await createNote(doomedProject.id, "Item-1");
    const survivorProject = await createProject("Project-2");
    const survivorItem = await createNote(survivorProject.id, "Item-2");

    await deleteProjectCascade(doomedProject.id);

    await expect(listProjects()).resolves.toEqual([survivorProject]);
    await expect(listAllItems()).resolves.toEqual([survivorItem]);
  });

  // ------------------------------------------------------------
  // BACKUP (export / import)
  // ------------------------------------------------------------

  it("replaceAllData wipes current data and restores an exported snapshot", async () => {
    const project = await createProject("Project-1");
    const item = await createNote(project.id, "Item-1");
    const snapshot = await exportAllData();

    // Pollute the workspace after the snapshot was taken...
    const laterProject = await createProject("Project-2");
    await createNote(laterProject.id, "Item-2");

    // ...then restore: the pollution must vanish, the snapshot
    // must come back verbatim.
    await replaceAllData(snapshot.projects, snapshot.items);

    await expect(listProjects()).resolves.toEqual([project]);
    await expect(listAllItems()).resolves.toEqual([item]);
  });
});
