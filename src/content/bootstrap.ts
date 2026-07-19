// src/content/bootstrap.ts
//
// Content-script bootstrap / startup orchestration (thin entrypoint)
// ------------------------------------------------------------
// Responsibilities:
//   1. Inject floating UI assets into the host page (delegated to
//      injectFloatingUi.ts)
//   2. Hand control to the floating UI controller
//   3. Register the cross-context message listener
//   4. Optionally seed development data
//
// IMPORTANT ARCHITECTURAL RULE:
//   This file MUST NOT contain UI state, rendering logic, or asset-injection
//   DOM work. Injection lives in injectFloatingUi.ts; UI logic lives in ui/.
//   This is the SINGLE content-script entrypoint (see manifest + build.mjs).

import { createProject, createItem } from "../storage/index";
import { initFloatingController } from "../ui/core/floatingController";
import type { AiwMessage } from "../background/messages";
import { handleCaptureSelection } from "../capture/captureHandler";
import { injectFloatingAssets } from "./injectFloatingUi";

// Dev-only: auto-seed sample data on first run. OFF by default.
// ------------------------------------------------------------
// This is a development convenience, NOT a product feature. It stays off
// during normal use because the seed flag (chrome.storage.local, wiped on
// uninstall) and the seeded data (page-origin IndexedDB, NOT wiped on
// uninstall) have different lifetimes — so re-enabling against an existing
// DB creates duplicate seed projects. Only flip this to true against an
// empty aiw_db when you deliberately want sample data.
const ENABLE_DEV_SEED = false;

/* ------------------------------------------------------------
   Message Listener
------------------------------------------------------------ */
function initMessageListener(): void {
  chrome.runtime.onMessage.addListener((rawMessage) => {
    const message = rawMessage as AiwMessage;
    switch (message.type) {
      case "CAPTURE_SELECTION":
        handleCaptureSelection(message.selectionText, message.sourceUrl);
        break;
    }
  });
}

/* ------------------------------------------------------------
   Development helper (optional seed data)
------------------------------------------------------------ */
async function seedDevDataOnce(): Promise<void> {
  const flag = await chrome.storage.local.get("aiw_dev_seeded");
  if (flag.aiw_dev_seeded === true) return;

  try {
    await createProject("Empty Project");

    const singleItemProject = await createProject("Single Item Project");
    await createItem(
      singleItemProject.id,
      "note",
      "First Note",
      "This project contains exactly one item.",
      {
        createdFrom: "manual",
      },
    );

    const multiItemProject = await createProject("Multi Item Project");
    await createItem(
      multiItemProject.id,
      "note",
      "Research Notes",
      "Collected findings from testing.",
      {
        createdFrom: "manual",
      },
    );
    await createItem(
      multiItemProject.id,
      "task",
      "Implement Selection",
      "Add selectedItemId runtime state.",
      {
        createdFrom: "manual",
      },
    );
    await createItem(
      multiItemProject.id,
      "link",
      "Architecture Reference",
      "https://example.com",
      {
        sourceUrl: "https://example.com",
        createdFrom: "selection",
      },
    );

    await chrome.storage.local.set({ aiw_dev_seeded: true });
  } catch (error) {
    // Seed failure must never crash bootstrap.
    // The extension is fully functional without seed data.
    console.warn("[AIW] Dev seed failed (non-fatal):", error);
  }
}

/* ------------------------------------------------------------
   Bootstrap entrypoint
------------------------------------------------------------ */
async function bootstrap(): Promise<void> {
  // Step 1: inject UI assets into host page
  const root = await injectFloatingAssets();

  // Step 2: hand over control to UI controller
  initFloatingController(root);

  // Step 3: register cross-context message listener
  initMessageListener();

  // Step 4: optional dev initialization (disabled by default — see flag)
  if (ENABLE_DEV_SEED) {
    await seedDevDataOnce();
  }
}

/* ------------------------------------------------------------
   Run-once guard + safe startup (fail-safe entrypoint)
------------------------------------------------------------ */
const AIW_GLOBAL = globalThis as typeof globalThis & {
  __aiwContentBooted?: boolean;
};

if (AIW_GLOBAL.__aiwContentBooted) {
  console.debug(
    "[AIW] content script already booted in this document — skipping duplicate bootstrap.",
  );
} else {
  AIW_GLOBAL.__aiwContentBooted = true;

  bootstrap().catch((err) => {
    console.error("[AIW] floating UI bootstrap failed:", err);
  });
}
