// src/ui/shared/showToast.ts
// ------------------------------------------------------------
// TOAST NOTIFICATION
// ------------------------------------------------------------
//
// Responsibility:
// - display a brief auto-dismissing message in the floating UI
// - replace any currently active toast immediately
//
// IMPORTANT:
// - NO state mutation outside this module
// - NO business logic
// - ONE active toast at a time
// ------------------------------------------------------------

const TOAST_DURATION_MS = 2000;

// ------------------------------------------------------------
// MODULE STATE
// ------------------------------------------------------------
//
// Tracks the currently visible toast and its scheduled removal.
// Kept at module level so any new call can clean up the previous one.
// ------------------------------------------------------------

let activeToastEl: HTMLElement | null = null;
let activeTimeoutId: ReturnType<typeof setTimeout> | null = null;

// ------------------------------------------------------------
// PUBLIC API
// ------------------------------------------------------------

export function showToast(message: string): void {
  const rootEl = document.getElementById("aiw-floating-root");
  if (!rootEl) return;

  // Remove existing toast immediately if one is still showing.
  if (activeToastEl !== null) {
    activeToastEl.remove();
    activeToastEl = null;
  }

  if (activeTimeoutId !== null) {
    clearTimeout(activeTimeoutId);
    activeTimeoutId = null;
  }

  // Build and mount new toast.
  const toastEl = document.createElement("div");
  toastEl.className = "aiw-toast";
  toastEl.textContent = message;

  rootEl.append(toastEl);
  activeToastEl = toastEl;

  // Schedule auto-dismiss.
  activeTimeoutId = setTimeout(() => {
    toastEl.remove();
    activeToastEl = null;
    activeTimeoutId = null;
  }, TOAST_DURATION_MS);
}
