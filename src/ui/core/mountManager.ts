// src/ui/core/mountManager.ts
// ------------------------------------------------------------
// FLOATING UI MOUNT MANAGER
//
// Responsibility:
//   - Own the mount lifecycle of the floating UI (orb) on the host page.
//   - Perform the initial mount: inject assets -> init controller.
//   - Keep the orb mounted across ChatGPT's SPA navigation / DOM churn: if
//     the host app detaches our root, re-mount it automatically.
//
// IMPORTANT:
//   - Re-mount MUST tear down the previous controller first. Its destroy()
//     removes document-level listeners that SURVIVE root removal; skipping
//     it would stack duplicate document listeners on every re-mount.
//   - Re-mount MUST be re-entrancy safe: injection is async, so overlapping
//     mutations could otherwise race two mounts.
//
// NOT RESPONSIBLE FOR:
//   - Asset injection details (injected as a dependency; see injectFloatingUi)
//   - UI event wiring / rendering (floatingController.ts)
// ------------------------------------------------------------

import { initFloatingController } from "./floatingController";

const FLOATING_ROOT_ID = "aiw-floating-root";

// Injects the floating assets and returns the mounted root element. Supplied
// by the caller (bootstrap) so this UI-layer module doesn't reach back into
// the content layer.
type InjectAssets = () => Promise<HTMLElement>;

// --- Module lifecycle state (one live mount per document) ---
let injectAssets: InjectAssets | null = null;

// Teardown handle for the live controller (null while unmounted).
let destroyController: (() => void) | null = null;

// Re-entrancy guard: true while an (async) mount is in flight.
let isMounting = false;

// Watches for the host app detaching our root so we can re-mount.
let rootObserver: MutationObserver | null = null;

/**
 * Mount the floating UI if it isn't already present. Idempotent and
 * re-entrancy safe: a no-op if a mount is in flight or the root already
 * exists.
 */
async function mountFloatingUi(): Promise<void> {
  if (isMounting) return;
  if (document.getElementById(FLOATING_ROOT_ID)) return;
  if (!injectAssets) return;

  isMounting = true;
  try {
    // Tear down any previous controller first so its surviving document-level
    // listeners don't stack when we re-init on the new root.
    if (destroyController) {
      destroyController();
      destroyController = null;
    }

    const root = await injectAssets();
    destroyController = initFloatingController(root);
  } catch (error) {
    console.error("[AIW] floating UI mount failed:", error);
  } finally {
    isMounting = false;
  }
}

/**
 * Start the floating UI: perform the initial mount, then watch for
 * host-driven detachment and re-mount when needed. Call once per document.
 */
export async function startFloatingUi(inject: InjectAssets): Promise<void> {
  injectAssets = inject;

  await mountFloatingUi();

  // Watch body's DIRECT children only. ChatGPT can detach our root during a
  // soft navigation without reloading the document; when our root goes
  // missing, re-mount. This is cheap: body's direct children change rarely
  // (portals/modals), and each mutation only triggers a getElementById check.
  if (!rootObserver) {
    rootObserver = new MutationObserver(() => {
      if (!document.getElementById(FLOATING_ROOT_ID)) {
        void mountFloatingUi();
      }
    });
  }

  const observeTarget = document.body ?? document.documentElement;
  rootObserver.observe(observeTarget, { childList: true });
}
