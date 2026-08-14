// src/storage/idb/migrations.test.ts
// ------------------------------------------------------------
// IDB MIGRATIONS -- SCHEMA LIFECYCLE TESTS
// ------------------------------------------------------------
//
// Under test: openDb()'s upgrade path. Three lifecycles:
//   1. fresh install  -- v0 -> v2 in one pass
//   2. upgrade        -- a hand-built v1 database gains by_type,
//                        keeps its data, and the new index sees
//                        pre-existing rows (auto-population)
//   3. reopen         -- opening at the current version changes
//                        nothing (idempotence)
//
// These tests deliberately bypass the facade: the module under
// test IS the schema machinery, so they speak raw IndexedDB and
// wrap its event-style API into promises with small helpers.
//
// The v1 database in test 2 is built from LITERAL strings, not
// schema constants -- it replicates history. v1 is frozen in
// time; only the CURRENT schema is allowed to come from schema.ts.
//
// Environment mirrors index.test.ts: fake-indexeddb, a brand-new
// IDBFactory per test. REAL timers throughout -- fake-indexeddb
// hangs silently under a frozen clock.
//
// Trap worth remembering: always db.close() before reopening at
// a higher version. An open connection blocks the upgrade, and
// fake-indexeddb expresses that as a silent hang, not an error.
// ------------------------------------------------------------

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

import { openDb } from "./openDb";
import {
  DB_NAME,
  DB_VERSION,
  IDX_ITEMS_BY_PROJECT,
  IDX_ITEMS_BY_TYPE,
  STORE_ITEMS,
  STORE_PROJECTS,
} from "./schema";

// Opens the database at an explicit version, running `onUpgrade`
// inside the upgrade transaction -- how test 2 forges a v1 world.
function openRaw(
  version: number,
  onUpgrade: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version);
    request.onupgradeneeded = () => onUpgrade(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// IDBRequest fires events instead of returning promises; this
// adapter lets tests await a single request.
function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Writes only count once their TRANSACTION completes -- awaiting
// the individual put requests is not enough.
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function putRecords(
  db: IDBDatabase,
  storeName: string,
  records: Array<Record<string, unknown>>,
): Promise<void> {
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  for (const record of records) {
    store.put(record);
  }
  await transactionDone(tx);
}

describe("migrations", () => {
  beforeEach(() => {
    // A brand-new factory per test: no databases survive between
    // tests, and no cross-test upgrade blocking is possible.
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a fresh database reaches the current version in one pass", async () => {
    const db = await openDb();

    expect(db.version).toBe(DB_VERSION);
    // objectStoreNames/indexNames are DOMStringLists: .contains(),
    // not the Array .includes().
    expect(db.objectStoreNames.contains(STORE_PROJECTS)).toBe(true);
    expect(db.objectStoreNames.contains(STORE_ITEMS)).toBe(true);

    const indexNames = db
      .transaction(STORE_ITEMS, "readonly")
      .objectStore(STORE_ITEMS).indexNames;
    expect(indexNames.contains(IDX_ITEMS_BY_PROJECT)).toBe(true);
    expect(indexNames.contains(IDX_ITEMS_BY_TYPE)).toBe(true);

    db.close();
  });

  it("upgrades a v1 database: data preserved, new index auto-populated", async () => {
    // Forge history: the v0.5 schema, from literal strings.
    const v1Db = await openRaw(1, (db) => {
      db.createObjectStore("projects", { keyPath: "id" });
      const items = db.createObjectStore("items", { keyPath: "id" });
      items.createIndex("by_projectId", "projectId", { unique: false });
    });

    await putRecords(v1Db, "projects", [
      { id: "p1", name: "Inbox", createdAt: 1 },
    ]);
    await putRecords(v1Db, "items", [
      {
        id: "i1",
        projectId: "p1",
        type: "note",
        title: "a note",
        content: "note body",
        createdAt: 1,
        meta: { createdFrom: "manual" },
      },
      {
        id: "i2",
        projectId: "p1",
        type: "task",
        title: "a task",
        content: "task body",
        createdAt: 2,
        meta: { createdFrom: "manual" },
      },
    ]);

    // Close, or the pending upgrade blocks forever (see banner).
    v1Db.close();

    const db = await openDb();

    expect(db.version).toBe(DB_VERSION);

    const tx = db.transaction(STORE_ITEMS, "readonly");
    const items = tx.objectStore(STORE_ITEMS);
    expect(items.indexNames.contains(IDX_ITEMS_BY_TYPE)).toBe(true);

    // Both v1 rows survived the upgrade...
    const all = await requestToPromise(items.getAll());
    expect(all).toHaveLength(2);

    // ...and the NEW index can already see the OLD data: IndexedDB
    // back-fills an index created over existing rows.
    const notes = await requestToPromise(
      items.index(IDX_ITEMS_BY_TYPE).getAll("note"),
    );
    expect(notes).toHaveLength(1);
    expect((notes[0] as { id: string }).id).toBe("i1");

    db.close();
  });

  it("reopening at the current version is a no-op", async () => {
    const first = await openDb();
    first.close();

    const second = await openDb();

    expect(second.version).toBe(DB_VERSION);
    const indexNames = second
      .transaction(STORE_ITEMS, "readonly")
      .objectStore(STORE_ITEMS).indexNames;
    expect(indexNames.contains(IDX_ITEMS_BY_PROJECT)).toBe(true);
    expect(indexNames.contains(IDX_ITEMS_BY_TYPE)).toBe(true);

    second.close();
  });
});
