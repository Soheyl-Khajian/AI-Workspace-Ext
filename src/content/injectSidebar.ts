// src/content/injectSidebar.ts
import { createProject, listProjects } from "../storage/index";

const styleLink = document.getElementById("aiw-sidebar-style");
if (!styleLink) {
  const parent = document.head ?? document.documentElement; // ?? falls back to right side only if null or undefined; does not check falsy.

  const link = document.createElement("link");
  link.id = "aiw-sidebar-style";
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("dist/ui/sidebar.css");

  parent.append(link);
}

const sidebar = document.getElementById("aiw-sidebar-root");
if (!sidebar) {
  fetch(chrome.runtime.getURL("dist/ui/sidebar.html"))
    .then((response) => {
      if (!response.ok)
        throw new Error(`Failed to load sidebar.html (${response.status})`);
      return response.text();
    })
    .then((sidebarHTML) => {
      if (document.getElementById("aiw-sidebar-root")) return; // recheck if sidebar exists to avoid race condition
      const parent = document.body ?? document.documentElement;
      // Inject the HTML into the page
      parent.insertAdjacentHTML("beforeend", sidebarHTML);
    })
    .catch((error) => {
      console.error("Failed to inject sidebar HTML:", error);
    });
}

async function devSeedOnce() {
  // 1) Read the stored flag (get() always returns an object)
  const { aiw_devSeeded } = await chrome.storage.local.get("aiw_devSeeded");

  // 2) Seed only if we have not already seeded
  if (aiw_devSeeded !== true) {
    // Race-condition mitigation (best-effort):
    // Set the flag first so a concurrent run is less likely to double-seed.
    await chrome.storage.local.set({ aiw_devSeeded: true });

    try {
      // Ensure the DB write completes before we proceed.
      await createProject("Test Project");
    } catch (err) {
      // If seeding fails, roll back the flag so the next run can retry.
      await chrome.storage.local.set({ aiw_devSeeded: false });
      throw err;
    }
  }

  // 3) Always verify by listing (runs whether seeded or already present)
  const projectsList = await listProjects();
  console.log("[devSeedOnce] projects:", projectsList);
}
// devSeedOnce();
