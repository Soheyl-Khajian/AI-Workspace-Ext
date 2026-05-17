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

  // src/ui/renderProjects.ts
  function renderProjects(container, projects, selectedProjectId, onSelectProject) {
    container.textContent = "";
    if (projects.length === 0) {
      const emptyStateEl = document.createElement("div");
      emptyStateEl.className = "aiw-empty";
      emptyStateEl.textContent = "No projects yet";
      container.append(emptyStateEl);
      return;
    }
    for (const project of projects) {
      const projectRowEl = createProjectRow(
        project,
        selectedProjectId,
        onSelectProject
      );
      container.append(projectRowEl);
    }
  }
  function createProjectRow(project, selectedProjectId, onSelectProject) {
    const projectRowEl = document.createElement("div");
    projectRowEl.className = "aiw-projects-row";
    projectRowEl.textContent = project.name;
    projectRowEl.dataset.projectId = project.id;
    if (project.id === selectedProjectId) {
      projectRowEl.classList.add("aiw-projects-row--active");
    }
    projectRowEl.addEventListener("click", () => {
      onSelectProject(project.id);
    });
    return projectRowEl;
  }
  var init_renderProjects = __esm({
    "src/ui/renderProjects.ts"() {
      "use strict";
    }
  });

  // src/ui/renderItems.ts
  function renderItems(container, items, selectedItemId, onItemClick = NOOP) {
    container.textContent = "";
    if (items.length === 0) {
      const emptyStateEl = document.createElement("div");
      emptyStateEl.className = "aiw-empty";
      emptyStateEl.textContent = "No items yet";
      container.append(emptyStateEl);
      return;
    }
    for (const item of items) {
      const itemRowEl = createItemRow(item, selectedItemId, onItemClick);
      container.append(itemRowEl);
    }
  }
  function createItemRow(item, selectedItemId, onItemClick) {
    const itemRowEl = document.createElement("div");
    itemRowEl.className = "aiw-items-row";
    const displayLabel = deriveItemLabel(item);
    itemRowEl.textContent = displayLabel;
    itemRowEl.dataset.itemId = item.id;
    itemRowEl.classList.add(`aiw-item--${item.type}`);
    if (item.id === selectedItemId) {
      itemRowEl.classList.add("aiw-items-row--active");
    }
    itemRowEl.addEventListener("click", () => {
      onItemClick(item.id);
    });
    return itemRowEl;
  }
  function deriveItemLabel(item) {
    const title = item.title.trim();
    if (title) {
      return title;
    }
    const normalizedContent = item.content.trim().replace(/\s+/g, " ");
    if (!normalizedContent) {
      return "Untitled item";
    }
    if (normalizedContent.length > MAX_PREVIEW_LENGTH) {
      return normalizedContent.slice(0, MAX_PREVIEW_LENGTH) + "...";
    }
    return normalizedContent;
  }
  var MAX_PREVIEW_LENGTH, NOOP;
  var init_renderItems = __esm({
    "src/ui/renderItems.ts"() {
      "use strict";
      MAX_PREVIEW_LENGTH = 45;
      NOOP = () => {
      };
    }
  });

  // src/ui/renderItemDetails.ts
  function renderItemDetails(container, item) {
    container.textContent = "";
    if (item === null) {
      const emptyStateEl = document.createElement("div");
      emptyStateEl.className = "aiw-empty";
      emptyStateEl.textContent = "No item selected yet";
      container.append(emptyStateEl);
      return;
    }
    const wrapperEl = document.createElement("div");
    wrapperEl.className = "aiw-item-details__wrapper";
    container.append(wrapperEl);
    const titleEl = document.createElement("div");
    const hasTitle = Boolean(item.title && item.title.trim());
    if (!hasTitle) {
      titleEl.className = "aiw-empty";
      titleEl.textContent = "Untitled item";
    } else {
      titleEl.className = "aiw-item-details__title";
      titleEl.textContent = item.title;
    }
    wrapperEl.append(titleEl);
    const typeEl = document.createElement("div");
    typeEl.className = "aiw-item-details__type";
    typeEl.textContent = item.type;
    wrapperEl.append(typeEl);
    const contentEl = document.createElement("div");
    const hasContent = Boolean(item.content && item.content.trim());
    if (!hasContent) {
      contentEl.className = "aiw-empty";
      contentEl.textContent = "No content";
    } else {
      contentEl.className = "aiw-item-details__content";
      contentEl.textContent = item.content;
    }
    wrapperEl.append(contentEl);
  }
  var init_renderItemDetails = __esm({
    "src/ui/renderItemDetails.ts"() {
      "use strict";
    }
  });

  // src/ui/state.ts
  function getSelectedProjectId() {
    return state.selectedProjectId;
  }
  function setSelectedProjectId(projectId) {
    state.selectedProjectId = projectId;
  }
  function getSelectedItemId() {
    return state.selectedItemId;
  }
  function setSelectedItemId(itemId) {
    state.selectedItemId = itemId;
  }
  function getProjects() {
    return [...state.projectsCache];
  }
  function setProjects(projects) {
    state.projectsCache = [...projects];
  }
  function getItems() {
    return [...state.itemsCache];
  }
  function setItems(items) {
    state.itemsCache = [...items];
  }
  var state;
  var init_state = __esm({
    "src/ui/state.ts"() {
      "use strict";
      state = {
        // Selection
        selectedProjectId: null,
        selectedItemId: null,
        // Caches
        projectsCache: [],
        itemsCache: []
      };
    }
  });

  // src/ui/dom.ts
  function mustQuery(root, selector) {
    const el = root.querySelector(selector);
    if (!el) {
      throw new Error(`Missing required sidebar element: ${selector}`);
    }
    return el;
  }
  function createSidebarDom(root) {
    return {
      root,
      projectsListEl: mustQuery(root, "#aiw-projects-list"),
      itemsListEl: mustQuery(root, "#aiw-items-list"),
      itemDetailsEl: mustQuery(root, "#aiw-item-details"),
      addProjectBtn: mustQuery(
        root,
        "#aiw-add-project-button"
      ),
      addItemBtn: mustQuery(root, "#aiw-add-item-button")
    };
  }
  var init_dom = __esm({
    "src/ui/dom.ts"() {
      "use strict";
    }
  });

  // src/ui/sidebarController.ts
  async function initSidebarController(root) {
    const dom = createSidebarDom(root);
    async function refreshProjectsState() {
      const projects = await listProjects();
      setProjects(projects);
      const selectedProjectId = getSelectedProjectId();
      const stillExists = projects.some(
        (project) => project.id === selectedProjectId
      );
      if (!stillExists) {
        setSelectedProjectId(null);
      }
    }
    async function refreshItemsState() {
      const selectedProjectId = getSelectedProjectId();
      if (selectedProjectId === null) {
        setItems([]);
        setSelectedItemId(null);
        return;
      }
      const items = await listItemsByProject(selectedProjectId);
      setItems(items);
      const selectedItemId = getSelectedItemId();
      const stillExists = items.some((item) => item.id === selectedItemId);
      if (!stillExists) {
        setSelectedItemId(null);
      }
    }
    function renderProjectsView() {
      const projects = getProjects();
      const selectedProjectId = getSelectedProjectId();
      renderProjects(
        dom.projectsListEl,
        projects,
        selectedProjectId,
        async (clickedProjectId) => {
          setSelectedProjectId(clickedProjectId);
          setSelectedItemId(null);
          await refreshItemsState();
          renderAllViews();
        }
      );
    }
    function renderItemsView() {
      const selectedProjectId = getSelectedProjectId();
      if (selectedProjectId === null) {
        renderItems(dom.itemsListEl, [], null, () => {
        });
        return;
      }
      const items = getItems();
      const selectedItemId = getSelectedItemId();
      renderItems(dom.itemsListEl, items, selectedItemId, (clickedItemId) => {
        setSelectedItemId(clickedItemId);
        renderItemDetailsView();
        renderItemsView();
      });
    }
    function renderItemDetailsView() {
      const selectedItemId = getSelectedItemId();
      const items = getItems();
      const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
      renderItemDetails(dom.itemDetailsEl, selectedItem);
    }
    function renderAllViews() {
      renderProjectsView();
      renderItemsView();
      renderItemDetailsView();
    }
    dom.addProjectBtn.addEventListener("click", async () => {
      const name = window.prompt("Enter project name:");
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const project = await createProject(trimmed);
      await refreshProjectsState();
      setSelectedProjectId(project.id);
      setSelectedItemId(null);
      await refreshItemsState();
      renderAllViews();
    });
    dom.addItemBtn.addEventListener("click", async () => {
      const title = window.prompt("Enter item title:");
      if (!title) return;
      const content = window.prompt("Enter item content:");
      if (!content) return;
      const trimmedTitle = title.trim();
      const trimmedContent = content.trim();
      if (!trimmedTitle || !trimmedContent) return;
      const selectedProjectId = getSelectedProjectId();
      if (!selectedProjectId) return;
      const item = await createItem(
        selectedProjectId,
        "note",
        trimmedTitle,
        trimmedContent,
        { createdFrom: "manual" }
      );
      await refreshItemsState();
      setSelectedItemId(item.id);
      renderAllViews();
    });
    await refreshProjectsState();
    await refreshItemsState();
    renderAllViews();
  }
  var init_sidebarController = __esm({
    "src/ui/sidebarController.ts"() {
      "use strict";
      init_storage();
      init_renderProjects();
      init_renderItems();
      init_renderItemDetails();
      init_state();
      init_dom();
    }
  });

  // src/content/injectSidebar.ts
  var require_injectSidebar = __commonJS({
    "src/content/injectSidebar.ts"() {
      init_sidebarController();
      init_storage();
      async function injectSidebarAssets() {
        const styleExists = document.getElementById("aiw-sidebar-style");
        if (!styleExists) {
          const link = document.createElement("link");
          link.id = "aiw-sidebar-style";
          link.rel = "stylesheet";
          link.href = chrome.runtime.getURL("dist/ui/sidebar.css");
          (document.head ?? document.documentElement).append(link);
        }
        const rootExists = document.getElementById("aiw-sidebar-root");
        if (!rootExists) {
          const response = await fetch(chrome.runtime.getURL("dist/ui/sidebar.html"));
          if (!response.ok) {
            throw new Error(`Failed to load sidebar HTML (${response.status})`);
          }
          const html = await response.text();
          (document.body ?? document.documentElement).insertAdjacentHTML(
            "beforeend",
            html
          );
        }
        const root = document.getElementById("aiw-sidebar-root");
        if (!root) {
          throw new Error("Sidebar root not found after injection");
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
        await injectSidebarAssets();
        const root = document.getElementById("aiw-sidebar-root");
        if (!root) {
          throw new Error("Sidebar root missing after injection");
        }
        await initSidebarController(root);
        await seedDevDataOnce();
      }
      bootstrap().catch((err) => {
        console.error("[AIW] Sidebar bootstrap failed:", err);
      });
    }
  });
  require_injectSidebar();
})();
//# sourceMappingURL=injectSidebar.js.map
