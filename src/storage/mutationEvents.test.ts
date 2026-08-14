// src/storage/mutationEvents.test.ts
// ------------------------------------------------------------
// MUTATION EVENTS -- CONTRACT TESTS
// ------------------------------------------------------------
//
// Two contracts under test:
//
// 1. The bus itself (mutationEvents.ts): subscribe/notify
//    round-trip, unsubscribe, Set-deduped double-subscribe, and
//    failure isolation -- a throwing listener neither propagates
//    into the notifier nor starves the listeners after it.
//
// 2. The facade's announcement discipline (index.ts): every
//    successful mutating door notifies exactly once, as its last
//    act; reads, rejected calls, same-target moves, and
//    getOrCreateProjectByName never notify.
//
// Environment mirrors index.test.ts: fake-indexeddb provides the
// IndexedDB global and every test gets a brand-new IDBFactory.
// No fake clocks -- nothing here asserts on time.
// ------------------------------------------------------------

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

import {
  notifyMutation,
  resetMutationEvents,
  subscribe,
} from "./mutationEvents";
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

describe("mutationEvents", () => {
  beforeEach(() => {
    // Listeners live in module state; start every test clean.
    resetMutationEvents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("bus contract", () => {
    it("notifyMutation calls every subscribed listener", () => {
      let aCalls = 0;
      let bCalls = 0;
      subscribe(() => {
        aCalls += 1;
      });
      subscribe(() => {
        bCalls += 1;
      });

      notifyMutation();

      expect(aCalls).toBe(1);
      expect(bCalls).toBe(1);
    });

    it("subscribe returns an unsubscribe function that stops future notifications", () => {
      let calls = 0;
      const unsubscribe = subscribe(() => {
        calls += 1;
      });

      notifyMutation();
      unsubscribe();
      notifyMutation();

      expect(calls).toBe(1);
    });

    it("subscribing the same listener twice notifies it once", () => {
      let calls = 0;
      const listener = () => {
        calls += 1;
      };
      subscribe(listener);
      subscribe(listener);

      notifyMutation();

      expect(calls).toBe(1);
    });

    it("a throwing listener is reported, not propagated, and later listeners still run", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let survivorCalls = 0;
      subscribe(() => {
        throw new Error("buggy subscriber");
      });
      subscribe(() => {
        survivorCalls += 1;
      });

      expect(() => notifyMutation()).not.toThrow();

      expect(survivorCalls).toBe(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("facade announcement discipline", () => {
    let notified = 0;

    beforeEach(() => {
      notified = 0;
      subscribe(() => {
        notified += 1;
      });
      // Fresh database per test; openDb migrates it on first touch.
      indexedDB = new IDBFactory();
    });

    it("every mutating door notifies exactly once", async () => {
      const source = await createProject("Source");
      expect(notified).toBe(1);

      const target = await createProject("Target");
      expect(notified).toBe(2);

      const item = await createItem(source.id, "note", "Title", "Content", {
        createdFrom: "manual",
      });
      expect(notified).toBe(3);

      await renameProject(source.id, "Source v2");
      expect(notified).toBe(4);

      await updateItem(item.id, { title: "Title v2" });
      expect(notified).toBe(5);

      await moveItemToProject(item.id, target.id);
      expect(notified).toBe(6);

      await deleteItem(item.id);
      expect(notified).toBe(7);

      await replaceAllData([], []);
      expect(notified).toBe(8);
    });

    it("deleteProjectCascade with children is one mutation, not one per row", async () => {
      const project = await createProject("Doomed");
      await createItem(project.id, "note", "A", "a", { createdFrom: "manual" });
      await createItem(project.id, "note", "B", "b", { createdFrom: "manual" });
      expect(notified).toBe(3);

      await deleteProjectCascade(project.id);

      expect(notified).toBe(4);
    });

    it("rejected calls never notify", async () => {
      await expect(createProject("   ")).rejects.toThrow(
        "Project name cannot be empty",
      );
      await expect(updateItem("missing-id", { title: "x" })).rejects.toThrow(
        "Item not found: missing-id",
      );

      expect(notified).toBe(0);
    });

    it("reads never notify", async () => {
      const project = await createProject("Readable");
      await createItem(project.id, "note", "T", "c", { createdFrom: "manual" });
      expect(notified).toBe(2);

      await listProjects();
      await listAllItems();
      await listItemsByProject(project.id);
      await exportAllData();

      expect(notified).toBe(2);
    });

    it("a same-target move is a no-op, not a mutation", async () => {
      const project = await createProject("Home");
      const item = await createItem(project.id, "note", "T", "c", {
        createdFrom: "manual",
      });
      expect(notified).toBe(2);

      await moveItemToProject(item.id, project.id);

      expect(notified).toBe(2);
    });

    it("getOrCreateProjectByName never notifies, creating or finding", async () => {
      await getOrCreateProjectByName("Inbox");
      await getOrCreateProjectByName("Inbox");

      expect(notified).toBe(0);
    });
  });
});
