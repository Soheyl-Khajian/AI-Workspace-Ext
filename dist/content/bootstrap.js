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
  async function getProjectById(id) {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_PROJECTS, "readonly");
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.get(id);
      const project = await requestToPromise(req);
      await txToPromise(tx);
      return project;
    } finally {
      db.close();
    }
  }
  async function getOrInsertProjectByName(name, candidate) {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_PROJECTS, "readwrite");
      const store = tx.objectStore(STORE_PROJECTS);
      const existing = await requestToPromise(store.getAll());
      const match = existing.find((p) => p.name === name);
      let result;
      if (match !== void 0) {
        result = match;
      } else {
        await requestToPromise(store.put(candidate));
        result = candidate;
      }
      await txToPromise(tx);
      return result;
    } finally {
      db.close();
    }
  }
  async function deleteProject(id) {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_PROJECTS, "readwrite");
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.delete(id);
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
  async function insertItem(item) {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_ITEMS, "readwrite");
      const store = tx.objectStore(STORE_ITEMS);
      const req = store.put(item);
      await requestToPromise(req);
      await txToPromise(tx);
    } finally {
      db.close();
    }
  }
  async function getAllItems() {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_ITEMS, "readonly");
      const store = tx.objectStore(STORE_ITEMS);
      const req = store.getAll();
      const rows = await requestToPromise(req);
      await txToPromise(tx);
      return rows;
    } finally {
      db.close();
    }
  }
  async function getItemsByProjectId(projectId) {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_ITEMS, "readonly");
      const store = tx.objectStore(STORE_ITEMS);
      const index = store.index(IDX_ITEMS_BY_PROJECT);
      const req = index.getAll(projectId);
      const rows = await requestToPromise(req);
      await txToPromise(tx);
      rows.sort((a, b) => b.createdAt - a.createdAt);
      return rows;
    } finally {
      db.close();
    }
  }
  async function getItemById(id) {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_ITEMS, "readonly");
      const store = tx.objectStore(STORE_ITEMS);
      const req = store.get(id);
      const item = await requestToPromise(req);
      await txToPromise(tx);
      return item;
    } finally {
      db.close();
    }
  }
  async function deleteItemById(id) {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_ITEMS, "readwrite");
      const store = tx.objectStore(STORE_ITEMS);
      const req = store.delete(id);
      await requestToPromise(req);
      await txToPromise(tx);
    } finally {
      db.close();
    }
  }
  async function deleteItemsByProjectId(projectId) {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_ITEMS, "readwrite");
      const store = tx.objectStore(STORE_ITEMS);
      const index = store.index(IDX_ITEMS_BY_PROJECT);
      const req = index.getAll(projectId);
      const items = await requestToPromise(req);
      for (const item of items) {
        store.delete(item.id);
      }
      await txToPromise(tx);
    } finally {
      db.close();
    }
  }
  var init_itemsRepo = __esm({
    "src/storage/repo/itemsRepo.ts"() {
      "use strict";
      init_openDb();
      init_promisify();
      init_schema();
    }
  });

  // src/storage/repo/backupRepo.ts
  async function replaceAllData(projects, items) {
    const db = await openDb();
    try {
      const tx = db.transaction([STORE_PROJECTS, STORE_ITEMS], "readwrite");
      const projectsStore = tx.objectStore(STORE_PROJECTS);
      const itemsStore = tx.objectStore(STORE_ITEMS);
      projectsStore.clear();
      itemsStore.clear();
      for (const project of projects) {
        projectsStore.put(project);
      }
      for (const item of items) {
        itemsStore.put(item);
      }
      await txToPromise(tx);
    } finally {
      db.close();
    }
  }
  var init_backupRepo = __esm({
    "src/storage/repo/backupRepo.ts"() {
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
  async function getOrCreateProjectByName(name) {
    if (name == null) {
      throw new Error("Project name is required (received null/undefined)");
    }
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Project name cannot be empty");
    }
    const candidate = {
      id: crypto.randomUUID(),
      name: trimmedName,
      createdAt: Date.now()
    };
    return getOrInsertProjectByName(trimmedName, candidate);
  }
  async function deleteProjectCascade(projectId) {
    if (projectId == null) {
      throw new Error("project id is required (null/undefined)");
    }
    const trimmedProjectId = projectId.trim();
    if (trimmedProjectId.length === 0) {
      throw new Error("project id cannot be empty");
    }
    await deleteItemsByProjectId(trimmedProjectId);
    await deleteProject(trimmedProjectId);
  }
  async function renameProject(projectId, name) {
    if (projectId == null) {
      throw new Error("project id is required (null/undefined)");
    }
    const trimmedId = projectId.trim();
    if (trimmedId.length === 0) {
      throw new Error("project id cannot be empty");
    }
    if (name == null) {
      throw new Error("Project name is required (received null/undefined)");
    }
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Project name cannot be empty");
    }
    const existing = await getProjectById(trimmedId);
    if (existing === void 0) {
      throw new Error(`Project not found: ${projectId}`);
    }
    const merged = {
      ...existing,
      name: trimmedName,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now()
    };
    await insertProject(merged);
    return merged;
  }
  async function createItem(projectId, type, title, content, meta) {
    if (projectId == null) {
      throw new Error("projectId is required (null/undefined)");
    }
    const trimmedProjectId = projectId.trim();
    if (trimmedProjectId.length === 0) {
      throw new Error("projectId cannot be empty");
    }
    if (!type) {
      throw new Error("Item type is required");
    }
    if (!meta) {
      throw new Error("Item meta is required");
    }
    const normalizedTitle = (title ?? "").trim();
    const normalizedContent = content ?? "";
    const item = {
      id: crypto.randomUUID(),
      projectId: trimmedProjectId,
      type,
      title: normalizedTitle,
      content: normalizedContent,
      createdAt: Date.now(),
      meta
    };
    await insertItem(item);
    return item;
  }
  async function listItemsByProject(projectId) {
    if (projectId == null) {
      throw new Error("projectId is required (null/undefined)");
    }
    const trimmedProjectId = projectId.trim();
    if (trimmedProjectId.length === 0) {
      throw new Error("projectId cannot be empty");
    }
    return getItemsByProjectId(trimmedProjectId);
  }
  async function updateItem(id, partialUpdate) {
    if (id == null) {
      throw new Error("item id is required (null/undefined)");
    }
    const trimmedId = id.trim();
    if (trimmedId.length === 0) {
      throw new Error("item id cannot be empty");
    }
    const existing = await getItemById(trimmedId);
    if (existing === void 0) {
      throw new Error(`Item not found: ${id}`);
    }
    const merged = {
      ...existing,
      ...partialUpdate,
      id: existing.id,
      projectId: existing.projectId,
      createdAt: existing.createdAt,
      updatedAt: Date.now()
    };
    if (partialUpdate.title !== void 0) {
      merged.title = (partialUpdate.title ?? "").trim();
    }
    if (partialUpdate.content !== void 0) {
      merged.content = partialUpdate.content ?? "";
    }
    await insertItem(merged);
    return merged;
  }
  async function deleteItem(id) {
    if (id == null) {
      throw new Error("item id is required (null/undefined)");
    }
    const trimmedId = id.trim();
    if (trimmedId.length === 0) {
      throw new Error("item id cannot be empty");
    }
    await deleteItemById(trimmedId);
  }
  async function exportAllData() {
    const projects = await listProjects();
    const items = await getAllItems();
    return { projects, items };
  }
  async function replaceAllData2(projects, items) {
    if (!Array.isArray(projects) || !Array.isArray(items)) {
      throw new Error("replaceAllData requires both projects and items arrays");
    }
    await replaceAllData(projects, items);
  }
  var init_storage = __esm({
    "src/storage/index.ts"() {
      "use strict";
      init_projectsRepo();
      init_itemsRepo();
      init_backupRepo();
    }
  });

  // src/ui/core/sessionState.ts
  function getSelectedProjectId() {
    return state.selectedProjectId;
  }
  function getSelectedItemId() {
    return state.selectedItemId;
  }
  function setSelectedProjectId(id) {
    state.selectedProjectId = id;
  }
  function setSelectedItemId(id) {
    state.selectedItemId = id;
  }
  var state;
  var init_sessionState = __esm({
    "src/ui/core/sessionState.ts"() {
      "use strict";
      state = {
        selectedProjectId: null,
        selectedItemId: null
      };
    }
  });

  // src/ui/features/projects/projectsState.ts
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
    "src/ui/features/projects/projectsState.ts"() {
      "use strict";
      state2 = {
        projects: [],
        loading: false,
        error: null
      };
    }
  });

  // src/ui/features/projects/loadProjects.ts
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
    "src/ui/features/projects/loadProjects.ts"() {
      "use strict";
      init_storage();
      init_projectsState();
    }
  });

  // src/ui/shared/showToast.ts
  function showToast(message) {
    const rootEl = document.getElementById("aiw-floating-root");
    if (!rootEl) return;
    if (activeToastEl !== null) {
      activeToastEl.remove();
      activeToastEl = null;
    }
    if (activeTimeoutId !== null) {
      clearTimeout(activeTimeoutId);
      activeTimeoutId = null;
    }
    const toastEl = document.createElement("div");
    toastEl.className = "aiw-toast";
    toastEl.textContent = message;
    rootEl.append(toastEl);
    activeToastEl = toastEl;
    activeTimeoutId = setTimeout(() => {
      toastEl.remove();
      activeToastEl = null;
      activeTimeoutId = null;
    }, TOAST_DURATION_MS);
  }
  var TOAST_DURATION_MS, activeToastEl, activeTimeoutId;
  var init_showToast = __esm({
    "src/ui/shared/showToast.ts"() {
      "use strict";
      TOAST_DURATION_MS = 2e3;
      activeToastEl = null;
      activeTimeoutId = null;
    }
  });

  // src/capture/captureHandler.ts
  async function findOrCreateInbox() {
    return getOrCreateProjectByName(INBOX_PROJECT_NAME);
  }
  function buildTitle(selectionText) {
    const trimmed = selectionText.trim();
    if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
    return trimmed.slice(0, TITLE_MAX_LENGTH) + "...";
  }
  async function capture(selectionText, sourceUrl) {
    if (!selectionText.trim()) return;
    let targetProject;
    const selectedProjectId = getSelectedProjectId();
    if (selectedProjectId !== null) {
      targetProject = getProjects().find((p) => p.id === selectedProjectId);
    }
    if (targetProject === void 0) {
      targetProject = await findOrCreateInbox();
    }
    const title = buildTitle(selectionText);
    await createItem(targetProject.id, "note", title, selectionText, {
      createdFrom: "selection",
      sourceUrl
    });
    showToast(`Saved to ${targetProject.name}`);
    await loadProjects();
    document.dispatchEvent(new CustomEvent("aiw:projects-updated"));
  }
  function handleCaptureSelection(selectionText, sourceUrl) {
    capture(selectionText, sourceUrl).catch((error) => {
      console.error("[AIW] Capture failed:", error);
      showToast("Couldn't save to workspace");
    });
  }
  var INBOX_PROJECT_NAME, TITLE_MAX_LENGTH;
  var init_captureHandler = __esm({
    "src/capture/captureHandler.ts"() {
      "use strict";
      init_storage();
      init_sessionState();
      init_loadProjects();
      init_projectsState();
      init_showToast();
      INBOX_PROJECT_NAME = "Inbox";
      TITLE_MAX_LENGTH = 60;
    }
  });

  // src/content/injectFloatingUi.ts
  async function injectFloatingAssets() {
    const existingStyle = document.getElementById("aiw-floating-style");
    if (!existingStyle) {
      const link = document.createElement("link");
      link.id = "aiw-floating-style";
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL("dist/ui/floatingShell.css");
      (document.head ?? document.documentElement).append(link);
    }
    let existingRoot = document.getElementById("aiw-floating-root");
    if (!existingRoot) {
      const response = await fetch(
        chrome.runtime.getURL("dist/ui/floatingShell.html")
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
  var init_injectFloatingUi = __esm({
    "src/content/injectFloatingUi.ts"() {
      "use strict";
    }
  });

  // src/ui/core/floatingUiState.ts
  function isOrbExpanded() {
    return state3.orbExpanded;
  }
  function getActivePanel() {
    return state3.activePanel;
  }
  function expandOrb() {
    state3.orbExpanded = true;
  }
  function collapseOrb() {
    state3.orbExpanded = false;
    state3.activePanel = null;
  }
  function openPanel(panel) {
    state3.activePanel = panel;
    state3.orbExpanded = true;
  }
  function togglePanel(panel) {
    const current = state3.activePanel;
    if (current === panel) {
      state3.activePanel = null;
    } else {
      state3.activePanel = panel;
      state3.orbExpanded = true;
    }
  }
  var state3;
  var init_floatingUiState = __esm({
    "src/ui/core/floatingUiState.ts"() {
      "use strict";
      state3 = {
        orbExpanded: false,
        activePanel: null
      };
    }
  });

  // src/ui/core/floatingDom.ts
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
    "src/ui/core/floatingDom.ts"() {
      "use strict";
    }
  });

  // src/ui/core/orbActionRouter.ts
  function handleOrbAction(actionId, context) {
    switch (actionId) {
      case "projects":
      case "backup":
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
    "src/ui/core/orbActionRouter.ts"() {
      "use strict";
    }
  });

  // src/ui/core/orbActions.ts
  function getOrbActions() {
    return orbActions;
  }
  var orbActions;
  var init_orbActions = __esm({
    "src/ui/core/orbActions.ts"() {
      "use strict";
      orbActions = [
        {
          id: "projects",
          label: "Projects"
        },
        {
          id: "backup",
          label: "Backup"
        },
        {
          id: "search",
          label: "Search"
        }
      ];
    }
  });

  // src/ui/shared/createOrbActionButton.ts
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
    "src/ui/shared/createOrbActionButton.ts"() {
      "use strict";
    }
  });

  // src/ui/core/renderOrbActions.ts
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
    "src/ui/core/renderOrbActions.ts"() {
      "use strict";
      init_createOrbActionButton();
    }
  });

  // src/ui/shared/createFloatingPanelShell.ts
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
      headerEl,
      bodyEl
    };
  }
  var init_createFloatingPanelShell = __esm({
    "src/ui/shared/createFloatingPanelShell.ts"() {
      "use strict";
    }
  });

  // src/ui/shared/createPanelState.ts
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
    "src/ui/shared/createPanelState.ts"() {
      "use strict";
    }
  });

  // src/ui/features/projects/createProjectRow.ts
  function createProjectRow(project, selected) {
    const rowEl = document.createElement("div");
    rowEl.className = "aiw-project-row";
    const projectTextEl = document.createElement("span");
    projectTextEl.className = "aiw-project-text";
    projectTextEl.textContent = project.name;
    rowEl.append(projectTextEl);
    rowEl.dataset.projectId = project.id;
    if (selected) {
      rowEl.classList.add("aiw-project-row--selected");
    }
    const renameButtonEl = document.createElement("button");
    renameButtonEl.type = "button";
    renameButtonEl.className = "aiw-project-rename";
    renameButtonEl.textContent = "\u270E";
    renameButtonEl.dataset.projectId = project.id;
    const deleteButtonEl = document.createElement("button");
    deleteButtonEl.type = "button";
    deleteButtonEl.className = "aiw-project-delete";
    deleteButtonEl.textContent = "\xD7";
    deleteButtonEl.dataset.projectId = project.id;
    rowEl.append(renameButtonEl, deleteButtonEl);
    return rowEl;
  }
  var init_createProjectRow = __esm({
    "src/ui/features/projects/createProjectRow.ts"() {
      "use strict";
    }
  });

  // src/ui/features/projects/renderProjectsPanel.ts
  function renderProjectsPanel(containerEl) {
    const shell = createFloatingPanelShell("Projects");
    const loading = isProjectsLoading();
    const error = getProjectsError();
    const projects = getProjects();
    const selectedProjectId = getSelectedProjectId();
    const isEmpty = projects.length === 0;
    function renderProjectsList(projectsList) {
      const listEl = document.createElement("div");
      listEl.className = "aiw-projects-list";
      for (const project of projectsList) {
        const selected = project.id === selectedProjectId;
        const rowEl = createProjectRow(project, selected);
        listEl.append(rowEl);
      }
      shell.bodyEl.append(listEl);
    }
    if (loading) {
      const loadingStateEl = createPanelState({
        variant: "loading",
        message: "Loading..."
      });
      shell.bodyEl.append(loadingStateEl);
    } else if (error !== null) {
      const errorStateEl = createPanelState({ variant: "error", message: error });
      shell.bodyEl.append(errorStateEl);
    } else if (isEmpty) {
      const emptyStateEl = createPanelState({
        variant: "empty",
        message: "No projects yet"
      });
      shell.bodyEl.append(emptyStateEl);
    } else {
      renderProjectsList(projects);
    }
    const formEl = document.createElement("div");
    formEl.className = "aiw-create-project-form";
    const inputEl = document.createElement("input");
    inputEl.className = "aiw-create-project-input";
    inputEl.type = "text";
    inputEl.placeholder = "New project name";
    const buttonEl = document.createElement("button");
    buttonEl.className = "aiw-create-project-submit";
    buttonEl.type = "button";
    buttonEl.textContent = "Create";
    formEl.append(inputEl, buttonEl);
    shell.panelEl.append(formEl);
    containerEl.append(shell.panelEl);
  }
  var init_renderProjectsPanel = __esm({
    "src/ui/features/projects/renderProjectsPanel.ts"() {
      "use strict";
      init_createFloatingPanelShell();
      init_createPanelState();
      init_createProjectRow();
      init_projectsState();
      init_sessionState();
    }
  });

  // src/ui/features/search/renderSearchPanel.ts
  function renderSearchPanel(containerEl) {
    const shell = createFloatingPanelShell("Search");
    const panelStateEl = createPanelState({
      variant: "placeholder",
      message: "Nothing here yet"
    });
    shell.bodyEl.append(panelStateEl);
    containerEl.append(shell.panelEl);
  }
  var init_renderSearchPanel = __esm({
    "src/ui/features/search/renderSearchPanel.ts"() {
      "use strict";
      init_createFloatingPanelShell();
      init_createPanelState();
    }
  });

  // src/ui/features/items/createItemRow.ts
  function createItemRow(item, selected, checkboxChecked) {
    const hasTitle = item.title.trim().length > 0;
    const rowEl = document.createElement("div");
    rowEl.className = "aiw-item-row";
    const checkBoxEl = document.createElement("input");
    checkBoxEl.type = "checkbox";
    checkBoxEl.checked = checkboxChecked;
    checkBoxEl.className = "aiw-item-select";
    checkBoxEl.dataset.itemId = item.id;
    rowEl.prepend(checkBoxEl);
    const itemTextEl = document.createElement("span");
    itemTextEl.className = "aiw-item-text";
    itemTextEl.textContent = hasTitle ? item.title : "Untitled";
    if (!hasTitle) {
      itemTextEl.classList.add("aiw-item-text--untitled");
    }
    rowEl.append(itemTextEl);
    rowEl.dataset.itemId = item.id;
    if (selected) {
      rowEl.classList.add("aiw-item-row--selected");
    }
    const deleteButtonEl = document.createElement("button");
    deleteButtonEl.type = "button";
    deleteButtonEl.className = "aiw-item-delete";
    deleteButtonEl.textContent = "\xD7";
    deleteButtonEl.dataset.itemId = item.id;
    rowEl.append(deleteButtonEl);
    return rowEl;
  }
  var init_createItemRow = __esm({
    "src/ui/features/items/createItemRow.ts"() {
      "use strict";
    }
  });

  // src/ui/features/items/itemsState.ts
  function getItems() {
    return [...state4.items];
  }
  function isItemsLoading() {
    return state4.loading;
  }
  function getItemsError() {
    return state4.error;
  }
  function setItems(itemsList) {
    state4.items = [...itemsList];
  }
  function setItemsLoading(loading) {
    state4.loading = loading;
  }
  function setItemsError(error) {
    state4.error = error;
  }
  var state4;
  var init_itemsState = __esm({
    "src/ui/features/items/itemsState.ts"() {
      "use strict";
      state4 = {
        items: [],
        loading: false,
        error: null
      };
    }
  });

  // src/ui/features/items/itemSelectionState.ts
  function toggleItemSelection(id) {
    if (selectedItemIds.has(id)) {
      selectedItemIds.delete(id);
    } else {
      selectedItemIds.add(id);
    }
  }
  function isItemSelected(id) {
    return selectedItemIds.has(id);
  }
  function getSelectedItemIds() {
    return [...selectedItemIds];
  }
  function getSelectedItemsCount() {
    return selectedItemIds.size;
  }
  function clearItemSelection() {
    selectedItemIds.clear();
  }
  var selectedItemIds;
  var init_itemSelectionState = __esm({
    "src/ui/features/items/itemSelectionState.ts"() {
      "use strict";
      selectedItemIds = /* @__PURE__ */ new Set();
    }
  });

  // src/ui/features/items/renderItemsPanel.ts
  function renderItemsPanel(containerEl) {
    const shell = createFloatingPanelShell("Items");
    const backButtonEl = document.createElement("button");
    backButtonEl.type = "button";
    backButtonEl.className = "aiw-panel-back-button";
    backButtonEl.textContent = "\u2190";
    shell.headerEl.prepend(backButtonEl);
    const selectedProjectId = getSelectedProjectId();
    const selectedItemId = getSelectedItemId();
    const loading = isItemsLoading();
    const error = getItemsError();
    const items = getItems();
    const isEmpty = items.length === 0;
    function renderItemsList(itemsList) {
      const listEl = document.createElement("div");
      listEl.className = "aiw-items-list";
      for (const item of itemsList) {
        const selectedItem = item.id === selectedItemId;
        const rowEl = createItemRow(item, selectedItem, isItemSelected(item.id));
        listEl.append(rowEl);
      }
      shell.bodyEl.append(listEl);
    }
    if (selectedProjectId === null) {
      const placeholderStateEl = createPanelState({
        variant: "placeholder",
        message: "Select a project to view items"
      });
      shell.bodyEl.append(placeholderStateEl);
    } else if (loading) {
      const loadingStateEl = createPanelState({
        variant: "loading",
        message: "Loading items..."
      });
      shell.bodyEl.append(loadingStateEl);
    } else if (error !== null) {
      const errorStateEl = createPanelState({
        variant: "error",
        message: error
      });
      shell.bodyEl.append(errorStateEl);
    } else if (isEmpty) {
      const emptyStateEl = createPanelState({
        variant: "empty",
        message: "No items yet"
      });
      shell.bodyEl.append(emptyStateEl);
    } else {
      renderItemsList(items);
    }
    if (selectedProjectId !== null) {
      const buildContextBarEl = document.createElement("div");
      buildContextBarEl.className = "aiw-build-context-bar";
      const selectedCount = getSelectedItemsCount();
      const buildContextButtonEl = document.createElement("button");
      buildContextButtonEl.type = "button";
      buildContextButtonEl.className = "aiw-build-context";
      buildContextButtonEl.textContent = `Build context (${selectedCount})`;
      buildContextBarEl.append(buildContextButtonEl);
      shell.panelEl.append(buildContextBarEl);
    }
    if (selectedProjectId !== null) {
      const formEl = document.createElement("div");
      formEl.className = "aiw-create-item-form";
      const titleInputEl = document.createElement("input");
      titleInputEl.className = "aiw-create-item-title";
      titleInputEl.type = "text";
      titleInputEl.placeholder = "Title";
      const contentInputEl = document.createElement("textarea");
      contentInputEl.className = "aiw-create-item-content";
      contentInputEl.placeholder = "Content";
      const buttonEl = document.createElement("button");
      buttonEl.className = "aiw-create-item-submit";
      buttonEl.type = "button";
      buttonEl.textContent = "Add";
      formEl.append(titleInputEl, contentInputEl, buttonEl);
      shell.panelEl.append(formEl);
    }
    containerEl.append(shell.panelEl);
  }
  var init_renderItemsPanel = __esm({
    "src/ui/features/items/renderItemsPanel.ts"() {
      "use strict";
      init_createFloatingPanelShell();
      init_createItemRow();
      init_createPanelState();
      init_itemsState();
      init_itemSelectionState();
      init_sessionState();
    }
  });

  // src/ui/features/items/renderItemDetailPanel.ts
  function renderItemDetailPanel(containerEl) {
    const shell = createFloatingPanelShell("Item Detail");
    const backButtonEl = document.createElement("button");
    backButtonEl.type = "button";
    backButtonEl.className = "aiw-panel-back-button";
    backButtonEl.textContent = "\u2190";
    shell.headerEl.prepend(backButtonEl);
    const selectedItemId = getSelectedItemId();
    const items = getItems();
    const itemObject = items.find((item) => item.id === selectedItemId);
    if (!itemObject) {
      const placeholderStateEl = createPanelState({
        variant: "placeholder",
        message: "Item not found"
      });
      shell.bodyEl.append(placeholderStateEl);
    }
    if (itemObject !== void 0) {
      const formEl = document.createElement("div");
      formEl.className = "aiw-item-detail-form";
      const titleInputEl = document.createElement("input");
      titleInputEl.className = "aiw-item-detail-title";
      titleInputEl.type = "text";
      titleInputEl.value = itemObject.title;
      const contentInputEl = document.createElement("textarea");
      contentInputEl.className = "aiw-item-detail-content";
      contentInputEl.value = itemObject.content;
      const buttonEl = document.createElement("button");
      buttonEl.className = "aiw-item-detail-save";
      buttonEl.type = "button";
      buttonEl.textContent = "Save";
      buttonEl.dataset.itemId = itemObject.id;
      formEl.append(titleInputEl, contentInputEl, buttonEl);
      shell.panelEl.append(formEl);
    }
    containerEl.append(shell.panelEl);
  }
  var init_renderItemDetailPanel = __esm({
    "src/ui/features/items/renderItemDetailPanel.ts"() {
      "use strict";
      init_sessionState();
      init_createFloatingPanelShell();
      init_createPanelState();
      init_itemsState();
    }
  });

  // src/ui/features/backup/renderBackupPanel.ts
  function renderBackupPanel(containerEl) {
    const shell = createFloatingPanelShell("Backup");
    const sectionEl = document.createElement("div");
    sectionEl.className = "aiw-backup-section";
    const descriptionParagraphEl = document.createElement("p");
    descriptionParagraphEl.textContent = "Export all projects and items to a JSON file, or import a backup to replace everything.";
    sectionEl.append(descriptionParagraphEl);
    const actionsEl = document.createElement("div");
    actionsEl.className = "aiw-backup-actions";
    const exportButtonEl = document.createElement("button");
    exportButtonEl.type = "button";
    exportButtonEl.className = "aiw-backup-export";
    exportButtonEl.textContent = "Export backup";
    actionsEl.append(exportButtonEl);
    const importButtonEl = document.createElement("button");
    importButtonEl.type = "button";
    importButtonEl.className = "aiw-backup-import";
    importButtonEl.textContent = "Import backup";
    actionsEl.append(importButtonEl);
    sectionEl.append(actionsEl);
    shell.panelEl.append(sectionEl);
    containerEl.append(shell.panelEl);
  }
  var init_renderBackupPanel = __esm({
    "src/ui/features/backup/renderBackupPanel.ts"() {
      "use strict";
      init_createFloatingPanelShell();
    }
  });

  // src/ui/core/renderFloatingPanels.ts
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
      case "items":
        renderItemsPanel(containerEl);
        break;
      case "itemDetail":
        renderItemDetailPanel(containerEl);
        break;
      case "backup":
        renderBackupPanel(containerEl);
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
    "src/ui/core/renderFloatingPanels.ts"() {
      "use strict";
      init_floatingUiState();
      init_renderProjectsPanel();
      init_renderSearchPanel();
      init_renderItemsPanel();
      init_renderItemDetailPanel();
      init_renderBackupPanel();
    }
  });

  // src/ui/shared/toErrorMessage.ts
  function toErrorMessage(error, fallback) {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }
    return fallback;
  }
  var init_toErrorMessage = __esm({
    "src/ui/shared/toErrorMessage.ts"() {
      "use strict";
    }
  });

  // src/ui/features/projects/projectsController.ts
  function createProjectsController(dependencies) {
    const { onStateChange, notify, itemsController } = dependencies;
    async function load() {
      try {
        await loadProjects();
      } finally {
        onStateChange();
      }
    }
    function selectProject(projectId) {
      setSelectedProjectId(projectId);
      openPanel("items");
      itemsController.clearSelection();
      itemsController.load(projectId);
    }
    async function create(name) {
      try {
        await createProject(name);
      } catch (error) {
        notify(toErrorMessage(error, "Couldn't create project."));
        return;
      }
      await loadProjects();
      onStateChange();
    }
    async function renameProject2(projectId, name) {
      try {
        await renameProject(projectId, name);
      } catch (error) {
        notify(toErrorMessage(error, "Couldn't rename project."));
        return;
      }
      await loadProjects();
      onStateChange();
    }
    async function deleteProject2(projectId) {
      const selectedProjectId = getSelectedProjectId();
      try {
        await deleteProjectCascade(projectId);
      } catch (error) {
        notify(toErrorMessage(error, "Couldn't delete project."));
        return;
      }
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
        openPanel("projects");
      }
      await loadProjects();
      onStateChange();
    }
    return {
      load,
      selectProject,
      create,
      renameProject: renameProject2,
      deleteProject: deleteProject2
    };
  }
  var init_projectsController = __esm({
    "src/ui/features/projects/projectsController.ts"() {
      "use strict";
      init_floatingUiState();
      init_sessionState();
      init_loadProjects();
      init_storage();
      init_toErrorMessage();
    }
  });

  // src/ui/core/eventBindings.ts
  var asListener;
  var init_eventBindings = __esm({
    "src/ui/core/eventBindings.ts"() {
      "use strict";
      asListener = (handler) => handler;
    }
  });

  // src/ui/features/projects/projectsHandlers.ts
  function createProjectsHandlers(deps) {
    function handleSelectProject(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest(PROJECT_RENAME_SELECTOR)) return;
      if (target.closest(PROJECT_DELETE_SELECTOR)) return;
      if (target.closest(PROJECT_RENAME_INPUT_SELECTOR)) return;
      const row = target.closest(PROJECT_ROW_SELECTOR);
      if (!(row instanceof HTMLElement)) {
        return;
      }
      const projectId = row.dataset[PROJECT_ID_DATASET_KEY];
      if (!projectId) {
        return;
      }
      deps.projectsController.selectProject(projectId);
    }
    async function handleCreateProject(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const submitButton = target.closest(PROJECT_CREATE_BUTTON_SELECTOR);
      if (!(submitButton instanceof HTMLButtonElement)) {
        return;
      }
      const input = deps.panelsEl.querySelector(".aiw-create-project-input");
      if (!(input instanceof HTMLInputElement)) {
        return;
      }
      const trimmedNewProjectName = input.value.trim();
      if (trimmedNewProjectName.length === 0) {
        deps.notify("Project name can't be empty");
        return;
      }
      await deps.projectsController.create(trimmedNewProjectName);
    }
    function handleRenameProject(event) {
      let committed = false;
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const renameButton = target.closest(PROJECT_RENAME_SELECTOR);
      if (!(renameButton instanceof HTMLButtonElement)) {
        return;
      }
      const projectId = renameButton.dataset[PROJECT_ID_DATASET_KEY];
      if (!projectId) {
        return;
      }
      const row = renameButton.closest(PROJECT_ROW_SELECTOR);
      if (!(row instanceof HTMLElement)) {
        return;
      }
      const span = row.querySelector(".aiw-project-text");
      if (!(span instanceof HTMLSpanElement)) {
        return;
      }
      const currentName = span.textContent ?? "";
      const renameInputEl = document.createElement("input");
      renameInputEl.value = currentName;
      renameInputEl.className = PROJECT_RENAME_INPUT_CLASS;
      span.replaceWith(renameInputEl);
      renameInputEl.focus();
      renameInputEl.select();
      renameInputEl.addEventListener("keydown", async (event2) => {
        if (event2.key === "Enter") {
          committed = true;
          const trimmedValue = renameInputEl.value.trim();
          if (trimmedValue) {
            await deps.projectsController.renameProject(projectId, trimmedValue);
          } else {
            deps.requestRender();
          }
        }
        if (event2.key === "Escape") {
          committed = true;
          deps.requestRender();
        }
      });
      renameInputEl.addEventListener("blur", async () => {
        if (committed) return;
        const trimmedValue = renameInputEl.value.trim();
        if (trimmedValue && trimmedValue !== currentName) {
          await deps.projectsController.renameProject(projectId, trimmedValue);
        } else {
          deps.requestRender();
        }
      });
    }
    async function handleDeleteProject(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const deleteButton = target.closest(PROJECT_DELETE_SELECTOR);
      if (!(deleteButton instanceof HTMLElement)) {
        return;
      }
      const projectId = deleteButton.dataset[PROJECT_ID_DATASET_KEY];
      if (!projectId) {
        return;
      }
      if (!window.confirm("Delete this project and all its items?")) return;
      await deps.projectsController.deleteProject(projectId);
    }
    const eventBindings = [
      [deps.panelsEl, "click", asListener(handleSelectProject)],
      [deps.panelsEl, "click", asListener(handleCreateProject)],
      [deps.panelsEl, "click", asListener(handleRenameProject)],
      [deps.panelsEl, "click", asListener(handleDeleteProject)]
    ];
    return eventBindings;
  }
  var PROJECT_ROW_SELECTOR, PROJECT_DELETE_SELECTOR, PROJECT_ID_DATASET_KEY, PROJECT_CREATE_BUTTON_SELECTOR, PROJECT_RENAME_SELECTOR, PROJECT_RENAME_INPUT_CLASS, PROJECT_RENAME_INPUT_SELECTOR;
  var init_projectsHandlers = __esm({
    "src/ui/features/projects/projectsHandlers.ts"() {
      "use strict";
      init_eventBindings();
      PROJECT_ROW_SELECTOR = ".aiw-project-row";
      PROJECT_DELETE_SELECTOR = ".aiw-project-delete";
      PROJECT_ID_DATASET_KEY = "projectId";
      PROJECT_CREATE_BUTTON_SELECTOR = ".aiw-create-project-submit";
      PROJECT_RENAME_SELECTOR = ".aiw-project-rename";
      PROJECT_RENAME_INPUT_CLASS = "aiw-project-rename-input";
      PROJECT_RENAME_INPUT_SELECTOR = `.${PROJECT_RENAME_INPUT_CLASS}`;
    }
  });

  // src/ui/features/items/loadItems.ts
  async function loadItems(projectId) {
    setItemsLoading(true);
    setItemsError(null);
    setItems([]);
    try {
      const items = await listItemsByProject(projectId);
      setItems(items);
    } catch (error) {
      setItems([]);
      if (error instanceof Error) {
        setItemsError(error.message);
      } else {
        setItemsError("Failed to load items.");
      }
    } finally {
      setItemsLoading(false);
    }
  }
  var init_loadItems = __esm({
    "src/ui/features/items/loadItems.ts"() {
      "use strict";
      init_storage();
      init_itemsState();
    }
  });

  // src/ui/features/items/buildContextPack.ts
  function buildContextPack(projectName, items) {
    const lines = [];
    lines.push(`# Context Pack \u2014 ${projectName}`);
    lines.push("");
    for (const group of GROUPS) {
      const groupItems = items.filter((item) => item.type === group.type).slice().sort((a, b) => {
        const createdAtDiff = a.createdAt - b.createdAt;
        if (createdAtDiff !== 0) return createdAtDiff;
        return a.id.localeCompare(b.id);
      });
      if (groupItems.length === 0) continue;
      lines.push(`## ${group.label}`);
      lines.push("");
      for (const item of groupItems) {
        const title = item.title.trim().length > 0 ? item.title : "Untitled";
        lines.push(`### ${title}`);
        if (item.content.trim().length > 0) {
          lines.push(item.content);
        }
        lines.push("");
      }
    }
    return lines.join("\n").trim();
  }
  var GROUPS;
  var init_buildContextPack = __esm({
    "src/ui/features/items/buildContextPack.ts"() {
      "use strict";
      GROUPS = [
        { type: "note", label: "Notes" },
        { type: "snippet", label: "Snippets" },
        { type: "task", label: "Tasks" },
        { type: "link", label: "Links" }
      ];
    }
  });

  // src/ui/shared/copyToClipboard.ts
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      let textareaEl = null;
      try {
        textareaEl = document.createElement("textarea");
        textareaEl.value = text;
        textareaEl.style.position = "fixed";
        textareaEl.style.top = "0";
        textareaEl.style.opacity = "0";
        textareaEl.style.pointerEvents = "none";
        document.body.appendChild(textareaEl);
        textareaEl.focus();
        textareaEl.select();
        textareaEl.setSelectionRange(0, text.length);
        return document.execCommand("copy");
      } catch {
        return false;
      } finally {
        textareaEl?.remove();
      }
    }
  }
  var init_copyToClipboard = __esm({
    "src/ui/shared/copyToClipboard.ts"() {
      "use strict";
    }
  });

  // src/ui/features/items/itemsController.ts
  function createItemsController(dependencies) {
    const { onStateChange, notify } = dependencies;
    async function load(projectId) {
      setItemsLoading(true);
      onStateChange();
      try {
        await loadItems(projectId);
      } finally {
        onStateChange();
      }
    }
    function selectItem(itemId) {
      setSelectedItemId(itemId);
      openPanel("itemDetail");
      onStateChange();
    }
    function toggleSelection(itemId) {
      toggleItemSelection(itemId);
      onStateChange();
    }
    function clearSelection() {
      clearItemSelection();
    }
    async function create(projectId, title, content, type = "note") {
      try {
        await createItem(projectId, type, title, content, {
          createdFrom: "manual"
        });
      } catch (error) {
        notify(toErrorMessage(error, "Couldn't create item."));
        return;
      }
      await loadItems(projectId);
      onStateChange();
    }
    async function updateItem2(itemId, title, content) {
      const selectedProjectId = getSelectedProjectId();
      if (selectedProjectId === null) {
        return;
      }
      const partialUpdate = {};
      if (title !== void 0) partialUpdate.title = title;
      if (content !== void 0) partialUpdate.content = content;
      try {
        await updateItem(itemId, partialUpdate);
      } catch (error) {
        notify(toErrorMessage(error, "Couldn't save item."));
        return;
      }
      await loadItems(selectedProjectId);
      onStateChange();
    }
    async function copyContextPack(projectName) {
      const selectedIds = getSelectedItemIds();
      if (selectedIds.length === 0) {
        notify("Select at least one item");
        return;
      }
      const selectedIdSet = new Set(selectedIds);
      const selectedItems = getItems().filter(
        (item) => selectedIdSet.has(item.id)
      );
      if (selectedItems.length === 0) {
        notify("Select at least one item");
        return;
      }
      const contextPack = buildContextPack(projectName, selectedItems);
      const copied = await copyToClipboard(contextPack);
      notify(
        copied ? "Context pack copied to clipboard" : "Couldn't copy to clipboard"
      );
    }
    async function deleteItem2(itemId, projectId) {
      const selectedItemId = getSelectedItemId();
      try {
        await deleteItem(itemId);
      } catch (error) {
        notify(toErrorMessage(error, "Couldn't delete item."));
        return;
      }
      if (selectedItemId === itemId) {
        setSelectedItemId(null);
      }
      await loadItems(projectId);
      onStateChange();
    }
    return {
      load,
      selectItem,
      toggleSelection,
      clearSelection,
      create,
      updateItem: updateItem2,
      copyContextPack,
      deleteItem: deleteItem2
    };
  }
  var init_itemsController = __esm({
    "src/ui/features/items/itemsController.ts"() {
      "use strict";
      init_itemsState();
      init_loadItems();
      init_storage();
      init_sessionState();
      init_floatingUiState();
      init_toErrorMessage();
      init_itemSelectionState();
      init_buildContextPack();
      init_copyToClipboard();
    }
  });

  // src/ui/features/items/itemsHandlers.ts
  function createItemsHandlers(deps) {
    function handleSelectItem(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest(ITEM_SELECT_SELECTOR)) return;
      if (target.closest(ITEM_DELETE_SELECTOR)) return;
      const row = target.closest(ITEM_ROW_SELECTOR);
      if (!(row instanceof HTMLElement)) {
        return;
      }
      const itemId = row.dataset[ITEM_ID_DATASET_KEY];
      if (!itemId) {
        return;
      }
      deps.itemsController.selectItem(itemId);
    }
    function handleToggleItemSelection(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const checkBox = target.closest(ITEM_SELECT_SELECTOR);
      if (!(checkBox instanceof HTMLInputElement)) {
        return;
      }
      const itemId = checkBox.dataset[ITEM_ID_DATASET_KEY];
      if (!itemId) {
        return;
      }
      deps.itemsController.toggleSelection(itemId);
    }
    async function handleCreateItem(event) {
      const selectedProjectId = getSelectedProjectId();
      if (selectedProjectId === null) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const submitButton = target.closest(ITEM_CREATE_BUTTON_SELECTOR);
      if (!(submitButton instanceof HTMLButtonElement)) {
        return;
      }
      const titleInput = deps.panelsEl.querySelector(ITEM_CREATE_TITLE_SELECTOR);
      const contentInput = deps.panelsEl.querySelector(
        ITEM_CREATE_CONTENT_SELECTOR
      );
      if (!(titleInput instanceof HTMLInputElement) || !(contentInput instanceof HTMLTextAreaElement)) {
        return;
      }
      const trimmedItemTitle = titleInput.value.trim();
      const itemContent = contentInput.value;
      if (trimmedItemTitle.length === 0 && itemContent.trim().length === 0) {
        deps.notify("Add a title or some content");
        return;
      }
      await deps.itemsController.create(
        selectedProjectId,
        trimmedItemTitle,
        itemContent
      );
    }
    async function handleUpdateItem(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const saveButton = target.closest(ITEM_DETAIL_SAVE_SELECTOR);
      if (!(saveButton instanceof HTMLButtonElement)) {
        return;
      }
      const itemId = saveButton.dataset[ITEM_ID_DATASET_KEY];
      if (!itemId) {
        return;
      }
      const titleInput = deps.panelsEl.querySelector(ITEM_DETAIL_TITLE_SELECTOR);
      if (!(titleInput instanceof HTMLInputElement)) {
        return;
      }
      const contentInput = deps.panelsEl.querySelector(
        ITEM_DETAIL_CONTENT_SELECTOR
      );
      if (!(contentInput instanceof HTMLTextAreaElement)) {
        return;
      }
      const trimmedItemTitle = titleInput.value.trim();
      const itemContent = contentInput.value;
      if (trimmedItemTitle.length === 0 && itemContent.trim().length === 0) {
        deps.notify("Add a title or some content");
        return;
      }
      await deps.itemsController.updateItem(
        itemId,
        trimmedItemTitle,
        itemContent
      );
    }
    async function handleBuildContext(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const buildButton = target.closest(ITEM_BUILD_CONTEXT_SELECTOR);
      if (!(buildButton instanceof HTMLButtonElement)) {
        return;
      }
      const selectedProjectId = getSelectedProjectId();
      if (selectedProjectId === null) {
        return;
      }
      const projectName = deps.resolveProjectName(selectedProjectId);
      await deps.itemsController.copyContextPack(projectName);
    }
    async function handleDeleteItem(event) {
      const selectedProjectId = getSelectedProjectId();
      if (selectedProjectId === null) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const deleteButton = target.closest(ITEM_DELETE_SELECTOR);
      if (!(deleteButton instanceof HTMLElement)) {
        return;
      }
      const itemId = deleteButton.dataset[ITEM_ID_DATASET_KEY];
      if (!itemId) {
        return;
      }
      if (!window.confirm("Delete this item?")) return;
      await deps.itemsController.deleteItem(itemId, selectedProjectId);
    }
    const eventBindings = [
      [deps.panelsEl, "click", asListener(handleSelectItem)],
      [deps.panelsEl, "click", asListener(handleToggleItemSelection)],
      [deps.panelsEl, "click", asListener(handleCreateItem)],
      [deps.panelsEl, "click", asListener(handleUpdateItem)],
      [deps.panelsEl, "click", asListener(handleBuildContext)],
      [deps.panelsEl, "click", asListener(handleDeleteItem)]
    ];
    return eventBindings;
  }
  var ITEM_ROW_SELECTOR, ITEM_SELECT_SELECTOR, ITEM_DELETE_SELECTOR, ITEM_ID_DATASET_KEY, ITEM_CREATE_BUTTON_SELECTOR, ITEM_CREATE_TITLE_SELECTOR, ITEM_CREATE_CONTENT_SELECTOR, ITEM_DETAIL_SAVE_SELECTOR, ITEM_DETAIL_TITLE_SELECTOR, ITEM_DETAIL_CONTENT_SELECTOR, ITEM_BUILD_CONTEXT_SELECTOR;
  var init_itemsHandlers = __esm({
    "src/ui/features/items/itemsHandlers.ts"() {
      "use strict";
      init_eventBindings();
      init_sessionState();
      ITEM_ROW_SELECTOR = ".aiw-item-row";
      ITEM_SELECT_SELECTOR = ".aiw-item-select";
      ITEM_DELETE_SELECTOR = ".aiw-item-delete";
      ITEM_ID_DATASET_KEY = "itemId";
      ITEM_CREATE_BUTTON_SELECTOR = ".aiw-create-item-submit";
      ITEM_CREATE_TITLE_SELECTOR = ".aiw-create-item-title";
      ITEM_CREATE_CONTENT_SELECTOR = ".aiw-create-item-content";
      ITEM_DETAIL_SAVE_SELECTOR = ".aiw-item-detail-save";
      ITEM_DETAIL_TITLE_SELECTOR = ".aiw-item-detail-title";
      ITEM_DETAIL_CONTENT_SELECTOR = ".aiw-item-detail-content";
      ITEM_BUILD_CONTEXT_SELECTOR = ".aiw-build-context";
    }
  });

  // src/ui/features/backup/buildBackup.ts
  function buildBackup(snapshot, exportedAt) {
    return {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt,
      projects: snapshot.projects,
      items: snapshot.items
    };
  }
  var BACKUP_SCHEMA_VERSION;
  var init_buildBackup = __esm({
    "src/ui/features/backup/buildBackup.ts"() {
      "use strict";
      BACKUP_SCHEMA_VERSION = 1;
    }
  });

  // src/models/item.ts
  var ITEM_TYPES;
  var init_item = __esm({
    "src/models/item.ts"() {
      "use strict";
      ITEM_TYPES = ["note", "snippet", "task", "link"];
    }
  });

  // src/ui/features/backup/parseBackup.ts
  function assertValidProjects(projects) {
    for (const project of projects) {
      if (typeof project !== "object" || project === null) {
        throw new Error("Each project must be an object.");
      }
      const candidate = project;
      if (typeof candidate.id !== "string") {
        throw new Error("Each project needs a string id.");
      }
      if (typeof candidate.name !== "string") {
        throw new Error("Each project needs a string name.");
      }
    }
  }
  function assertValidItems(items) {
    for (const item of items) {
      if (typeof item !== "object" || item === null) {
        throw new Error("Each item must be an object.");
      }
      const candidate = item;
      if (typeof candidate.id !== "string") {
        throw new Error("Each item needs a string id.");
      }
      if (typeof candidate.projectId !== "string") {
        throw new Error("Each item needs a string projectId.");
      }
      if (!ITEM_TYPES.includes(candidate.type)) {
        throw new Error(`Unknown item type: ${String(candidate.type)}`);
      }
    }
  }
  function parseBackup(jsonText) {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error("This file isn't valid JSON.");
    }
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("This backup file is malformed.");
    }
    const doc = parsed;
    if (doc.schemaVersion !== BACKUP_SCHEMA_VERSION) {
      throw new Error("Unsupported backup version.");
    }
    if (!Array.isArray(doc.projects) || !Array.isArray(doc.items)) {
      throw new Error("This backup file is missing its projects or items.");
    }
    assertValidProjects(doc.projects);
    assertValidItems(doc.items);
    return doc;
  }
  var init_parseBackup = __esm({
    "src/ui/features/backup/parseBackup.ts"() {
      "use strict";
      init_item();
      init_buildBackup();
    }
  });

  // src/ui/shared/downloadJson.ts
  function downloadJson(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  var init_downloadJson = __esm({
    "src/ui/shared/downloadJson.ts"() {
      "use strict";
    }
  });

  // src/ui/shared/pickJsonFile.ts
  function pickJsonFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.addEventListener("cancel", () => {
        resolve(null);
      });
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        try {
          const text = await file.text();
          resolve(text);
        } catch {
          reject(new Error("Couldn't read the selected file."));
        }
      });
      input.click();
    });
  }
  var init_pickJsonFile = __esm({
    "src/ui/shared/pickJsonFile.ts"() {
      "use strict";
    }
  });

  // src/ui/features/backup/backupController.ts
  function createBackupController(dependencies) {
    async function exportBackup() {
      try {
        const snapshot = await exportAllData();
        const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
        const backup = buildBackup(snapshot, exportedAt);
        const safeStamp = exportedAt.replace(/[:.]/g, "-");
        const filename = `ai-workspace-backup-${safeStamp}.json`;
        downloadJson(backup, filename);
        dependencies.notify("Backup exported");
      } catch (error) {
        dependencies.notify(toErrorMessage(error, "Couldn't export backup."));
      }
    }
    async function importBackup() {
      let jsonText;
      try {
        jsonText = await pickJsonFile();
      } catch (error) {
        dependencies.notify(
          toErrorMessage(error, "Couldn't read the selected file.")
        );
        return;
      }
      if (jsonText === null) {
        return;
      }
      let backup;
      try {
        backup = parseBackup(jsonText);
      } catch (error) {
        dependencies.notify(
          toErrorMessage(error, "Couldn't read that backup file.")
        );
        return;
      }
      const confirmed = window.confirm(
        "Importing will REPLACE all current projects and items with this backup. This can't be undone. Continue?"
      );
      if (!confirmed) {
        return;
      }
      try {
        await replaceAllData2(backup.projects, backup.items);
      } catch (error) {
        dependencies.notify(toErrorMessage(error, "Couldn't import backup."));
        return;
      }
      dependencies.notify("Backup imported");
      await dependencies.onImported();
    }
    return { exportBackup, importBackup };
  }
  var init_backupController = __esm({
    "src/ui/features/backup/backupController.ts"() {
      "use strict";
      init_storage();
      init_buildBackup();
      init_parseBackup();
      init_downloadJson();
      init_pickJsonFile();
      init_toErrorMessage();
    }
  });

  // src/ui/features/backup/backupHandlers.ts
  function createBackupHandlers(deps) {
    async function handleExportBackup(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const exportButton = target.closest(BACKUP_EXPORT_SELECTOR);
      if (!(exportButton instanceof HTMLElement)) {
        return;
      }
      await deps.backupController.exportBackup();
    }
    async function handleImportBackup(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const importButton = target.closest(BACKUP_IMPORT_SELECTOR);
      if (!(importButton instanceof HTMLElement)) {
        return;
      }
      await deps.backupController.importBackup();
    }
    const eventBindings = [
      [deps.panelsEl, "click", asListener(handleExportBackup)],
      [deps.panelsEl, "click", asListener(handleImportBackup)]
    ];
    return eventBindings;
  }
  var BACKUP_EXPORT_SELECTOR, BACKUP_IMPORT_SELECTOR;
  var init_backupHandlers = __esm({
    "src/ui/features/backup/backupHandlers.ts"() {
      "use strict";
      init_eventBindings();
      BACKUP_EXPORT_SELECTOR = ".aiw-backup-export";
      BACKUP_IMPORT_SELECTOR = ".aiw-backup-import";
    }
  });

  // src/ui/core/orbHandlers.ts
  function createOrbHandlers(deps) {
    function setOrbExpanded() {
      expandOrb();
      deps.requestRender();
    }
    function setOrbCollapsed() {
      collapseOrb();
      deps.requestRender();
    }
    function toggleOrbVisibility() {
      const expanded = isOrbExpanded();
      if (expanded) {
        setOrbCollapsed();
      } else {
        setOrbExpanded();
      }
    }
    function handleDocumentPointerDown(event) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const clickedInsideFloatingUi = deps.rootEl.contains(target);
      if (clickedInsideFloatingUi) {
        return;
      }
      if (deps.hasActiveInlineEdit()) {
        return;
      }
      setOrbCollapsed();
    }
    function handleBackButtonClick(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const backButton = target.closest(PANEL_BACK_BUTTON_SELECTOR);
      if (!(backButton instanceof HTMLElement)) {
        return;
      }
      const currentPanel = getActivePanel();
      if (currentPanel === "itemDetail") {
        openPanel("items");
      } else {
        openPanel("projects");
      }
      setSelectedItemId(null);
      deps.requestRender();
    }
    function handleProjectsUpdated() {
      deps.requestRender();
    }
    const eventBindings = [
      [deps.orbButtonEl, "click", asListener(toggleOrbVisibility)],
      [deps.panelsEl, "click", asListener(handleBackButtonClick)],
      [document, "pointerdown", asListener(handleDocumentPointerDown)],
      [document, "aiw:projects-updated", asListener(handleProjectsUpdated)]
    ];
    return eventBindings;
  }
  var PANEL_BACK_BUTTON_SELECTOR;
  var init_orbHandlers = __esm({
    "src/ui/core/orbHandlers.ts"() {
      "use strict";
      init_eventBindings();
      init_floatingUiState();
      init_sessionState();
      PANEL_BACK_BUTTON_SELECTOR = ".aiw-panel-back-button";
    }
  });

  // src/ui/core/floatingController.ts
  function initFloatingController(rootEl) {
    const dom = createFloatingDom(rootEl);
    const itemsController = createItemsController({
      onStateChange: renderUi,
      notify: showToast
    });
    const projectsController = createProjectsController({
      onStateChange: renderUi,
      notify: showToast,
      itemsController
    });
    const backupController = createBackupController({
      notify: showToast,
      onImported: reloadAfterImport
    });
    const orbBindings = createOrbHandlers({
      rootEl: dom.rootEl,
      panelsEl: dom.orbPanelsEl,
      orbButtonEl: dom.orbButtonEl,
      requestRender: renderUi,
      hasActiveInlineEdit
    });
    const projectsBindings = createProjectsHandlers({
      panelsEl: dom.orbPanelsEl,
      projectsController,
      notify: showToast,
      requestRender: renderUi
    });
    const itemsBindings = createItemsHandlers({
      panelsEl: dom.orbPanelsEl,
      itemsController,
      notify: showToast,
      resolveProjectName
    });
    const backupBindings = createBackupHandlers({
      panelsEl: dom.orbPanelsEl,
      backupController
    });
    const actionsContext = createOrbActionContext();
    renderUi();
    void projectsController.load();
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
    function hasActiveInlineEdit() {
      const activeProjectRenameInput = dom.orbPanelsEl.querySelector(
        PROJECT_RENAME_INPUT_SELECTOR
      );
      return activeProjectRenameInput instanceof HTMLInputElement;
    }
    function resolveProjectName(projectId) {
      const project = getProjects().find(
        (candidate) => candidate.id === projectId
      );
      return project ? project.name : "Untitled project";
    }
    async function reloadAfterImport() {
      itemsController.clearSelection();
      setSelectedItemId(null);
      setSelectedProjectId(null);
      openPanel("projects");
      await projectsController.load();
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
    const eventBindings = [
      ...orbBindings,
      ...projectsBindings,
      ...itemsBindings,
      ...backupBindings
    ];
    for (const [target, type, listener] of eventBindings) {
      target.addEventListener(type, listener);
    }
    return function destroyFloatingController() {
      for (const [target, type, listener] of eventBindings) {
        target.removeEventListener(type, listener);
      }
    };
  }
  var init_floatingController = __esm({
    "src/ui/core/floatingController.ts"() {
      "use strict";
      init_floatingUiState();
      init_sessionState();
      init_projectsState();
      init_floatingDom();
      init_orbActionRouter();
      init_orbActions();
      init_renderOrbActions();
      init_renderFloatingPanels();
      init_projectsController();
      init_projectsHandlers();
      init_itemsController();
      init_itemsHandlers();
      init_backupController();
      init_showToast();
      init_backupHandlers();
      init_orbHandlers();
    }
  });

  // src/ui/core/mountManager.ts
  async function mountFloatingUi() {
    if (isMounting) return;
    if (document.getElementById(FLOATING_ROOT_ID)) return;
    if (!injectAssets) return;
    isMounting = true;
    try {
      if (destroyController) {
        destroyController();
        destroyController = null;
      }
      const root = await injectAssets();
      destroyController = initFloatingController(root);
    } catch (error) {
      console.error("[AIW] floating UI mount failed:", error);
    } finally {
      isMounting = false;
    }
  }
  async function startFloatingUi(inject) {
    injectAssets = inject;
    await mountFloatingUi();
    if (!rootObserver) {
      rootObserver = new MutationObserver(() => {
        if (!document.getElementById(FLOATING_ROOT_ID)) {
          void mountFloatingUi();
        }
      });
    }
    const observeTarget = document.body ?? document.documentElement;
    rootObserver.observe(observeTarget, { childList: true });
  }
  var FLOATING_ROOT_ID, injectAssets, destroyController, isMounting, rootObserver;
  var init_mountManager = __esm({
    "src/ui/core/mountManager.ts"() {
      "use strict";
      init_floatingController();
      FLOATING_ROOT_ID = "aiw-floating-root";
      injectAssets = null;
      destroyController = null;
      isMounting = false;
      rootObserver = null;
    }
  });

  // src/content/bootstrap.ts
  var require_bootstrap = __commonJS({
    "src/content/bootstrap.ts"() {
      init_storage();
      init_captureHandler();
      init_injectFloatingUi();
      init_mountManager();
      var ENABLE_DEV_SEED = false;
      function initMessageListener() {
        chrome.runtime.onMessage.addListener((rawMessage) => {
          const message = rawMessage;
          switch (message.type) {
            case "CAPTURE_SELECTION":
              handleCaptureSelection(message.selectionText, message.sourceUrl);
              break;
          }
        });
      }
      async function seedDevDataOnce() {
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
              createdFrom: "manual"
            }
          );
          const multiItemProject = await createProject("Multi Item Project");
          await createItem(
            multiItemProject.id,
            "note",
            "Research Notes",
            "Collected findings from testing.",
            {
              createdFrom: "manual"
            }
          );
          await createItem(
            multiItemProject.id,
            "task",
            "Implement Selection",
            "Add selectedItemId runtime state.",
            {
              createdFrom: "manual"
            }
          );
          await createItem(
            multiItemProject.id,
            "link",
            "Architecture Reference",
            "https://example.com",
            {
              sourceUrl: "https://example.com",
              createdFrom: "selection"
            }
          );
          await chrome.storage.local.set({ aiw_dev_seeded: true });
        } catch (error) {
          console.warn("[AIW] Dev seed failed (non-fatal):", error);
        }
      }
      async function bootstrap() {
        await startFloatingUi(injectFloatingAssets);
        initMessageListener();
        if (ENABLE_DEV_SEED) {
          await seedDevDataOnce();
        }
      }
      var AIW_GLOBAL = globalThis;
      if (AIW_GLOBAL.__aiwContentBooted) {
        console.debug(
          "[AIW] content script already booted in this document \u2014 skipping duplicate bootstrap."
        );
      } else {
        AIW_GLOBAL.__aiwContentBooted = true;
        bootstrap().catch((err) => {
          console.error("[AIW] floating UI bootstrap failed:", err);
        });
      }
    }
  });
  require_bootstrap();
})();
//# sourceMappingURL=bootstrap.js.map
