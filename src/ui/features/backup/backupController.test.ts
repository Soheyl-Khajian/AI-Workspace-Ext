// src/ui/features/backup/backupController.test.ts
// ------------------------------------------------------------
// BACKUP CONTROLLER WORKFLOW TESTS
// ------------------------------------------------------------
//
// Contract under test (see backupController.ts):
//
// - restoreSnapshot: validate -> confirm -> safety backup ->
//   replace-all -> refresh, where every stage can abort cleanly
//   without touching stored data, and the replace works from the
//   in-memory snapshot copy (the ORDERING LAW)
// - listAutoBackups: thin passthrough over the injected read door
// - importBackup: the same abort discipline through the injected
//   confirm (first coverage of this workflow -- confirmDestructive
//   made it reachable from the node environment)
//
// Environment:
//
// - fake-indexeddb provides IndexedDB; a fresh IDBFactory per test
//   re-runs migrations against an empty database (storage-suite
//   doctrine). Real timers throughout: nothing here reads clocks,
//   and fake-indexeddb hangs under full fake timers.
// - pickJsonFile is module-mocked: it is a direct import, not an
//   injected dependency, so vi.mock is the only seam.
// ------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

import type { AutoBackupSnapshot } from "../../../models/backup";
import {
  createProject,
  exportAllData,
  listAllItems,
  listProjects,
} from "../../../storage";
import { buildBackup } from "./buildBackup";
import { createBackupController } from "./backupController";
import { pickJsonFile } from "../../shared/pickJsonFile";

vi.mock("../../shared/pickJsonFile", () => ({
  pickJsonFile: vi.fn(),
}));

// ------------------------------------------------------------
// FIXTURES
// ------------------------------------------------------------

/**
 * Dependencies with every door mocked to the happy path; tests
 * state only the deviation they assert about.
 */
function createDeps() {
  return {
    notify: vi.fn(),
    beforeImport: vi.fn().mockResolvedValue(true),
    onImported: vi.fn().mockResolvedValue(undefined),
    readAutoBackups: vi.fn().mockResolvedValue([]),
    confirmDestructive: vi.fn().mockReturnValue(true),
  };
}

/**
 * A valid ring snapshot whose backup carries exactly the CURRENT
 * database contents -- built through the real buildBackup so the
 * fixture can never drift from the format the validator expects.
 */
async function snapshotOfCurrentData(): Promise<AutoBackupSnapshot> {
  const data = await exportAllData();
  return {
    savedAt: Date.now(),
    reason: "debounce",
    backup: buildBackup(data, new Date().toISOString()),
  };
}

describe("backupController", () => {
  beforeEach(() => {
    indexedDB = new IDBFactory();
    vi.clearAllMocks();
  });

  describe("listAutoBackups", () => {
    it("returns the ring exactly as the read door provides it", async () => {
      const deps = createDeps();
      const ring = [await snapshotOfCurrentData()];
      deps.readAutoBackups.mockResolvedValue(ring);
      const controller = createBackupController(deps);

      await expect(controller.listAutoBackups()).resolves.toBe(ring);
    });
  });

  describe("restoreSnapshot", () => {
    it("replaces current data with the snapshot contents", async () => {
      await createProject("Old world");
      const snapshot = await snapshotOfCurrentData();
      indexedDB = new IDBFactory(); // simulate the disaster: data gone

      const deps = createDeps();
      const controller = createBackupController(deps);
      await controller.restoreSnapshot(snapshot);

      const projects = await listProjects();
      expect(projects.map((project) => project.name)).toEqual(["Old world"]);
      expect(deps.notify).toHaveBeenCalledWith("Backup restored");
      expect(deps.onImported).toHaveBeenCalledTimes(1);
    });

    it("aborts before the safety backup when the confirm is declined", async () => {
      await createProject("Untouched");
      const snapshot = await snapshotOfCurrentData();

      const deps = createDeps();
      deps.confirmDestructive.mockReturnValue(false);
      const controller = createBackupController(deps);
      await controller.restoreSnapshot(snapshot);

      expect(deps.beforeImport).not.toHaveBeenCalled();
      expect(deps.onImported).not.toHaveBeenCalled();
      expect((await listProjects()).map((p) => p.name)).toEqual(["Untouched"]);
    });

    it("aborts unprotected restores: no safety backup, no replace", async () => {
      await createProject("Untouched");
      const snapshot = await snapshotOfCurrentData();

      const deps = createDeps();
      deps.beforeImport.mockResolvedValue(false);
      const controller = createBackupController(deps);
      await controller.restoreSnapshot(snapshot);

      expect(deps.notify).toHaveBeenCalledWith(
        "Couldn't save a safety backup, so the restore was cancelled. Please try again.",
      );
      expect(deps.onImported).not.toHaveBeenCalled();
      expect((await listProjects()).map((p) => p.name)).toEqual(["Untouched"]);
    });

    it("rejects a corrupted snapshot before asking anything", async () => {
      const snapshot = await snapshotOfCurrentData();
      const corrupted = {
        ...snapshot,
        backup: { ...snapshot.backup, items: "not-an-array" },
      } as unknown as AutoBackupSnapshot;

      const deps = createDeps();
      const controller = createBackupController(deps);
      await controller.restoreSnapshot(corrupted);

      expect(deps.confirmDestructive).not.toHaveBeenCalled();
      expect(deps.beforeImport).not.toHaveBeenCalled();
      expect(deps.notify).toHaveBeenCalledTimes(1);
    });
  });

  describe("importBackup", () => {
    it("imports a picked file through the same abort discipline", async () => {
      await createProject("Old world");
      const snapshot = await snapshotOfCurrentData();
      indexedDB = new IDBFactory();

      vi.mocked(pickJsonFile).mockResolvedValue(
        JSON.stringify(snapshot.backup),
      );
      const deps = createDeps();
      const controller = createBackupController(deps);
      await controller.importBackup();

      expect((await listProjects()).map((p) => p.name)).toEqual(["Old world"]);
      expect(deps.notify).toHaveBeenCalledWith("Backup imported");
    });

    it("does nothing when the user cancels the file dialog", async () => {
      vi.mocked(pickJsonFile).mockResolvedValue(null);
      const deps = createDeps();
      const controller = createBackupController(deps);
      await controller.importBackup();

      expect(deps.confirmDestructive).not.toHaveBeenCalled();
      expect(deps.notify).not.toHaveBeenCalled();
      expect(await listAllItems()).toEqual([]);
    });
  });
});
