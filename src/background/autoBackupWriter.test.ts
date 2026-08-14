// src/background/autoBackupWriter.test.ts
// ------------------------------------------------------------
// AUTO-BACKUP WRITER -- RING BUFFER CONTRACT TESTS
// ------------------------------------------------------------
//
// Under test: newest-first ordering, retention eviction, savedAt
// stamped at persistence time (not enqueue time), serialization
// of concurrent writes, and failure behavior -- a rejected write
// reaches its caller and never poisons the queue.
//
// Environment: a hand-rolled chrome.storage.local fake over a
// plain object, with three behavior hooks -- failNextSet (one
// rejection), delaySet (a gate that freezes set()), and
// notifySetBlocked (a beacon fired on arriving at the gate; the
// gate/beacon pair forms the rendezvous used to move the clock
// while a write is provably frozen mid-flight).
//
// Fake timers are surgical (Date only): nothing here schedules
// timeouts, and the writer's internal awaits must run for real.
//
// The writer's module-level queue survives across tests. That is
// safe by design: every write settles, and the queue absorbs
// rejections -- the final test is the standing proof.
// ------------------------------------------------------------

import type { BackupDocument, AutoBackupSnapshot } from "../models/backup";
import type {} from "../models/backup";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  AUTO_BACKUP_STORAGE_KEY,
  AUTO_BACKUP_RETENTION,
  enqueueAutoBackupWrite,
} from "./autoBackupWriter";
import { BACKUP_SCHEMA_VERSION } from "../ui/features/backup/buildBackup";

const store: Record<string, unknown> = {};
let failNextSet = false;
let notifySetBlocked: (() => void) | undefined;
let delaySet: Promise<void> | undefined;

const fakeChrome = {
  storage: {
    local: {
      get: async (key: string) => ({
        [key]: store[key],
      }),

      set: async (values: Record<string, unknown>) => {
        if (failNextSet) {
          failNextSet = false;
          throw new Error("fake chrome storage set failed");
        }

        if (delaySet) {
          notifySetBlocked?.(); // beacon: someone is now frozen inside set()
          await delaySet; // gate
          delaySet = undefined;
        }

        Object.assign(store, values);
      },
    },
  },
};

function createDeferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;

  const promise = new Promise<void>((r) => {
    resolve = r;
  });

  return { promise, resolve };
}

function makeBackup(marker: string): BackupDocument {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: "2026-01-01T00:00:00.000Z",
    projects: [
      {
        id: "project-1-id",
        name: "project-1",
        createdAt: 0,
      },
    ],
    items: [
      {
        id: marker,
        projectId: "project-1-id",
        title: "item-title",
        content: "item-content",
        createdAt: 0,
        type: "note",
        meta: { createdFrom: "manual" },
      },
    ],
  };
}

describe("autoBackupWriter", () => {
  beforeEach(() => {
    Object.keys(store).forEach((key) => delete store[key]);
    failNextSet = false;
    notifySetBlocked = undefined;
    delaySet = undefined;

    // Surgical fake: Date only
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.stubGlobal("chrome", fakeChrome);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("writes the first snapshot into an empty ring", async () => {
    const beforeWrite = store[AUTO_BACKUP_STORAGE_KEY];
    const backup = makeBackup("a");

    await enqueueAutoBackupWrite("debounce", backup);
    const afterWrite = await chrome.storage.local.get(AUTO_BACKUP_STORAGE_KEY);

    expect(beforeWrite).toBeUndefined();
    expect(afterWrite[AUTO_BACKUP_STORAGE_KEY]).toEqual([
      {
        backup,
        reason: "debounce",
        savedAt: expect.any(Number),
      },
    ]);
  });

  it("newest snapshot is index 0", async () => {
    const a = makeBackup("a");
    const b = makeBackup("b");

    await enqueueAutoBackupWrite("debounce", a);
    await enqueueAutoBackupWrite("debounce", b);

    const stored = store[AUTO_BACKUP_STORAGE_KEY] as AutoBackupSnapshot[];
    expect(stored.map(({ backup }) => backup.items[0].id)).toEqual(["b", "a"]);
  });

  it("evicts the oldest beyond retention", async () => {
    const backups = [
      makeBackup("a"),
      makeBackup("b"),
      makeBackup("c"),
      makeBackup("d"),
      makeBackup("e"),
      makeBackup("f"),
    ];

    await Promise.all(
      backups.map((backup) => enqueueAutoBackupWrite("debounce", backup)),
    );

    const stored = store[AUTO_BACKUP_STORAGE_KEY] as AutoBackupSnapshot[];
    expect(store[AUTO_BACKUP_STORAGE_KEY]).toHaveLength(AUTO_BACKUP_RETENTION);
    expect(stored.map(({ backup }) => backup.items[0].id)).toEqual([
      "f",
      "e",
      "d",
      "c",
      "b",
    ]);
  });

  it("stamps savedAt at persistence time", async () => {
    const a = makeBackup("a");
    const b = makeBackup("b");

    const t1 = new Date("2026-01-01T12:00:00.000Z").getTime();
    const t2 = new Date("2026-01-01T14:00:00.000Z").getTime();

    vi.setSystemTime(t1);
    await enqueueAutoBackupWrite("debounce", a);
    vi.setSystemTime(t2);
    await enqueueAutoBackupWrite("debounce", b);

    const stored = store[AUTO_BACKUP_STORAGE_KEY] as AutoBackupSnapshot[];
    expect(stored.map(({ savedAt }) => savedAt)).toEqual([t2, t1]);
  });

  it("stamps the queued write when it runs, not when it was enqueued", async () => {
    const a = makeBackup("a");
    const b = makeBackup("b");

    const gate = createDeferred();
    const blocked = createDeferred();
    delaySet = gate.promise;
    notifySetBlocked = blocked.resolve;

    const t1 = new Date("2026-01-01T12:00:00.000Z").getTime();
    const t2 = new Date("2026-01-01T14:00:00.000Z").getTime();

    vi.setSystemTime(t1);
    const firstWrite = enqueueAutoBackupWrite("debounce", a);
    const secondWrite = enqueueAutoBackupWrite("debounce", b);

    // Rendezvous: wait until write A has stamped t1 and is frozen
    // inside set(); only then is it safe to move the clock.
    await blocked.promise;
    vi.setSystemTime(t2);
    gate.resolve();

    await firstWrite;
    await secondWrite;

    const stored = store[AUTO_BACKUP_STORAGE_KEY] as AutoBackupSnapshot[];
    expect(stored[0]).toEqual({
      savedAt: t2,
      reason: "debounce",
      backup: b,
    });
    expect(stored[1]).toEqual({
      savedAt: t1,
      reason: "debounce",
      backup: a,
    });
  });

  it("delivers a failed write to the caller", async () => {
    failNextSet = true;
    const backup = makeBackup("a");

    await expect(enqueueAutoBackupWrite("debounce", backup)).rejects.toThrow();
  });

  it("a failed write does not poison the queue", async () => {
    failNextSet = true;
    const backup = makeBackup("a");

    const failedWrite = enqueueAutoBackupWrite("debounce", backup);
    const successfulWrite = enqueueAutoBackupWrite("debounce", backup);

    await expect(failedWrite).rejects.toThrow();
    await expect(successfulWrite).resolves.toBeDefined();

    const autoBackupSnapshot = await chrome.storage.local.get(
      AUTO_BACKUP_STORAGE_KEY,
    );

    expect(autoBackupSnapshot[AUTO_BACKUP_STORAGE_KEY]).toEqual([
      {
        backup,
        reason: "debounce",
        savedAt: expect.any(Number),
      },
    ]);
  });
});
