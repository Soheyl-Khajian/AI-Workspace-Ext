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
  async function listProjects() {
    return getAllProjects();
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
      throw new Error(`Missing required UI element: ${selector}`);
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

  // src/ui/floating/orbActionRouter.ts
  function handleOrbAction(actionId, context) {
    switch (actionId) {
      case "projects":
      case "capture":
      case "search":
        context.togglePanel(actionId);
        break;
      default:
        assertNever(actionId);
    }
  }
  function assertNever(value) {
    throw new Error(`Unhandled action: ${String(value)}`);
  }
  var init_orbActionRouter = __esm({
    "src/ui/floating/orbActionRouter.ts"() {
      "use strict";
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

  // src/ui/floating/state/floatingUiState.ts
  function isOrbExpanded() {
    return state.orbExpanded;
  }
  function getActivePanel() {
    return state.activePanel;
  }
  function expandOrb() {
    state.orbExpanded = true;
  }
  function collapseOrb() {
    state.orbExpanded = false;
    state.activePanel = null;
  }
  function togglePanel(panel) {
    const current = state.activePanel;
    if (current === panel) {
      state.activePanel = null;
    } else {
      state.activePanel = panel;
      state.orbExpanded = true;
    }
  }
  var state;
  var init_floatingUiState = __esm({
    "src/ui/floating/state/floatingUiState.ts"() {
      "use strict";
      state = {
        orbExpanded: false,
        activePanel: null
      };
    }
  });

  // src/ui/floating/components/createFloatingPanelShell.ts
  function createFloatingPanelShell(title) {
    const panelEl = document.createElement("section");
    panelEl.className = "aiw-floating-panel";
    const headerEl = document.createElement("header");
    headerEl.className = "aiw-floating-panel__header";
    const titleEl = document.createElement("h2");
    titleEl.className = "aiw-floating-panel__title";
    titleEl.textContent = title;
    headerEl.append(titleEl);
    const bodyEl = document.createElement("div");
    bodyEl.className = "aiw-floating-panel__body";
    panelEl.append(headerEl, bodyEl);
    return {
      panelEl,
      bodyEl
    };
  }
  var init_createFloatingPanelShell = __esm({
    "src/ui/floating/components/createFloatingPanelShell.ts"() {
      "use strict";
    }
  });

  // src/ui/floating/components/createPanelState.ts
  function createPanelState({
    variant,
    message
  }) {
    const el = document.createElement("div");
    el.className = "aiw-panel-state";
    switch (variant) {
      case "loading":
        el.classList.add("aiw-panel-state--loading");
        break;
      case "empty":
        el.classList.add("aiw-panel-state--empty");
        break;
      case "error":
        el.classList.add("aiw-panel-state--error");
        break;
      case "placeholder":
        el.classList.add("aiw-panel-state--placeholder");
        break;
      default: {
        const _exhaustive = variant;
        throw new Error(`Unhandled panel variant: ${_exhaustive}`);
      }
    }
    el.textContent = message;
    return el;
  }
  var init_createPanelState = __esm({
    "src/ui/floating/components/createPanelState.ts"() {
      "use strict";
    }
  });

  // src/ui/floating/state/projectsState.ts
  function getProjects() {
    return [...state2.projects];
  }
  function isProjectsLoading() {
    return state2.loading;
  }
  function getProjectsError() {
    return state2.error;
  }
  function setProjects(projectsList) {
    state2.projects = [...projectsList];
  }
  function setLoading(loading) {
    state2.loading = loading;
  }
  function setError(error) {
    state2.error = error;
  }
  var state2;
  var init_projectsState = __esm({
    "src/ui/floating/state/projectsState.ts"() {
      "use strict";
      state2 = {
        projects: [],
        selectedProjectId: null,
        loading: false,
        error: null
      };
    }
  });

  // src/ui/floating/panels/renderProjectsPanel.ts
  function renderProjectsPanel(containerEl) {
    let shellEl = createFloatingPanelShell("Projects");
    const loading = isProjectsLoading();
    const error = getProjectsError();
    const projects = getProjects();
    const isEmpty = projects.length === 0;
    function renderProjectsList(projectsList) {
      const listEl = document.createElement("div");
      listEl.className = "aiw-projects-list";
      for (const project of projectsList) {
        const rowEl = document.createElement("button");
        rowEl.type = "button";
        rowEl.className = "aiw-project-row";
        rowEl.textContent = project.name;
        listEl.append(rowEl);
      }
      shellEl.bodyEl.append(listEl);
    }
    if (loading) {
      const loadingStateEl = createPanelState({
        variant: "loading",
        message: "Loading..."
      });
      shellEl.bodyEl.append(loadingStateEl);
    } else if (error !== null) {
      const errorStateEl = createPanelState({ variant: "error", message: error });
      shellEl.bodyEl.append(errorStateEl);
    } else if (isEmpty) {
      const emptyStateEl = createPanelState({
        variant: "empty",
        message: "No projects yet"
      });
      shellEl.bodyEl.append(emptyStateEl);
    } else {
      renderProjectsList(projects);
    }
    containerEl.append(shellEl.panelEl);
  }
  var init_renderProjectsPanel = __esm({
    "src/ui/floating/panels/renderProjectsPanel.ts"() {
      "use strict";
      init_createFloatingPanelShell();
      init_createPanelState();
      init_projectsState();
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
    const activePanel = getActivePanel();
    if (activePanel === null) {
      return;
    }
    switch (activePanel) {
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
        assertNever2(activePanel);
    }
  }
  function assertNever2(value) {
    throw new Error(`Unhandled panel type: ${String(value)}`);
  }
  var init_renderFloatingPanels = __esm({
    "src/ui/floating/panels/renderFloatingPanels.ts"() {
      "use strict";
      init_floatingUiState();
      init_renderProjectsPanel();
      init_renderCapturePanel();
      init_renderSearchPanel();
    }
  });

  // src/ui/floating/controllers/loadProjects.ts
  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const projects = await listProjects();
      setProjects(projects);
    } catch (error) {
      setProjects([]);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to load projects.");
      }
    } finally {
      setLoading(false);
    }
  }
  var init_loadProjects = __esm({
    "src/ui/floating/controllers/loadProjects.ts"() {
      "use strict";
      init_storage();
      init_projectsState();
    }
  });

  // src/ui/floating/controllers/projectsController.ts
  function createProjectsController(dependencies) {
    const { onStateChange } = dependencies;
    async function load() {
      try {
        await loadProjects();
      } finally {
        onStateChange();
      }
    }
    return {
      load
    };
  }
  var init_projectsController = __esm({
    "src/ui/floating/controllers/projectsController.ts"() {
      "use strict";
      init_loadProjects();
    }
  });

  // src/ui/floating/controllers/floatingController.ts
  function initFloatingController(rootEl) {
    const dom = createFloatingDom(rootEl);
    const projectsController = createProjectsController({
      onStateChange: renderUi
    });
    const actionsContext = createOrbActionContext();
    renderUi();
    void projectsController.load();
    function handleDocumentPointerDown(event) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const clickedInsideFloatingUi = rootEl.contains(target);
      if (clickedInsideFloatingUi) {
        return;
      }
      setOrbCollapsed();
    }
    function setOrbExpanded() {
      expandOrb();
      renderUi();
    }
    function setOrbCollapsed() {
      collapseOrb();
      renderUi();
    }
    function toggleOrbVisibility() {
      const expanded = isOrbExpanded();
      if (expanded) {
        setOrbCollapsed();
      } else {
        setOrbExpanded();
      }
    }
    function toggleFloatingPanel(panelId) {
      togglePanel(panelId);
      renderUi();
    }
    function createOrbActionContext() {
      return { togglePanel: toggleFloatingPanel };
    }
    function handleOrbActionClick(actionId) {
      handleOrbAction(actionId, actionsContext);
    }
    function renderUi() {
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
    dom.orbButtonEl.addEventListener("click", toggleOrbVisibility);
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return function destroyFloatingController() {
      dom.orbButtonEl.removeEventListener("click", toggleOrbVisibility);
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }
  var init_floatingController = __esm({
    "src/ui/floating/controllers/floatingController.ts"() {
      "use strict";
      init_floatingDom();
      init_orbActionRouter();
      init_orbActions();
      init_renderOrbActions();
      init_renderFloatingPanels();
      init_floatingUiState();
      init_projectsController();
    }
  });

  // src/content/injectFloatingUi.ts
  var require_injectFloatingUi = __commonJS({
    "src/content/injectFloatingUi.ts"() {
      init_storage();
      init_floatingController();
      async function injectFloatingAssets() {
        const existingStyle = document.getElementById("aiw-floating-style");
        if (!existingStyle) {
          const link = document.createElement("link");
          link.id = "aiw-floating-style";
          link.rel = "stylesheet";
          link.href = chrome.runtime.getURL("dist/ui/floating/floatingShell.css");
          (document.head ?? document.documentElement).append(link);
        }
        let existingRoot = document.getElementById("aiw-floating-root");
        if (!existingRoot) {
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
          existingRoot = document.getElementById("aiw-floating-root");
        }
        if (!existingRoot) {
          throw new Error("floating UI root not found after injection");
        }
        return existingRoot;
      }
      async function seedDevDataOnce() {
        const flag = await chrome.storage.local.get("aiw_devSeeded");
        if (flag.aiw_devSeeded === true) return;
        await chrome.storage.local.set({ aiw_devSeeded: true });
        try {
          for (let i = 0; i < 5; i++) {
            await createProject("Test Project");
          }
        } catch (err) {
          await chrome.storage.local.set({ aiw_devSeeded: false });
          throw err;
        }
      }
      async function bootstrap() {
        const root = await injectFloatingAssets();
        initFloatingController(root);
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
