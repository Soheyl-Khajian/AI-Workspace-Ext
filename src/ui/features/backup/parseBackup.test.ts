// src/ui/features/backup/parseBackup.test.ts
// ------------------------------------------------------------
// PARSE BACKUP CONTRACT TESTS
// ------------------------------------------------------------
//
// Contract under test (see parseBackup.ts):
//
// - every distinct corruption is rejected with its OWN specific
//   message (possible because only JSON.parse sits in a try/catch)
// - valid backup text comes back as the parsed BackupDocument
//
// Style:
//
// - exported door only (parseBackup); row validators stay private
// - fixtures: makeValidBackup() builds a fully valid document;
//   each rejection test corrupts exactly ONE fact
// - invalid shapes are built by spreading OVER the valid fixture
//   at the call site, so the helpers' types stay honest
// - no beforeEach reset: parseBackup is pure — there is no module
//   state to leak between tests
// ------------------------------------------------------------

import { describe, expect, it } from "vitest";

import type { Item } from "../../../models/item";
import type { Project } from "../../../models/project";
import type { BackupDocument } from "./buildBackup";
import { BACKUP_SCHEMA_VERSION } from "./buildBackup";
import { parseBackup } from "./parseBackup";

// ------------------------------------------------------------
// FIXTURES
// ------------------------------------------------------------

function makeValidProject(): Project {
  return {
    id: "project-1-id",
    name: "Project 1",
    createdAt: 1783501200000,
    updatedAt: 1784736000000,
    description: "Project 1 description.",
  };
}

function makeValidItem(): Item {
  return {
    id: "item-1-id",
    projectId: "project-1-id",
    type: "note",
    title: "Item 1",
    content: "Item 1 content",
    createdAt: 1784738700000,
    updatedAt: 1784746000000,
    meta: {
      createdFrom: "manual",
    },
  };
}

function makeValidBackup(
  overrides: Partial<BackupDocument> = {},
): BackupDocument {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: "2026-07-31T00:00:00.000Z",
    projects: [makeValidProject()],
    items: [makeValidItem()],
    ...overrides,
  };
}

// Corrupt one fact past the type system: spread the valid fixture
// into an UNTYPED literal so invalid shapes never touch the typed
// helpers.
function stringifyCorrupted(corruption: Record<string, unknown>): string {
  return JSON.stringify({ ...makeValidBackup(), ...corruption });
}

// ------------------------------------------------------------
// DOCUMENT-LEVEL REJECTIONS
// ------------------------------------------------------------

describe("parseBackup", () => {
  it("throws if backup file is not valid JSON", () => {
    const jsonText = "invalid JSON text";

    expect(() => parseBackup(jsonText)).toThrow("This file isn't valid JSON.");
  });

  it("throws if the parsed value is not an object", () => {
    const jsonText = '"hello"';

    expect(() => parseBackup(jsonText)).toThrow(
      "This backup file is malformed.",
    );
  });

  // null is valid JSON and typeof null === "object" — the guard's
  // second arm exists precisely for this input.
  it("throws if the parsed value is null", () => {
    const jsonText = "null";

    expect(() => parseBackup(jsonText)).toThrow(
      "This backup file is malformed.",
    );
  });

  it("throws if schemaVersion is unsupported", () => {
    const backupText = JSON.stringify(
      makeValidBackup({ schemaVersion: 99999999 }),
    );

    expect(() => parseBackup(backupText)).toThrow(
      "Unsupported backup version.",
    );
  });

  // The projects/items array check is one condition with two arms
  // and one shared message; each arm is its own code path, so each
  // gets its own test.
  it("throws if projects is not an array", () => {
    const backupText = stringifyCorrupted({ projects: {} });

    expect(() => parseBackup(backupText)).toThrow(
      "This backup file is missing its projects or items.",
    );
  });

  it("throws if items is not an array", () => {
    const backupText = stringifyCorrupted({ items: {} });

    expect(() => parseBackup(backupText)).toThrow(
      "This backup file is missing its projects or items.",
    );
  });

  // ------------------------------------------------------------
  // PROJECT ROW REJECTIONS
  // ------------------------------------------------------------

  it("throws if a project is not an object", () => {
    const backupText = stringifyCorrupted({ projects: ["not an object"] });

    expect(() => parseBackup(backupText)).toThrow(
      "Each project must be an object.",
    );
  });

  it("throws if a project id is not a string", () => {
    const backupText = stringifyCorrupted({
      projects: [{ ...makeValidProject(), id: 42 }],
    });

    expect(() => parseBackup(backupText)).toThrow(
      "Each project needs a string id.",
    );
  });

  it("throws if a project name is not a string", () => {
    const backupText = stringifyCorrupted({
      projects: [{ ...makeValidProject(), name: null }],
    });

    expect(() => parseBackup(backupText)).toThrow(
      "Each project needs a string name.",
    );
  });

  // ------------------------------------------------------------
  // ITEM ROW REJECTIONS
  // ------------------------------------------------------------

  it("throws if an item is not an object", () => {
    const backupText = stringifyCorrupted({ items: [null] });

    expect(() => parseBackup(backupText)).toThrow(
      "Each item must be an object.",
    );
  });

  it("throws if an item id is not a string", () => {
    const backupText = stringifyCorrupted({
      items: [{ ...makeValidItem(), id: 42 }],
    });

    expect(() => parseBackup(backupText)).toThrow(
      "Each item needs a string id.",
    );
  });

  it("throws if an item projectId is not a string", () => {
    const backupText = stringifyCorrupted({
      items: [{ ...makeValidItem(), projectId: 42 }],
    });

    expect(() => parseBackup(backupText)).toThrow(
      "Each item needs a string projectId.",
    );
  });

  // The message embeds the offending value — assert the DYNAMIC
  // part too, so the interpolation itself is under contract.
  it("throws if an item type is unknown", () => {
    const backupText = stringifyCorrupted({
      items: [{ ...makeValidItem(), type: "banana" }],
    });

    expect(() => parseBackup(backupText)).toThrow("Unknown item type: banana");
  });

  // ------------------------------------------------------------
  // HAPPY PATH
  // ------------------------------------------------------------

  // Not merely "doesn't throw": the contract is that the parsed
  // document comes back intact. toEqual (deep equality), not toBe —
  // JSON round-tripping necessarily produces a different object
  // identity.
  it("returns the parsed document for a valid backup file", () => {
    const backup = makeValidBackup();

    const result = parseBackup(JSON.stringify(backup));

    expect(result).toEqual(backup);
  });
});
