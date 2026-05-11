"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/storage/idb/schema.ts
  var DB_NAME, DB_VERSION, STORE_PROJECTS, STORE_ITEMS, KEY_PROJECTS, KEY_ITEMS, IDX_ITEMS_BY_PROJECT;
  var init_schema = __esm({
    "src/storage/idb/schema.ts"() {
      "use strict";
      DB_NAME = "aiw_db";
      DB_VERSION = 1;
      STORE_PROJECTS = "projects";
      STORE_ITEMS = "items";
      KEY_PROJECTS = "id";
      KEY_ITEMS = "id";
      IDX_ITEMS_BY_PROJECT = "by_projectId";
    }
  });

  // src/storage/idb/migrations.ts
  function applyMigrations(db, oldVersion, _newVersion, tx) {
    if (!tx || tx.mode !== "versionchange") {
      throw new Error(
        "applyMigrations must run inside a versionchange transaction"
      );
    }
    if (oldVersion < 1) {
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: KEY_PROJECTS });
      }
      const itemsStore = db.objectStoreNames.contains(STORE_ITEMS) ? tx.objectStore(STORE_ITEMS) : db.createObjectStore(STORE_ITEMS, { keyPath: KEY_ITEMS });
      if (!itemsStore.indexNames.contains(IDX_ITEMS_BY_PROJECT)) {
        itemsStore.createIndex(IDX_ITEMS_BY_PROJECT, "projectId", {
          unique: false
        });
      }
    }
  }
  var init_migrations = __esm({
    "src/storage/idb/migrations.ts"() {
      "use strict";
      init_schema();
    }
  });

  // src/storage/idb/openDb.ts
  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion;
        const tx = request.transaction;
        console.log(`[IDB] Upgrade needed: v${oldVersion} -> v${newVersion}`);
        applyMigrations(db, oldVersion, newVersion, tx);
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          console.warn("[IDB] Version change detected; closing DB connection.");
          db.close();
        };
        console.log(`[IDB] Opened ${db.name} v${db.version}`);
        resolve(db);
      };
      request.onerror = () => {
        reject(
          request.error ?? new Error(`[IDB] Failed to open ${DB_NAME} v${DB_VERSION}`)
        );
      };
      request.onblocked = () => {
        console.warn(
          "[IDB] Upgrade blocked: another tab/context is holding an old DB connection open."
        );
      };
    });
  }
  var init_openDb = __esm({
    "src/storage/idb/openDb.ts"() {
      "use strict";
      init_schema();
      init_migrations();
    }
  });

  // src/storage/idb/promisify.ts
  function requestToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("Request error"));
    });
  }
  function txToPromise(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
      tx.onerror = () => reject(tx.error ?? new Error("Transaction error"));
    });
  }
  var init_promisify = __esm({
    "src/storage/idb/promisify.ts"() {
      "use strict";
    }
  });

  // src/storage/repo/projectsRepo.ts
  async function insertProject(project) {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_PROJECTS, "readwrite");
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.put(project);
      await requestToPromise(req);
      await txToPromise(tx);
    } finally {
      db.close();
    }
  }
  async function getAllProjects() {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_PROJECTS, "readonly");
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();
      const rows = await requestToPromise(req);
      await txToPromise(tx);
      rows.sort((a, b) => b.createdAt - a.createdAt);
      return rows;
    } finally {
      db.close();
    }
  }
  var init_projectsRepo = __esm({
    "src/storage/repo/projectsRepo.ts"() {
      "use strict";
      init_openDb();
      init_promisify();
      init_schema();
    }
  });

  // src/storage/index.ts
  async function createProject(name, description) {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Project name is required");
    const project = {
      id: crypto.randomUUID(),
      name: trimmedName,
      createdAt: Date.now()
    };
    const descTrimmed = description?.trim();
    if (descTrimmed) project.description = descTrimmed;
    await insertProject(project);
    return project;
  }
  async function listProjects() {
    return getAllProjects();
  }
  var init_storage = __esm({
    "src/storage/index.ts"() {
      "use strict";
      init_projectsRepo();
    }
  });

  // src/content/injectSidebar.ts
  var require_injectSidebar = __commonJS({
    "src/content/injectSidebar.ts"() {
      init_storage();
      async function ensureSidebarInjected() {
        const styleLink = document.getElementById("aiw-sidebar-style");
        if (!styleLink) {
          const parent = document.head ?? document.documentElement;
          const link = document.createElement("link");
          link.id = "aiw-sidebar-style";
          link.rel = "stylesheet";
          link.href = chrome.runtime.getURL("dist/ui/sidebar.css");
          parent.append(link);
        }
        if (document.getElementById("aiw-sidebar-root")) return;
        const response = await fetch(chrome.runtime.getURL("dist/ui/sidebar.html"));
        if (!response.ok) {
          throw new Error(`Failed to fetch sidebar.html (HTTP ${response.status})`);
        }
        const sidebarHtml = await response.text();
        if (!document.getElementById("aiw-sidebar-root")) {
          const parent = document.body ?? document.documentElement;
          parent.insertAdjacentHTML("beforeend", sidebarHtml);
        }
        if (!document.getElementById("aiw-sidebar-root")) {
          throw new Error(
            "Sidebar injection failed: #aiw-sidebar-root not found after insert"
          );
        }
      }
      function mustQuery(root, selector) {
        const el = root.querySelector(selector);
        if (!el)
          throw new Error(`Sidebar UI is missing required element: ${selector}`);
        return el;
      }
      async function initSidebar() {
        const root = document.getElementById("aiw-sidebar-root");
        if (!root) {
          throw new Error("initSidebar called before sidebar root exists");
        }
        const projectsListEl = mustQuery(root, "#aiw-projects-list");
        const addProjectBtn = mustQuery(
          root,
          "#aiw-add-project-button"
        );
        let currentProjectId = null;
        async function renderProjects() {
          console.log("render started");
          projectsListEl.textContent = "";
          const projects = await listProjects();
          console.log("projects fetched");
          for (const project of projects) {
            const row = document.createElement("div");
            row.className = "aiw-projects-row";
            row.textContent = project.name;
            row.addEventListener("click", () => {
              currentProjectId = project.id;
              void renderProjects();
            });
            if (project.id === currentProjectId) {
              row.classList.add("aiw-projects-row--active");
            }
            projectsListEl.append(row);
          }
          console.log("end of the render");
        }
        async function handleNewProjectClick() {
          const input = window.prompt("Enter project name:");
          if (input === null) return;
          const name = input.trim();
          if (!name) return;
          try {
            await createProject(name);
            await renderProjects();
          } catch (err) {
            console.error("[AIW] Failed to create project:", err);
            window.alert("Failed to create project. See console for details.");
          }
        }
        addProjectBtn.addEventListener("click", handleNewProjectClick);
        await renderProjects();
      }
      ensureSidebarInjected().then(() => initSidebar()).catch((err) => {
        console.error("[AIW] Sidebar bootstrap failed:", err);
      });
    }
  });
  require_injectSidebar();
})();
//# sourceMappingURL=injectSidebar.js.map
