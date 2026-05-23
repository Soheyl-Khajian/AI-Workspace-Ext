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
  var DB_NAME, DB_VERSION, STORE_PROJECTS, STORE_ITEMS, KEY_PROJECTS, KEY_ITEMS, IDX_ITEMS_BY_PROJECT, IDB_SCHEMA;
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
      IDB_SCHEMA = {
        stores: [
          {
            // Projects are stored as records keyed by Project.id
            name: STORE_PROJECTS,
            keyPath: KEY_PROJECTS,
            indexes: []
          },
          {
            // Items are stored as records keyed by Item.id
            name: STORE_ITEMS,
            keyPath: KEY_ITEMS,
            indexes: [
              {
                // Required query in v0: list items by projectId
                name: IDX_ITEMS_BY_PROJECT,
                keyPath: "projectId",
                options: { unique: false }
              }
            ]
          }
        ]
      };
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
      const stores = IDB_SCHEMA.stores;
      for (const storeDef of stores) {
        const storeName = storeDef.name;
        let store;
        if (!db.objectStoreNames.contains(storeName)) {
          store = db.createObjectStore(storeName, {
            keyPath: storeDef.keyPath
          });
        } else {
          store = tx.objectStore(storeName);
        }
        for (const indexDef of storeDef.indexes) {
          if (!store.indexNames.contains(indexDef.name)) {
            store.createIndex(indexDef.name, indexDef.keyPath, indexDef.options);
          }
        }
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
  var init_projectsRepo = __esm({
    "src/storage/repo/projectsRepo.ts"() {
      "use strict";
      init_openDb();
      init_promisify();
      init_schema();
    }
  });

  // src/storage/repo/itemsRepo.ts
  var init_itemsRepo = __esm({
    "src/storage/repo/itemsRepo.ts"() {
      "use strict";
      init_openDb();
      init_promisify();
      init_schema();
    }
  });

  // src/storage/index.ts
  async function createProject(name, description) {
    if (name == null) {
      throw new Error("Project name is required (received null/undefined)");
    }
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Project name cannot be empty");
    }
    const project = {
      id: crypto.randomUUID(),
      name: trimmedName,
      createdAt: Date.now()
    };
    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      project.description = trimmedDescription;
    }
    await insertProject(project);
    return project;
  }
  var init_storage = __esm({
    "src/storage/index.ts"() {
      "use strict";
      init_projectsRepo();
      init_itemsRepo();
    }
  });

  // src/ui/floating/floatingDom.ts
  function mustQuery(root, selector) {
    const el = root.querySelector(selector);
    if (!el) {
      throw new Error(`Missing required sidebar element: ${selector}`);
    }
    return el;
  }
  function createFloatingDom(rootEl) {
    return {
      rootEl,
      orbButtonEl: mustQuery(rootEl, "#aiw-orb-button"),
      orbActionsEl: mustQuery(rootEl, "#aiw-orb-actions"),
      orbPanelsEl: mustQuery(rootEl, "#aiw-orb-panels")
    };
  }
  var init_floatingDom = __esm({
    "src/ui/floating/floatingDom.ts"() {
      "use strict";
    }
  });

  // src/ui/floating/floatingState.ts
  function isOrbExpanded() {
    return state.isOrbExpanded;
  }
  function expandOrb() {
    state.isOrbExpanded = true;
  }
  function collapseOrb() {
    state.isOrbExpanded = false;
  }
  var state;
  var init_floatingState = __esm({
    "src/ui/floating/floatingState.ts"() {
      "use strict";
      state = {
        isOrbExpanded: false
      };
    }
  });

  // src/ui/floating/panels/floatingPanelState.ts
  function setActivePanel(panel) {
    activePanel = panel;
  }
  function clearActivePanel() {
    activePanel = null;
  }
  function getActivePanel() {
    return activePanel;
  }
  var activePanel;
  var init_floatingPanelState = __esm({
    "src/ui/floating/panels/floatingPanelState.ts"() {
      "use strict";
      activePanel = null;
    }
  });

  // src/ui/floating/orbActionRouter.ts
  function handleOrbAction(actionId, context) {
    const currentPanel = getActivePanel();
    if (currentPanel === actionId) {
      context.closeAllPanels();
      return;
    }
    context.closeAllPanels();
    switch (actionId) {
      case "projects":
        context.closeAllPanels();
        context.openProjectsPanel();
        break;
      case "capture":
        context.closeAllPanels();
        context.openCapturePanel();
        break;
      case "search":
        context.closeAllPanels();
        context.openSearchPanel();
        break;
      default:
        console.log(`Unknown action ID: ${actionId}`);
        return;
    }
  }
  var init_orbActionRouter = __esm({
    "src/ui/floating/orbActionRouter.ts"() {
      "use strict";
      init_floatingPanelState();
    }
  });

  // src/ui/floating/orbActions.ts
  function getOrbActions() {
    return orbActions;
  }
  var orbActions;
  var init_orbActions = __esm({
    "src/ui/floating/orbActions.ts"() {
      "use strict";
      orbActions = [
        {
          id: "projects",
          label: "Projects"
        },
        {
          id: "capture",
          label: "Capture"
        },
        {
          id: "search",
          label: "Search"
        }
      ];
    }
  });

  // src/ui/floating/components/createOrbActionButton.ts
  function createOrbActionButton({
    label,
    actionId
  }) {
    const buttonEl = document.createElement("button");
    buttonEl.type = "button";
    buttonEl.className = "aiw-orb-action";
    buttonEl.dataset.actionId = actionId;
    buttonEl.textContent = label;
    return buttonEl;
  }
  var init_createOrbActionButton = __esm({
    "src/ui/floating/components/createOrbActionButton.ts"() {
      "use strict";
    }
  });

  // src/ui/floating/renderers/renderOrbActions.ts
  function renderOrbActions(containerEl, expanded, actions, onActionClick) {
    containerEl.textContent = "";
    if (!expanded) {
      return;
    }
    for (const action of actions) {
      const buttonEl = createOrbActionButton({
        actionId: action.id,
        label: action.label
      });
      buttonEl.addEventListener("click", () => onActionClick(action.id));
      containerEl.append(buttonEl);
    }
  }
  var init_renderOrbActions = __esm({
    "src/ui/floating/renderers/renderOrbActions.ts"() {
      "use strict";
      init_createOrbActionButton();
    }
  });

  // src/ui/floating/panels/renderProjectsPanel.ts
  function renderProjectsPanel(containerEl) {
    const panelEl = document.createElement("section");
    panelEl.className = "aiw-floating-panel";
    const headerEl = document.createElement("header");
    headerEl.className = "aiw-floating-panel__header";
    const titleEl = document.createElement("h2");
    titleEl.className = "aiw-floating-panel__title";
    titleEl.textContent = "Projects";
    headerEl.append(titleEl);
    const bodyEl = document.createElement("div");
    bodyEl.className = "aiw-floating-panel__body";
    const placeholderEl = document.createElement("p");
    placeholderEl.className = "aiw-floating-panel__placeholder";
    placeholderEl.textContent = "Projects panel placeholder";
    bodyEl.append(placeholderEl);
    panelEl.append(headerEl, bodyEl);
    containerEl.append(panelEl);
  }
  var init_renderProjectsPanel = __esm({
    "src/ui/floating/panels/renderProjectsPanel.ts"() {
      "use strict";
    }
  });

  // src/ui/floating/panels/renderCapturePanel.ts
  function renderCapturePanel(containerEl) {
    const panelEl = document.createElement("section");
    panelEl.className = "aiw-floating-panel";
    const headerEl = document.createElement("header");
    headerEl.className = "aiw-floating-panel__header";
    const titleEl = document.createElement("h2");
    titleEl.className = "aiw-floating-panel__title";
    titleEl.textContent = "Capture";
    headerEl.append(titleEl);
    const bodyEl = document.createElement("div");
    bodyEl.className = "aiw-floating-panel__body";
    const placeholderEl = document.createElement("p");
    placeholderEl.className = "aiw-floating-panel__placeholder";
    placeholderEl.textContent = "Capture panel placeholder";
    bodyEl.append(placeholderEl);
    panelEl.append(headerEl, bodyEl);
    containerEl.append(panelEl);
  }
  var init_renderCapturePanel = __esm({
    "src/ui/floating/panels/renderCapturePanel.ts"() {
      "use strict";
    }
  });

  // src/ui/floating/panels/renderSearchPanel.ts
  function renderSearchPanel(containerEl) {
    const panelEl = document.createElement("section");
    panelEl.className = "aiw-floating-panel";
    const headerEl = document.createElement("header");
    headerEl.className = "aiw-floating-panel__header";
    const titleEl = document.createElement("h2");
    titleEl.className = "aiw-floating-panel__title";
    titleEl.textContent = "Search";
    headerEl.append(titleEl);
    const bodyEl = document.createElement("div");
    bodyEl.className = "aiw-floating-panel__body";
    const placeholderEl = document.createElement("p");
    placeholderEl.className = "aiw-floating-panel__placeholder";
    placeholderEl.textContent = "Search panel placeholder";
    bodyEl.append(placeholderEl);
    panelEl.append(headerEl, bodyEl);
    containerEl.append(panelEl);
  }
  var init_renderSearchPanel = __esm({
    "src/ui/floating/panels/renderSearchPanel.ts"() {
      "use strict";
    }
  });

  // src/ui/floating/panels/renderFloatingPanels.ts
  function renderFloatingPanels(containerEl) {
    containerEl.textContent = "";
    const activePanel2 = getActivePanel();
    if (activePanel2 === null) {
      return;
    }
    switch (activePanel2) {
      case "projects":
        renderProjectsPanel(containerEl);
        break;
      case "capture":
        renderCapturePanel(containerEl);
        break;
      case "search":
        renderSearchPanel(containerEl);
        break;
      default:
        assertNever(activePanel2);
    }
  }
  function assertNever(value) {
    throw new Error(`Unhandled panel type: ${String(value)}`);
  }
  var init_renderFloatingPanels = __esm({
    "src/ui/floating/panels/renderFloatingPanels.ts"() {
      "use strict";
      init_floatingPanelState();
      init_renderProjectsPanel();
      init_renderCapturePanel();
      init_renderSearchPanel();
    }
  });

  // src/ui/floating/floatingController.ts
  async function initFloatingController(rootEl) {
    const dom = createFloatingDom(rootEl);
    const actionsContext = createOrbActionContext();
    syncVisualState();
    function handleDocumentPointerDown(event) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const clickedInsideFloatingUi = rootEl.contains(target);
      if (clickedInsideFloatingUi) {
        return;
      }
      closeFloatingUi();
    }
    function createOrbActionContext() {
      return {
        openProjectsPanel: () => {
          setActivePanel("projects");
        },
        openCapturePanel: () => {
          setActivePanel("capture");
        },
        openSearchPanel: () => {
          setActivePanel("search");
        },
        closeAllPanels: () => {
          clearActivePanel();
        }
      };
    }
    function closeFloatingUi() {
      collapseOrb();
      clearActivePanel();
      syncVisualState();
    }
    function handleOrbActionClick(actionId) {
      handleOrbAction(actionId, actionsContext);
      syncVisualState();
    }
    function syncVisualState() {
      const expanded = isOrbExpanded();
      const orbActions2 = getOrbActions();
      dom.rootEl.dataset.orbExpanded = String(expanded);
      renderOrbActions(
        dom.orbActionsEl,
        expanded,
        orbActions2,
        handleOrbActionClick
      );
      renderFloatingPanels(dom.orbPanelsEl);
    }
    dom.orbButtonEl.addEventListener("click", () => {
      const expanded = isOrbExpanded();
      if (expanded) {
        collapseOrb();
        clearActivePanel();
      } else {
        expandOrb();
      }
      syncVisualState();
    });
    document.addEventListener("pointerdown", handleDocumentPointerDown);
  }
  var init_floatingController = __esm({
    "src/ui/floating/floatingController.ts"() {
      "use strict";
      init_floatingDom();
      init_floatingState();
      init_orbActionRouter();
      init_orbActions();
      init_renderOrbActions();
      init_renderFloatingPanels();
      init_floatingPanelState();
    }
  });

  // src/content/injectFloatingUi.ts
  var require_injectFloatingUi = __commonJS({
    "src/content/injectFloatingUi.ts"() {
      init_storage();
      init_floatingController();
      async function injectFloatingAssets() {
        const styleExists = document.getElementById("aiw-floating-style");
        if (!styleExists) {
          const link = document.createElement("link");
          link.id = "aiw-floating-style";
          link.rel = "stylesheet";
          link.href = chrome.runtime.getURL("dist/ui/floating/floatingShell.css");
          (document.head ?? document.documentElement).append(link);
        }
        const rootExists = document.getElementById("aiw-floating-root");
        if (!rootExists) {
          const response = await fetch(
            chrome.runtime.getURL("dist/ui/floating/floatingShell.html")
          );
          if (!response.ok) {
            throw new Error(`Failed to load floating HTML (${response.status})`);
          }
          const html = await response.text();
          (document.body ?? document.documentElement).insertAdjacentHTML(
            "beforeend",
            html
          );
        }
        const root = document.getElementById("aiw-floating-root");
        if (!root) {
          throw new Error("floating UI root not found after injection");
        }
      }
      async function seedDevDataOnce() {
        const flag = await chrome.storage.local.get("aiw_devSeeded");
        if (flag.aiw_devSeeded === true) return;
        await chrome.storage.local.set({ aiw_devSeeded: true });
        try {
          await createProject("Test Project");
        } catch (err) {
          await chrome.storage.local.set({ aiw_devSeeded: false });
          throw err;
        }
      }
      async function bootstrap() {
        await injectFloatingAssets();
        const root = document.getElementById("aiw-floating-root");
        if (!root) {
          throw new Error("floating UI root missing after injection");
        }
        await initFloatingController(root);
        await seedDevDataOnce();
      }
      bootstrap().catch((err) => {
        console.error("[AIW] floating UI bootstrap failed:", err);
      });
    }
  });
  require_injectFloatingUi();
})();
//# sourceMappingURL=injectFloatingUi.js.map
