// src/content/injectFloatingUi.ts
//
// Content script bootstrap layer (VERY thin orchestration layer)
// ------------------------------------------------------------
// Responsibilities:
// 1. Inject floating assets (HTML + CSS) into host page (idempotent)
// 2. Start floating controller (UI logic lives there)
// 3. Optionally seed development data
//
// IMPORTANT ARCHITECTURAL RULE:
// This file MUST NOT contain UI state, rendering logic, or DOM queries
// beyond verifying existence of the injected root.

import { createProject } from "../storage/index";
import { initFloatingController } from "../ui/floating/floatingController";

/* ------------------------------------------------------------
   Asset Injection (CSS + HTML)
------------------------------------------------------------ */

async function injectFloatingAssets(): Promise<void> {
  // Inject stylesheet only once (idempotent)
  const styleExists = document.getElementById("aiw-floating-style");

  if (!styleExists) {
    const link = document.createElement("link");
    link.id = "aiw-floating-style";
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("dist/ui/floating/floatingShell.css");

    (document.head ?? document.documentElement).append(link);
  }

  // Inject HTML structure only once
  const rootExists = document.getElementById("aiw-floating-root");

  if (!rootExists) {
    const response = await fetch(
      chrome.runtime.getURL("dist/ui/floating/floatingShell.html"),
    );

    if (!response.ok) {
      throw new Error(`Failed to load floating HTML (${response.status})`);
    }

    const html = await response.text();

    (document.body ?? document.documentElement).insertAdjacentHTML(
      "beforeend",
      html,
    );
  }

  // Hard invariant: ensure injection succeeded
  const root = document.getElementById("aiw-floating-root");

  if (!root) {
    throw new Error("floating UI root not found after injection");
  }
}

/* ------------------------------------------------------------
   Development helper (optional seed data)
------------------------------------------------------------ */

async function seedDevDataOnce(): Promise<void> {
  const flag = await chrome.storage.local.get("aiw_devSeeded");

  if (flag.aiw_devSeeded === true) return;

  await chrome.storage.local.set({ aiw_devSeeded: true });

  try {
    await createProject("Test Project");
  } catch (err) {
    // rollback flag if seeding fails
    await chrome.storage.local.set({ aiw_devSeeded: false });
    throw err;
  }
}

/* ------------------------------------------------------------
   Bootstrap entrypoint
------------------------------------------------------------ */

async function bootstrap(): Promise<void> {
  // Step 1: inject UI assets into host page
  await injectFloatingAssets();

  // Step 2: acquire root element for controller
  const root = document.getElementById("aiw-floating-root");

  if (!root) {
    throw new Error("floating UI root missing after injection");
  }

  // Step 3: hand over control to UI controller
  await initFloatingController(root);

  // Step 4: optional dev initialization
  await seedDevDataOnce();
}

/* ------------------------------------------------------------
   Safe startup (fail-safe entrypoint)
------------------------------------------------------------ */

bootstrap().catch((err) => {
  console.error("[AIW] floating UI bootstrap failed:", err);
});
