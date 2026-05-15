// src/content/injectSidebar.ts
//
// Content script bootstrap layer (VERY thin orchestration layer)
// ------------------------------------------------------------
// Responsibilities:
// 1. Inject sidebar assets (HTML + CSS) into host page (idempotent)
// 2. Start sidebar controller (UI logic lives there)
// 3. Optionally seed development data
//
// IMPORTANT ARCHITECTURAL RULE:
// This file MUST NOT contain UI state, rendering logic, or DOM queries
// beyond verifying existence of the injected root.

import { initSidebarController } from "../ui/sidebarController";
import { createProject } from "../storage/index";

/* ------------------------------------------------------------
   Asset Injection (CSS + HTML)
------------------------------------------------------------ */

async function injectSidebarAssets(): Promise<void> {
  // Inject stylesheet only once (idempotent)
  const styleExists = document.getElementById("aiw-sidebar-style");

  if (!styleExists) {
    const link = document.createElement("link");
    link.id = "aiw-sidebar-style";
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("dist/ui/sidebar.css");

    (document.head ?? document.documentElement).append(link);
  }

  // Inject HTML structure only once
  const rootExists = document.getElementById("aiw-sidebar-root");

  if (!rootExists) {
    const response = await fetch(chrome.runtime.getURL("dist/ui/sidebar.html"));

    if (!response.ok) {
      throw new Error(`Failed to load sidebar HTML (${response.status})`);
    }

    const html = await response.text();

    (document.body ?? document.documentElement).insertAdjacentHTML(
      "beforeend",
      html,
    );
  }

  // Hard invariant: ensure injection succeeded
  const root = document.getElementById("aiw-sidebar-root");

  if (!root) {
    throw new Error("Sidebar root not found after injection");
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
  await injectSidebarAssets();

  // Step 2: acquire root element for controller
  const root = document.getElementById("aiw-sidebar-root");

  if (!root) {
    throw new Error("Sidebar root missing after injection");
  }

  // Step 3: hand over control to UI controller
  await initSidebarController(root);

  // Step 4: optional dev initialization
  await seedDevDataOnce();
}

/* ------------------------------------------------------------
   Safe startup (fail-safe entrypoint)
------------------------------------------------------------ */

bootstrap().catch((err) => {
  console.error("[AIW] Sidebar bootstrap failed:", err);
});
