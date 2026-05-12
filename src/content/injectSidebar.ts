// src/content/injectSidebar.ts
//
// Content script entrypoint.
// Responsibilities (v0):
// 1) Inject the sidebar HTML/CSS into the ChatGPT page (idempotent).
// 2) Initialize the sidebar UI controller (projects list + create project).
//
// Design notes:
// - Runs in isolated content script world; can manipulate DOM.
// - Persistence is handled via IndexedDB layer (storage/index.ts).
// - UI state lives in-memory inside this module (v0 only).
// - No duplicate injection allowed (idempotent bootstrap).
// - Fail fast on missing DOM structure.

import { createProject, listProjects } from "../storage/index";
import type { Project } from "../models/project";

/* ----------------------------- Bootstrap ----------------------------- */

async function ensureSidebarInjected(): Promise<void> {
  // Inject CSS once
  const styleLink = document.getElementById("aiw-sidebar-style");

  if (!styleLink) {
    const parent = document.head ?? document.documentElement;

    const link = document.createElement("link");
    link.id = "aiw-sidebar-style";
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("dist/ui/sidebar.css");

    parent.append(link);
  }

  // Inject HTML once
  if (!document.getElementById("aiw-sidebar-root")) {
    const response = await fetch(chrome.runtime.getURL("dist/ui/sidebar.html"));

    if (!response.ok) {
      throw new Error(`Failed to fetch sidebar.html (${response.status})`);
    }

    const html = await response.text();

    const parent = document.body ?? document.documentElement;
    parent.insertAdjacentHTML("beforeend", html);
  }

  // Hard invariant check
  if (!document.getElementById("aiw-sidebar-root")) {
    throw new Error("Sidebar injection failed: root element not found");
  }
}

/* ----------------------------- Helpers ----------------------------- */

function mustQuery<T extends Element>(root: Element, selector: string): T {
  const el = root.querySelector(selector);
  if (!el) {
    throw new Error(`Missing required sidebar element: ${selector}`);
  }
  return el as T;
}

/* ----------------------------- Init UI ----------------------------- */

async function initSidebar(): Promise<void> {
  const root = document.getElementById("aiw-sidebar-root");

  if (!root) {
    throw new Error("initSidebar called before sidebar root exists");
  }

  /* ---------------- DOM references ---------------- */

  const projectsListEl = mustQuery<HTMLDivElement>(root, "#aiw-projects-list");
  const addProjectBtn = mustQuery<HTMLButtonElement>(
    root,
    "#aiw-add-project-button",
  );

  /* ---------------- UI state ---------------- */

  let currentProjectId: string | null = null;
  let projectsCache: Project[] = [];

  /* ---------------- State layer ---------------- */

  async function refreshProjectsCache(): Promise<void> {
    projectsCache = await listProjects();
  }

  async function updateUI(): Promise<void> {
    await refreshProjectsCache();
    renderProjects();
  }

  /* ---------------- Render layer ---------------- */

  function renderProjects(): void {
    console.log("render started");

    projectsListEl.textContent = "";

    for (const project of projectsCache) {
      const row = document.createElement("div");
      row.className = "aiw-projects-row";
      row.textContent = project.name;

      row.addEventListener("click", () => {
        currentProjectId = project.id;
        void updateUI();
      });

      if (project.id === currentProjectId) {
        row.classList.add("aiw-projects-row--active");
      }

      projectsListEl.append(row);
    }

    console.log("render finished");
  }

  /* ---------------- Event handlers ---------------- */

  async function handleNewProjectClick(): Promise<void> {
    const input = window.prompt("Enter project name:");
    if (input === null) return;

    const name = input.trim();
    if (!name) return;

    try {
      await createProject(name);
      await updateUI();
    } catch (err) {
      console.error("[AIW] Failed to create project:", err);
      window.alert("Failed to create project. See console for details.");
    }
  }

  addProjectBtn.addEventListener("click", handleNewProjectClick);

  /* ---------------- Initial render ---------------- */

  await updateUI();
}

/* ----------------------------- Dev helper ----------------------------- */

async function devSeedOnce(): Promise<void> {
  const { aiw_devSeeded } = await chrome.storage.local.get("aiw_devSeeded");

  if (aiw_devSeeded !== true) {
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

/* ----------------------------- Bootstrap ----------------------------- */

ensureSidebarInjected()
  .then(() => initSidebar())
  .catch((err) => {
    console.error("[AIW] Sidebar bootstrap failed:", err);
  });

// devSeedOnce();
