// src/content/injectSidebar.ts
//
// Content script entrypoint.
// Responsibilities (v0):
// 1) Inject the sidebar HTML/CSS into the ChatGPT page (idempotent).
// 2) Initialize the sidebar UI controller (projects list + create project).
//
// Design notes:
// - This file runs in a content script (isolated world). It can touch the DOM.
// - Persistence is handled via storage/index.ts (IndexedDB) called from here.
// - We fail fast when required DOM nodes are missing; no silent degradation.
// - We keep all selectors scoped under the sidebar root to avoid collisions.
//

import { createProject, listProjects } from "../storage/index";

/**
 * Ensure the sidebar CSS + HTML are present in the page.
 *
 * Contract:
 * - Resolves only when #aiw-sidebar-root exists in the DOM.
 * - Rejects (throws) if the fetch/injection fails or if the root is still missing.
 *
 * Idempotency:
 * - Safe to call multiple times; it won't duplicate the sidebar.
 */
async function ensureSidebarInjected(): Promise<void> {
  // ---- Inject CSS (idempotent) ----
  const styleLink = document.getElementById("aiw-sidebar-style");
  if (!styleLink) {
    const parent = document.head ?? document.documentElement;

    const link = document.createElement("link");
    link.id = "aiw-sidebar-style";
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("dist/ui/sidebar.css");

    parent.append(link);
  }

  // ---- Inject HTML (idempotent) ----
  if (document.getElementById("aiw-sidebar-root")) return;

  const response = await fetch(chrome.runtime.getURL("dist/ui/sidebar.html"));
  if (!response.ok) {
    throw new Error(`Failed to fetch sidebar.html (HTTP ${response.status})`);
  }

  const sidebarHtml = await response.text();

  // Re-check after awaiting fetch: another run may have injected it meanwhile.
  if (!document.getElementById("aiw-sidebar-root")) {
    const parent = document.body ?? document.documentElement;
    parent.insertAdjacentHTML("beforeend", sidebarHtml);
  }

  // Assert the invariant: the rest of the code assumes the root exists.
  if (!document.getElementById("aiw-sidebar-root")) {
    throw new Error(
      "Sidebar injection failed: #aiw-sidebar-root not found after insert",
    );
  }
}

/**
 * Get an element under a root node or throw a descriptive error.
 *
 * Why:
 * - Avoids `null` checks scattered everywhere.
 * - Turns missing DOM nodes into actionable errors (often caused by HTML id typos).
 */
function mustQuery<T extends Element>(root: Element, selector: string): T {
  const el = root.querySelector(selector);
  if (!el)
    throw new Error(`Sidebar UI is missing required element: ${selector}`);
  return el as T;
}

/**
 * Initialize the sidebar UI.
 *
 * Contract:
 * - Assumes ensureSidebarInjected() already ran successfully.
 * - Throws if required elements are missing (fail fast).
 */
async function initSidebar(): Promise<void> {
  const root = document.getElementById("aiw-sidebar-root");
  if (!root) {
    // This should be impossible if ensureSidebarInjected() is correct.
    throw new Error("initSidebar called before sidebar root exists");
  }

  // Scope all element lookups within the sidebar root.
  const projectsListEl = mustQuery<HTMLDivElement>(root, "#aiw-projects-list");
  const addProjectBtn = mustQuery<HTMLButtonElement>(
    root,
    "#aiw-add-project-button",
  );

  /**
   * Render all projects from persistence into the list container.
   *
   * v0 behavior:
   * - Clears and re-renders (simple and reliable).
   * - Newest-first ordering comes from the repo layer.
   */
  async function renderProjects(): Promise<void> {
    projectsListEl.textContent = "";

    const projects = await listProjects();

    for (const project of projects) {
      const row = document.createElement("div");

      // Keep v0 display simple. You can format createdAt later.
      row.textContent = `${project.name}`;

      projectsListEl.append(row);
    }
  }

  /**
   * Prompt the user for a project name and create it.
   *
   * Prompt handling rules:
   * - Cancel -> do nothing.
   * - Whitespace-only -> do nothing (or show a message).
   * - createProject() can throw (validation/persistence issues). We catch and surface.
   */
  async function handleNewProjectClick(): Promise<void> {
    const input = window.prompt("Enter project name:");
    if (input === null) return; // user cancelled

    const name = input.trim();
    if (!name) return; // ignore empty/whitespace

    try {
      await createProject(name);
      await renderProjects();
    } catch (err) {
      // v0: minimal error surfacing.
      // In later versions, you'll show a toast or inline error message in the sidebar.
      console.error("[AIW] Failed to create project:", err);
      window.alert("Failed to create project. See console for details.");
    }
  }

  addProjectBtn.addEventListener("click", handleNewProjectClick);

  // Initial render on startup.
  await renderProjects();
}

/**
 * Dev-only seed helper.
 *
 * Use only for testing persistence. Keep disabled by default.
 * It uses chrome.storage.local as a simple "run once" guard.
 */
async function devSeedOnce(): Promise<void> {
  const { aiw_devSeeded } = await chrome.storage.local.get("aiw_devSeeded");

  if (aiw_devSeeded !== true) {
    // Best-effort race mitigation: set flag first.
    await chrome.storage.local.set({ aiw_devSeeded: true });

    try {
      await createProject("Test Project");
    } catch (err) {
      await chrome.storage.local.set({ aiw_devSeeded: false });
      throw err;
    }
  }

  const projects = await listProjects();
  console.log("[devSeedOnce] projects:", projects);
}

// Bootstrap sequence:
// - Inject sidebar
// - Initialize UI
// If injection fails, init will not run.
ensureSidebarInjected()
  .then(() => initSidebar())
  .catch((err) => {
    console.error("[AIW] Sidebar bootstrap failed:", err);
  });

// devSeedOnce();
