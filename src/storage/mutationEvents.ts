// src/storage/mutationEvents.ts
// ------------------------------------------------------------
// MUTATION EVENTS
// ------------------------------------------------------------
//
// Responsibility:
// - the storage layer's announcement bus: the facade calls
//   notifyMutation() as the LAST act of every successful
//   mutation, and interested parties (the auto-backup
//   controller) subscribe to hear about it
// - pure dispatch: NO payloads, NO logic, NO storage imports
//
// Contract for subscribers:
// - listeners receive no arguments; the only fact announced is
//   "a mutation just committed" -- deliberately nothing more,
//   so storage can never leak knowledge it never sends
// - listeners must be cheap and synchronous; kick off async
//   work fire-and-forget and own your errors
//
// Lifecycle:
// - subscribe() returns an unsubscribe function; long-lived UI
//   code MUST call it on unmount, or SPA remounts will stack
//   ghost listeners and double-count mutations
// ------------------------------------------------------------

export type MutationListener = () => void;

// A Set (not an array) makes double-subscribe a no-op and gives
// O(1) removal without index bookkeeping.
const listeners = new Set<MutationListener>();

/**
 * Register a listener for future mutation announcements.
 *
 * Returns the matching unsubscribe function -- the same
 * register/cleanup pairing as addEventListener/removeEventListener
 * in eventBindings.ts.
 */
export function subscribe(listener: MutationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Announce one committed mutation to every listener.
 *
 * Each listener runs inside its own try/catch: by the time this
 * is called the write has already committed, so a subscriber bug
 * must never reject the storage call that triggered it, and must
 * never starve the listeners after it.
 */
export function notifyMutation(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error("[mutationEvents] listener failed:", error);
    }
  }
}

/** Test-only: drop all listeners so suites start clean. */
export function resetMutationEvents(): void {
  listeners.clear();
}
