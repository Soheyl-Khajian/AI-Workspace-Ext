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
    if (title == null) {
      throw new Error("Item title is required (null/undefined)");
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      throw new Error("Item title cannot be empty");
    }
    if (content == null) {
      throw new Error("Item content is required (null/undefined)");
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Item content cannot be empty");
    }
    if (!meta) {
      throw new Error("Item meta is required");
    }
    const item = {
      id: crypto.randomUUID(),
      projectId: trimmedProjectId,
      type,
      title: trimmedTitle,
      content: trimmedContent,
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
  var init_storage = __esm({
    "src/storage/index.ts"() {
      "use strict";
      init_projectsRepo();
      init_itemsRepo();
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

  // src/ui/core/floatingUiState.ts
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
  function openPanel(panel) {
    state.activePanel = panel;
    state.orbExpanded = true;
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
    "src/ui/core/floatingUiState.ts"() {
      "use strict";
      state = {
        orbExpanded: false,
        activePanel: null
      };
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
    const rowEl = document.createElement("button");
    rowEl.type = "button";
    rowEl.className = "aiw-project-row";
    rowEl.textContent = project.name;
    rowEl.dataset.projectId = project.id;
    if (selected) {
      rowEl.classList.add("aiw-project-row--selected");
    }
    return rowEl;
  }
  var init_createProjectRow = __esm({
    "src/ui/features/projects/createProjectRow.ts"() {
      "use strict";
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

  // src/ui/core/sessionState.ts
  function getSelectedProjectId() {
    return state3.selectedProjectId;
  }
  function getSelectedItemId() {
    return state3.selectedItemId;
  }
  function setSelectedProjectId(id) {
    state3.selectedProjectId = id;
  }
  function setSelectedItemId(id) {
    state3.selectedItemId = id;
  }
  var state3;
  var init_sessionState = __esm({
    "src/ui/core/sessionState.ts"() {
      "use strict";
      state3 = {
        selectedProjectId: null,
        selectedItemId: null
      };
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

  // src/ui/features/capture/renderCapturePanel.ts
  function renderCapturePanel(containerEl) {
    const shell = createFloatingPanelShell("Capture");
    const panelStateEl = createPanelState({
      variant: "placeholder",
      message: "Nothing here yet"
    });
    shell.bodyEl.append(panelStateEl);
    containerEl.append(shell.panelEl);
  }
  var init_renderCapturePanel = __esm({
    "src/ui/features/capture/renderCapturePanel.ts"() {
      "use strict";
      init_createFloatingPanelShell();
      init_createPanelState();
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
  function createItemRow(item, selected) {
    const rowEl = document.createElement("button");
    rowEl.type = "button";
    rowEl.className = "aiw-item-row";
    rowEl.textContent = item.title;
    rowEl.dataset.itemId = item.id;
    if (selected) {
      rowEl.classList.add("aiw-item-row--selected");
    }
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
        const rowEl = createItemRow(item, selectedItem);
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
      init_sessionState();
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
    "src/ui/core/renderFloatingPanels.ts"() {
      "use strict";
      init_floatingUiState();
      init_renderProjectsPanel();
      init_renderCapturePanel();
      init_renderSearchPanel();
      init_renderItemsPanel();
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

  // src/ui/features/projects/projectsController.ts
  function createProjectsController(dependencies) {
    const { onStateChange, itemsController } = dependencies;
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
      itemsController.load(projectId);
    }
    async function create(name) {
      try {
        await createProject(name);
        await loadProjects();
      } finally {
        onStateChange();
      }
    }
    return {
      load,
      selectProject,
      create
    };
  }
  var init_projectsController = __esm({
    "src/ui/features/projects/projectsController.ts"() {
      "use strict";
      init_floatingUiState();
      init_sessionState();
      init_loadProjects();
      init_storage();
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

  // src/ui/features/items/itemsController.ts
  function createItemsController(dependencies) {
    const { onStateChange } = dependencies;
    async function load(projectId) {
      setItemsLoading(true);
      onStateChange();
      try {
        await loadItems(projectId);
      } finally {
        onStateChange();
      }
    }
    async function create(projectId, title, content, type = "note") {
      try {
        await createItem(projectId, type, title, content, {
          createdFrom: "manual"
        });
        await loadItems(projectId);
      } finally {
        onStateChange();
      }
    }
    return {
      load,
      create
    };
  }
  var init_itemsController = __esm({
    "src/ui/features/items/itemsController.ts"() {
      "use strict";
      init_itemsState();
      init_loadItems();
      init_storage();
    }
  });

  // src/ui/core/floatingController.ts
  function initFloatingController(rootEl) {
    const dom = createFloatingDom(rootEl);
    const itemsController = createItemsController({ onStateChange: renderUi });
    const projectsController = createProjectsController({
      onStateChange: renderUi,
      itemsController
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
    function handleProjectSelect(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const row = target.closest(PROJECT_ROW_SELECTOR);
      if (!(row instanceof HTMLElement)) {
        return;
      }
      const projectId = row.dataset[PROJECT_ID_DATASET_KEY];
      if (!projectId) {
        return;
      }
      projectsController.selectProject(projectId);
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
      const input = dom.orbPanelsEl.querySelector(".aiw-create-project-input");
      if (!(input instanceof HTMLInputElement)) {
        return;
      }
      const trimmedNewProjectName = input.value.trim();
      if (trimmedNewProjectName.length === 0) {
        return;
      }
      await projectsController.create(trimmedNewProjectName);
      input.value = "";
    }
    function handleItemSelect(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const row = target.closest(ITEM_ROW_SELECTOR);
      if (!(row instanceof HTMLElement)) {
        return;
      }
      const itemId = row.dataset[ITEM_ID_DATASET_KEY];
      if (!itemId) {
        return;
      }
      setSelectedItemId(itemId);
      renderUi();
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
      const titleInput = dom.orbPanelsEl.querySelector(".aiw-create-item-title");
      const contentInput = dom.orbPanelsEl.querySelector(
        ".aiw-create-item-content"
      );
      if (!(titleInput instanceof HTMLInputElement) || !(contentInput instanceof HTMLTextAreaElement)) {
        return;
      }
      const trimmedItemTitle = titleInput.value.trim();
      const content = contentInput.value;
      if (trimmedItemTitle.length === 0) {
        return;
      }
      await itemsController.create(selectedProjectId, trimmedItemTitle, content);
      titleInput.value = "";
      contentInput.value = "";
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
      openPanel("projects");
      renderUi();
    }
    function renderUi() {
      console.count("renderUi");
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
    dom.orbPanelsEl.addEventListener("click", handleProjectSelect);
    dom.orbPanelsEl.addEventListener("click", handleCreateProject);
    dom.orbPanelsEl.addEventListener("click", handleItemSelect);
    dom.orbPanelsEl.addEventListener("click", handleBackButtonClick);
    dom.orbPanelsEl.addEventListener("click", handleCreateItem);
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return function destroyFloatingController() {
      dom.orbButtonEl.removeEventListener("click", toggleOrbVisibility);
      dom.orbPanelsEl.removeEventListener("click", handleProjectSelect);
      dom.orbPanelsEl.removeEventListener("click", handleCreateProject);
      dom.orbPanelsEl.removeEventListener("click", handleItemSelect);
      dom.orbPanelsEl.removeEventListener("click", handleBackButtonClick);
      dom.orbPanelsEl.removeEventListener("click", handleCreateItem);
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }
  var PANEL_BACK_BUTTON_SELECTOR, PROJECT_ROW_SELECTOR, PROJECT_ID_DATASET_KEY, PROJECT_CREATE_BUTTON_SELECTOR, ITEM_ROW_SELECTOR, ITEM_ID_DATASET_KEY, ITEM_CREATE_BUTTON_SELECTOR;
  var init_floatingController = __esm({
    "src/ui/core/floatingController.ts"() {
      "use strict";
      init_floatingDom();
      init_orbActionRouter();
      init_orbActions();
      init_renderOrbActions();
      init_renderFloatingPanels();
      init_floatingUiState();
      init_projectsController();
      init_itemsController();
      init_sessionState();
      PANEL_BACK_BUTTON_SELECTOR = ".aiw-panel-back-button";
      PROJECT_ROW_SELECTOR = ".aiw-project-row";
      PROJECT_ID_DATASET_KEY = "projectId";
      PROJECT_CREATE_BUTTON_SELECTOR = ".aiw-create-project-submit";
      ITEM_ROW_SELECTOR = ".aiw-item-row";
      ITEM_ID_DATASET_KEY = "itemId";
      ITEM_CREATE_BUTTON_SELECTOR = ".aiw-create-item-submit";
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
      async function seedDevDataOnce() {
        const flag = await chrome.storage.local.get("aiw_dev_seeded");
        if (flag.aiw_dev_seeded === true) return;
        try {
          const emptyProject = await createProject("Empty Project");
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
          throw error;
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
