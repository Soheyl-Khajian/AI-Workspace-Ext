// src/ui/features/backup/autoBackupController.ts
// ------------------------------------------------------------
// AUTO-BACKUP CONTROLLER (FEATURE ORCHESTRATOR)
// ------------------------------------------------------------
//
// Responsibility:
//
// - connect the inert auto-backup parts to the real world: the
//   mutation bus, the debounce timer, the pagehide event, and
//   the background writer (via the injected transport)
// - own everything autoBackupPolicy refused to own: the clock at
//   the call sites, the one debounce timer, the snapshot I/O,
//   and the single-flight guard
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO rules here: the policy decides WHEN; this file only asks
//   at the right moments and acts on the answers
// - NO chrome.* calls: the transport is injected (sendSnapshot),
//   so tests never need a chrome stub
// - NO persistence and NO format: autoBackupWriter and
//   buildBackup own those
//
// Caller contract (see floatingController wiring):
//
// - call start() once per controller instance and hook stop()
//   into the destroy path: the bus subscription and the pagehide
//   listener are document-level survivors that would stack
//   across re-mounts otherwise (see mountManager.ts)
// - beforeImport() must be AWAITED before replaceAllData
// ------------------------------------------------------------

import type { AutoBackupAck } from "../../../background/messages";
import type { BackupDocument, SnapshotReason } from "../../../models/backup";
import {
  createAutoBackupPolicy,
  type AutoBackupPolicyConfig,
} from "./autoBackupPolicy";
import { buildBackup } from "./buildBackup";
import { exportAllData } from "../../../storage";
import { subscribe } from "../../../storage/mutationEvents";

// ------------------------------------------------------------
// PRODUCT CONSTANTS
// ------------------------------------------------------------

/** Quiet time after the last mutation before a snapshot fires. */
export const AUTO_BACKUP_DEBOUNCE_MS = 30_000;

/** Mutation count that trips an immediate snapshot (fires ON the Nth). */
export const AUTO_BACKUP_MAX_MUTATIONS = 20;

// ------------------------------------------------------------
// DEPENDENCIES
// ------------------------------------------------------------

type AutoBackupControllerDependencies = {
  /** Tuning knobs, shared with the policy so timer and rules can never drift. */
  config: AutoBackupPolicyConfig;
  // The one seam to the background world. The wiring site wraps
  // chrome.runtime.sendMessage here; tests inject a fake instead.
  sendSnapshot: (
    reason: SnapshotReason,
    backup: BackupDocument,
  ) => Promise<AutoBackupAck>;
};

// ------------------------------------------------------------
// PUBLIC CONTROLLER API
// ------------------------------------------------------------

export type AutoBackupController = {
  /** Connect to the mutation bus and the pagehide event. */
  start: () => void;
  /** Disconnect everything start() and the handlers ever armed. */
  stop: () => void;
  /**
   * Emergency snapshot immediately BEFORE a destructive import.
   * The only externally callable trigger, because it is the only
   * one whose caller must WAIT for the outcome: resolves true
   * when the current data is protected (snapshot committed, or an
   * in-flight one is carrying near-identical data), false when it
   * is not -- the caller must then ABORT the destructive import.
   */
  beforeImport: () => Promise<boolean>;
};

// ------------------------------------------------------------
// CONTROLLER FACTORY
// ------------------------------------------------------------

