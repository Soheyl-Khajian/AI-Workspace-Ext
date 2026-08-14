// src/ui/features/backup/autoBackupPolicy.test.ts
// ------------------------------------------------------------
// AUTO-BACKUP TRIGGER POLICY -- CONTRACT TESTS
// ------------------------------------------------------------
//
// Pins the trigger contracts of createAutoBackupPolicy:
//
// - count-cap fires ON the Nth mutation (>=) and keeps firing
//   past the cap until a snapshot is confirmed
// - debounce fires at exactly lastMutationAt + debounceMs and
//   re-verifies elapsed time, so stale timers are no-ops
// - pagehide fires only when there are unsnapshotted mutations
// - pre-import always fires, even on a clean policy
// - snapshotTaken() is the ONLY reset door; decision functions
//   never reset state
//
// The policy is pure (no timers, no Date.now()), so these tests
// pass literal timestamps and need no fake timers.

import { describe, expect, it } from "vitest";
import type {
  AutoBackupPolicy,
  AutoBackupPolicyConfig,
} from "./autoBackupPolicy";
import { createAutoBackupPolicy } from "./autoBackupPolicy";

// Readable defaults; each test overrides what it cares about.
const DEBOUNCE_MS = 30_000;
const MAX_MUTATIONS = 20;

// A fresh policy per test gives isolation by construction. A
// shared instance with a beforeEach reset would make every test
// depend on snapshotTaken() being correct, so a reset bug would
// fail unrelated tests instead of its own.
function makePolicy(
  overrides: Partial<AutoBackupPolicyConfig> = {},
): AutoBackupPolicy {
  return createAutoBackupPolicy({
    debounceMs: DEBOUNCE_MS,
    maxMutations: MAX_MUTATIONS,
    ...overrides,
  });
}

describe("autoBackupPolicy", () => {
  describe("clean policy", () => {
    it("says no to debounce and pagehide", () => {
      const policy = makePolicy();
      expect(policy.onDebounceElapsed(DEBOUNCE_MS)).toEqual({
        snapshot: false,
      });
      expect(policy.onPageHide()).toEqual({ snapshot: false });
    });

    it("says yes to pre-import: import destroys data regardless of dirtiness", () => {
      const policy = makePolicy();
      expect(policy.beforeImport()).toEqual({
        snapshot: true,
        reason: "pre-import",
      });
    });
  });

  describe("count cap", () => {
    it("fires on the Nth mutation, not the (N-1)th", () => {
      const policy = makePolicy({ maxMutations: 3 });
      expect(policy.noteMutation(1_000)).toEqual({ snapshot: false });
      expect(policy.noteMutation(2_000)).toEqual({ snapshot: false });
      expect(policy.noteMutation(3_000)).toEqual({
        snapshot: true,
        reason: "count-cap",
      });
    });

    it("keeps firing past the cap until a snapshot is confirmed", () => {
      const policy = makePolicy({ maxMutations: 3 });
      policy.noteMutation(1_000);
      policy.noteMutation(2_000);
      policy.noteMutation(3_000); // cap reached here
      // The write may still be in flight (the controller is
      // single-flight); the policy keeps requesting a snapshot.
      expect(policy.noteMutation(4_000)).toEqual({
        snapshot: true,
        reason: "count-cap",
      });
    });
  });

  describe("debounce", () => {
    it("fires at exactly lastMutationAt + debounceMs, not 1ms earlier", () => {
      const policy = makePolicy();
      policy.noteMutation(0);
      expect(policy.onDebounceElapsed(DEBOUNCE_MS - 1)).toEqual({
        snapshot: false,
      });
      expect(policy.onDebounceElapsed(DEBOUNCE_MS)).toEqual({
        snapshot: true,
        reason: "debounce",
      });
    });

    it("says no to a stale timer armed by an older mutation", () => {
      // t=0: a mutation arms a 30s timer (due at t=30_000).
      // t=20_000: a second mutation should re-arm it to t=50_000,
      // but a buggy caller never cleared the first timer and it
      // fires at t=30_000 -- only 10s of quiet has elapsed.
      const policy = makePolicy();
      policy.noteMutation(0);
      policy.noteMutation(20_000);
      expect(policy.onDebounceElapsed(30_000)).toEqual({ snapshot: false });
    });
  });

  describe("pagehide", () => {
    it("fires when there are unsnapshotted mutations", () => {
      const policy = makePolicy();
      policy.noteMutation(1_000);
      expect(policy.onPageHide()).toEqual({
        snapshot: true,
        reason: "pagehide",
      });
    });
  });

  describe("snapshotTaken", () => {
    it("resets the count cap: a full fresh run of N is needed again", () => {
      const policy = makePolicy({ maxMutations: 3 });
      policy.noteMutation(1_000);
      policy.noteMutation(2_000);
      policy.snapshotTaken();
      expect(policy.noteMutation(3_000)).toEqual({ snapshot: false });
      expect(policy.noteMutation(4_000)).toEqual({ snapshot: false });
      expect(policy.noteMutation(5_000)).toEqual({
        snapshot: true,
        reason: "count-cap",
      });
    });

    it("resets dirtiness: debounce and pagehide go quiet", () => {
      const policy = makePolicy();
      policy.noteMutation(0);
      policy.snapshotTaken();
      expect(policy.onDebounceElapsed(DEBOUNCE_MS)).toEqual({
        snapshot: false,
      });
      expect(policy.onPageHide()).toEqual({ snapshot: false });
    });
  });

  describe("decisions never reset state", () => {
    it("a debounce yes repeats until snapshotTaken is called", () => {
      const policy = makePolicy();
      policy.noteMutation(0);
      expect(policy.onDebounceElapsed(30_000)).toEqual({
        snapshot: true,
        reason: "debounce",
      });
      // No snapshotTaken() in between: still yes.
      expect(policy.onDebounceElapsed(40_000)).toEqual({
        snapshot: true,
        reason: "debounce",
      });
    });

    it("pre-import does not reset: pagehide still fires afterwards", () => {
      const policy = makePolicy();
      policy.noteMutation(0);
      policy.beforeImport();
      expect(policy.onPageHide()).toEqual({
        snapshot: true,
        reason: "pagehide",
      });
    });
  });
});
