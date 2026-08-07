// src/ui/features/backup/autoBackupPolicy.ts
// ------------------------------------------------------------
// AUTO-BACKUP TRIGGER POLICY
// ------------------------------------------------------------
//
// Responsibility:
//
// - decide WHEN a snapshot should be taken; never take one
// - own the trigger rules (count cap, debounce, pagehide,
//   pre-import) and the counters they read
//
// This module is pure of side effects: no DOM, no chrome.* APIs,
// no timers, and no Date.now(). Every time-dependent function
// receives `now` from the caller, so tests are plain arithmetic
// (no fake timers needed). The controller owns all scheduling
// (setTimeout) and all I/O; this module owns only the rules.
//
// What counts as a "mutation":
//
// - a successfully RESOLVED call to a mutating storage-facade
//   method (create/update/delete/move/replaceAllData)
// - reads and failed calls never count
// - getOrCreateProjectByName is deliberately excluded: every
//   caller of it also creates an item, which carries the count
//
// Caller contracts:
//
// - call snapshotTaken() after EVERY successfully persisted
//   snapshot, whatever its reason. It is the only reset door.
//   Decision functions never reset state, so a failed write
//   leaves the policy dirty and a later trigger retries -- the
//   failure mode is "snapshot twice", never "lose data".
// - decisions repeat until confirmed: past the count cap, every
//   further mutation also answers snapshot: true. The caller
//   must therefore be single-flight (one snapshot build/write at
//   a time; decisions arriving mid-flight are dropped).
// - all `now` values must come from one clock (Date.now() at the
//   call site) so comparisons stay meaningful.

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

/**
 * The policy's answer to "should a snapshot be taken right now?".
 *
 * `reason` records which trigger fired. The snapshot writer stores
 * it in the snapshot's metadata, so every snapshot can explain its
 * own existence.
 */
export type PolicyDecision =
  | { snapshot: false }
  | {
      snapshot: true;
      reason: "count-cap" | "debounce" | "pagehide" | "pre-import";
    };

/**
 * Tuning knobs, injected at creation so tests never depend on
 * product constants.
 */
export type AutoBackupPolicyConfig = {
  /** Quiet time after the last mutation before a debounce snapshot fires. */
  debounceMs: number;
  /** Mutation count that trips an immediate snapshot (fires ON the Nth). */
  maxMutations: number;
};

export type AutoBackupPolicy = {
  /**
   * Record one successful facade mutation and answer whether the
   * count cap fired. The caller should also (re)arm its debounce
   * timer when this returns snapshot: false.
   */
  noteMutation(now: number): PolicyDecision;

  /**
   * Ask whether a debounce snapshot is due. Called when the
   * caller's debounce timer fires, but never trusts that timer:
   * it re-verifies that `debounceMs` has truly elapsed since the
   * last mutation, so stale or early timers are harmless no-ops.
   */
  onDebounceElapsed(now: number): PolicyDecision;

  /**
   * Last-chance flush when the page is being hidden/closed.
   * Fires only if there are unsnapshotted mutations.
   */
  onPageHide(): PolicyDecision;

  /**
   * Emergency snapshot immediately BEFORE a destructive import
   * (replaceAllData). Always fires -- even on a clean workspace --
   * because import destroys the current data regardless of
   * dirtiness. Bypasses both the count cap and the debounce.
   */
  beforeImport(): PolicyDecision;

  /**
   * Confirm that a snapshot was successfully PERSISTED. The only
   * door that resets the counters; both triggers start over from
   * a clean slate.
   */
  snapshotTaken(): void;
};

// ------------------------------------------------------------
// FACTORY
// ------------------------------------------------------------

export function createAutoBackupPolicy(
  config: AutoBackupPolicyConfig,
): AutoBackupPolicy {
  // Private state. Dirtiness is derived, not stored:
  // `lastMutationAt !== null` IS "there are unsnapshotted
  // mutations". Keeping a separate boolean would encode the same
  // fact twice and let the two drift apart through bugs.
  let mutationCount = 0;
  let lastMutationAt: number | null = null;

  function noteMutation(now: number): PolicyDecision {
    mutationCount++;
    lastMutationAt = now;

    // >= (not ===) is defensive: if a bug elsewhere ever double-
    // counted past the cap, === would skip the trigger forever.
    if (mutationCount >= config.maxMutations) {
      return { snapshot: true, reason: "count-cap" };
    }
    return { snapshot: false };
  }

  function onDebounceElapsed(now: number): PolicyDecision {
    // Clean policy: nothing to snapshot. This check is also what
    // narrows lastMutationAt to number below.
    if (lastMutationAt === null) return { snapshot: false };

    // Never trust the caller's timer: verify the quiet period
    // actually elapsed since the LAST mutation. A timer armed by
    // an older mutation that fires early is answered with a no.
    if (now - lastMutationAt >= config.debounceMs) {
      return { snapshot: true, reason: "debounce" };
    }
    return { snapshot: false };
  }

  function onPageHide(): PolicyDecision {
    if (lastMutationAt !== null) {
      return { snapshot: true, reason: "pagehide" };
    }
    return { snapshot: false };
  }

  function beforeImport(): PolicyDecision {
    return { snapshot: true, reason: "pre-import" };
  }

  function snapshotTaken(): void {
    mutationCount = 0;
    lastMutationAt = null;
  }

  return {
    noteMutation,
    onDebounceElapsed,
    onPageHide,
    beforeImport,
    snapshotTaken,
  };
}