export function createAutoBackupController(
  dependencies: AutoBackupControllerDependencies,
): AutoBackupController {
  // The rules live in the policy; this file never reads or writes
  // its counters directly.
  const policy = createAutoBackupPolicy(dependencies.config);

  // The one debounce timer (null while unarmed).
  let debounceTimerId: number | null = null;

  // Single-flight guard: true while a snapshot build/send is in
  // progress. Decisions arriving mid-flight are dropped -- the
  // policy repeats its answer until snapshotTaken(), so nothing
  // is lost by dropping.
  let inFlight = false;

  // Receipt from the mutation bus (null while stopped).
  let unsubscribe: (() => void) | null = null;

  // ----------------------------------------------------------
  // TIMER HYGIENE
  //
  // Three call sites need clear-then-null (re-arm, post-snapshot,
  // stop), so the pair lives in one place. Invariant: the timer
  // is armed if and only if debounceTimerId is non-null.
  // ----------------------------------------------------------
  function clearDebounceTimer(): void {
    if (debounceTimerId !== null) {
      window.clearTimeout(debounceTimerId);
      debounceTimerId = null;
    }
  }

  // ----------------------------------------------------------
  // TRIGGER HANDLERS
  //
  // All private: they are called by events (bus, timer, browser),
  // never by outside code. Each one asks the policy, then either
  // launches a snapshot fire-and-forget or does nothing.
  // ----------------------------------------------------------

  // Bus listener. MUST stay synchronous and cheap (the bus
  // contract): it only does bookkeeping and LAUNCHES async work.
  function handleMutation(): void {
    const decision = policy.noteMutation(Date.now());
    if (decision.snapshot) {
      void requestSnapshot(decision.reason);
      return;
    }
    // Still under the cap: restart the quiet-period countdown.
    // Clear first -- one timer, never a pile.
    clearDebounceTimer();
    debounceTimerId = window.setTimeout(
      handleDebounceTimerFired,
      dependencies.config.debounceMs,
    );
  }

  function handleDebounceTimerFired(): void {
    // The timer has fired; holding its dead id invites a stale
    // clearTimeout on some future live timer.
    debounceTimerId = null;
    // The policy re-verifies the quiet period itself, so a stale
    // or early fire is answered with snapshot: false -- no timer
    // correctness logic is needed here.
    const decision = policy.onDebounceElapsed(Date.now());
    if (decision.snapshot) {
      void requestSnapshot(decision.reason);
    }
  }

  // Last-chance flush when the page is being hidden or closed.
  // Deliberately fire-and-forget: the page may be gone before the
  // ack returns, and that is fine -- the policy state dies with
  // the page; the snapshot either lands in the ring or it doesn't.
  function handlePageHide(): void {
    const decision = policy.onPageHide();
    if (decision.snapshot) {
      void requestSnapshot(decision.reason);
    }
  }

  // ----------------------------------------------------------
  // THE SNAPSHOT PROCEDURE
  //
  // snapshot the DB -> stamp it into a document -> send it to the
  // background writer -> on a committed write, reset the policy.
  // ----------------------------------------------------------
  // Resolves true when the data is protected: this snapshot
  // committed, or a request was dropped in favor of an in-flight
  // snapshot carrying near-identical data. Resolves false when
  // the write failed or was refused (ok: false). Fire-and-forget
  // callers void the result; beforeImport() relays it.
  async function requestSnapshot(reason: SnapshotReason): Promise<boolean> {
    // Single-flight: drop, don't queue. The in-flight snapshot
    // carries near-identical data, and the policy keeps answering
    // snapshot: true until one is confirmed.
    if (inFlight) return true;
    inFlight = true;
    try {
      const snapshot = await exportAllData();
      const backup = buildBackup(snapshot, new Date().toISOString());
      const ack = await dependencies.sendSnapshot(reason, backup);
      // ok: true means the write COMMITTED (see messages.ts).
      // Only then may the counters reset; on ok: false the policy
      // stays dirty and a later trigger retries.
      if (ack.ok) {
        policy.snapshotTaken();
        // A pending timer was armed by a now-snapshotted mutation;
        // keep "armed only while dirty" true.
        clearDebounceTimer();
        return true;
      }
      // ok: false -- the write was refused; stay dirty, retry later.
      return false;
    } catch (error) {
      // A rejected send (service worker unreachable) is treated
      // exactly like ok: false: stay dirty, retry later. Never
      // rethrow -- callers launch this fire-and-forget.
      console.warn(
        "[AIW] auto-backup snapshot failed (will retry on a later trigger):",
        error,
      );
      return false;
    } finally {
      // Always release the guard, even after a failure: a stuck
      // inFlight would silently disable auto-backup until reload.
      inFlight = false;
    }
  }

  // ----------------------------------------------------------
  // LIFECYCLE + PRE-IMPORT DOOR
  // ----------------------------------------------------------

  function start(): void {
    unsubscribe = subscribe(handleMutation);
    window.addEventListener("pagehide", handlePageHide);
  }

  function stop(): void {
    if (unsubscribe !== null) {
      unsubscribe();
      unsubscribe = null;
    }
    window.removeEventListener("pagehide", handlePageHide);
    clearDebounceTimer();
  }

  async function beforeImport(): Promise<boolean> {
    const decision = policy.beforeImport();
    if (!decision.snapshot) {
      // The policy never declines today, but if it ever does,
      // "no snapshot needed" means the import may proceed.
      return true;
    }
    // AWAITED, unlike every other trigger: import destroys the
    // current data, so the emergency copy must land first, and
    // the caller aborts the import when this reports false.
    return requestSnapshot(decision.reason);
  }

  return { start, stop, beforeImport };
}
