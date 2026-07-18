// src/content/injectFloatingUi.ts
//
// Floating UI asset injection (PURE injection flow — no orchestration)
// ------------------------------------------------------------
// Responsibility:
//   Inject the floating UI assets (stylesheet + HTML root) into the host
//   page exactly once, then return the mounted root element.
//
// IMPORTANT RULES:
//   - This module MUST NOT own startup, messaging, seeding, or UI state.
//     Orchestration lives in bootstrap.ts; UI logic lives in ui/.
//   - Injection MUST stay idempotent: never create a second stylesheet or
//     root element if one already exists in the document.
//   - The only DOM query allowed here is verifying the injected root.

export async function injectFloatingAssets(): Promise<HTMLElement> {
  // Inject stylesheet only once (idempotent)
  const existingStyle = document.getElementById("aiw-floating-style");
  if (!existingStyle) {
    const link = document.createElement("link");
    link.id = "aiw-floating-style";
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("dist/ui/floatingShell.css");
    (document.head ?? document.documentElement).append(link);
  }

  // Inject HTML structure only once
  let existingRoot = document.getElementById("aiw-floating-root");
  if (!existingRoot) {
    const response = await fetch(
      chrome.runtime.getURL("dist/ui/floatingShell.html"),
    );
    if (!response.ok) {
      throw new Error(`Failed to load floating HTML (${response.status})`);
    }
    const html = await response.text();
    (document.body ?? document.documentElement).insertAdjacentHTML(
      "beforeend",
      html,
    );
    existingRoot = document.getElementById("aiw-floating-root");
  }

  if (!existingRoot) {
    throw new Error("floating UI root not found after injection");
  }

  return existingRoot;
}
