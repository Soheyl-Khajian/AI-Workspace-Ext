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
  function openProjectForm() {
    state.isProjectFormOpen = true;
  }
  function closeProjectForm() {
    state.isProjectFormOpen = false;
    resetProjectDraft();
  }
  function isProjectFormOpen() {
    return state.isProjectFormOpen;
  }
  function getProjectDraftName() {
    return state.projectDraftName;
  }
  function setProjectDraftName(name) {
    state.projectDraftName = name;
  }
  function openItemForm() {
    state.isItemFormOpen = true;
  }
  function closeItemForm() {
    state.isItemFormOpen = false;
    resetItemDraft();
  }
  function isItemFormOpen() {
    return state.isItemFormOpen;
  }
  function getItemDraftTitle() {
    return state.itemDraftTitle;
  }
  function getItemDraftContent() {
    return state.itemDraftContent;
  }
  function setItemDraftTitle(title) {
    state.itemDraftTitle = title;
  }
  function setItemDraftContent(content) {
    state.itemDraftContent = content;
  }
  function resetProjectDraft() {
    state.projectDraftName = "";
  }
  function resetItemDraft() {
    state.itemDraftTitle = "";
    state.itemDraftContent = "";
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
        itemsCache: [],
        // Form
        isProjectFormOpen: false,
        isItemFormOpen: false,
        projectDraftName: "",
        itemDraftTitle: "",
        itemDraftContent: ""
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
  function createSidebarDom(rootEl) {
    return {
      rootEl,
      projectsListEl: mustQuery(rootEl, "#aiw-projects-list"),
      itemsListEl: mustQuery(rootEl, "#aiw-items-list"),
      itemDetailsEl: mustQuery(rootEl, "#aiw-item-details"),
      projectFormEl: mustQuery(rootEl, "#aiw-project-form"),
      itemFormEl: mustQuery(rootEl, "#aiw-item-form"),
      addProjectButtonEl: mustQuery(
        rootEl,
        "#aiw-add-project-button"
      ),
      addItemButtonEl: mustQuery(
        rootEl,
        "#aiw-add-item-button"
      )
    };
  }
  var init_dom = __esm({
    "src/ui/dom.ts"() {
      "use strict";
    }
  });

  // src/ui/sidebarStateSync.ts
  async function refreshProjectsState() {
    const projects = await listProjects();
    setProjects(projects);
    const selectedProjectId = getSelectedProjectId();
    const selectedProjectStillExists = projects.some(
      (project) => project.id === selectedProjectId
    );
    if (!selectedProjectStillExists) {
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
    const selectedItemStillExists = items.some(
      (item) => item.id === selectedItemId
    );
    if (!selectedItemStillExists) {
      setSelectedItemId(null);
    }
  }
  var init_sidebarStateSync = __esm({
    "src/ui/sidebarStateSync.ts"() {
      "use strict";
      init_storage();
      init_state();
    }
  });

  // src/ui/sidebarActions.ts
  async function selectProject(projectId, deps) {
    deps.setSelectedProjectId(projectId);
    deps.setSelectedItemId(null);
    await deps.refreshItemsState();
  }
  function selectItem(itemId, deps) {
    deps.setSelectedItemId(itemId);
  }
  var init_sidebarActions = __esm({
    "src/ui/sidebarActions.ts"() {
      "use strict";
    }
  });

  // src/ui/renderers/renderProjects.ts
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
    "src/ui/renderers/renderProjects.ts"() {
      "use strict";
    }
  });

  // src/ui/renderers/renderProjectForm.ts
  function renderProjectForm(containerEl, isOpen, draftName, onInput, onSubmit, onCancel) {
    containerEl.textContent = "";
    if (!isOpen) {
      return;
    }
    const formEl = document.createElement("form");
    const inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.placeholder = "Project name";
    inputEl.value = draftName;
    inputEl.addEventListener("input", () => {
      onInput(inputEl.value);
    });
    const submitButtonEl = document.createElement("button");
    submitButtonEl.type = "submit";
    submitButtonEl.textContent = "Create";
    const cancelButtonEl = document.createElement("button");
    cancelButtonEl.type = "button";
    cancelButtonEl.textContent = "Cancel";
    cancelButtonEl.addEventListener("click", () => {
      onCancel();
    });
    formEl.addEventListener("submit", (event) => {
      event.preventDefault();
      onSubmit();
    });
    formEl.append(inputEl, submitButtonEl, cancelButtonEl);
    containerEl.append(formEl);
  }
  var init_renderProjectForm = __esm({
    "src/ui/renderers/renderProjectForm.ts"() {
      "use strict";
    }
  });

  // src/ui/renderers/renderItems.ts
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
    "src/ui/renderers/renderItems.ts"() {
      "use strict";
      MAX_PREVIEW_LENGTH = 45;
      NOOP = () => {
      };
    }
  });

  // src/ui/renderers/renderItemForm.ts
  function renderItemForm(containerEl, isOpen, draftTitle, draftContent, onTitleInput, onContentInput, onSubmit, onCancel) {
    containerEl.textContent = "";
    if (!isOpen) {
      return;
    }
    const formEl = document.createElement("form");
    const titleInputEl = document.createElement("input");
    titleInputEl.type = "text";
    titleInputEl.placeholder = "Item title";
    titleInputEl.value = draftTitle;
    titleInputEl.addEventListener("input", () => {
      onTitleInput(titleInputEl.value);
    });
    const contentTextareaEl = document.createElement("textarea");
    contentTextareaEl.placeholder = "Item content";
    contentTextareaEl.rows = 3;
    contentTextareaEl.value = draftContent;
    contentTextareaEl.addEventListener("input", () => {
      onContentInput(contentTextareaEl.value);
    });
    const submitButtonEl = document.createElement("button");
    submitButtonEl.type = "submit";
    submitButtonEl.textContent = "Create";
    const cancelButtonEl = document.createElement("button");
    cancelButtonEl.type = "button";
    cancelButtonEl.textContent = "Cancel";
    cancelButtonEl.addEventListener("click", () => {
      onCancel();
    });
    formEl.addEventListener("submit", (event) => {
      event.preventDefault();
      onSubmit();
    });
    formEl.append(
      titleInputEl,
      contentTextareaEl,
      submitButtonEl,
      cancelButtonEl
    );
    containerEl.append(formEl);
  }
  var init_renderItemForm = __esm({
    "src/ui/renderers/renderItemForm.ts"() {
      "use strict";
    }
  });

  // src/ui/renderers/renderItemDetails.ts
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
    "src/ui/renderers/renderItemDetails.ts"() {
      "use strict";
    }
  });

  // src/ui/renderers/renderSidebar.ts
  function renderUi({
    dom,
    onProjectSelect,
    onProjectDraftInput,
    onProjectSubmit,
    onProjectCancel,
    onItemSelect,
    onItemTitleInput,
    onItemContentInput,
    onItemSubmit,
    onItemCancel
  }) {
    renderProjectsView();
    renderProjectFormView();
    renderItemsView();
    renderItemFormView();
    renderItemDetailsView();
    function renderProjectsView() {
      const projects = getProjects();
      const selectedProjectId = getSelectedProjectId();
      renderProjects(
        dom.projectsListEl,
        projects,
        selectedProjectId,
        onProjectSelect
      );
    }
    function renderProjectFormView() {
      const projectFormOpen = isProjectFormOpen();
      const projectDraftName = getProjectDraftName();
      renderProjectForm(
        dom.projectFormEl,
        projectFormOpen,
        projectDraftName,
        onProjectDraftInput,
        onProjectSubmit,
        onProjectCancel
      );
    }
    function renderItemsView() {
      const selectedProjectId = getSelectedProjectId();
      if (selectedProjectId === null) {
        renderItems(dom.itemsListEl, [], null, noopItemSelect);
        return;
      }
      const items = getItems();
      const selectedItemId = getSelectedItemId();
      renderItems(dom.itemsListEl, items, selectedItemId, onItemSelect);
    }
    function renderItemFormView() {
      const itemFormOpen = isItemFormOpen();
      const itemDraftTitle = getItemDraftTitle();
      const itemDraftContent = getItemDraftContent();
      renderItemForm(
        dom.itemFormEl,
        itemFormOpen,
        itemDraftTitle,
        itemDraftContent,
        onItemTitleInput,
        onItemContentInput,
        onItemSubmit,
        onItemCancel
      );
    }
    function renderItemDetailsView() {
      const items = getItems();
      const selectedItemId = getSelectedItemId();
      const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
      renderItemDetails(dom.itemDetailsEl, selectedItem);
    }
  }
  function noopItemSelect() {
  }
  var init_renderSidebar = __esm({
    "src/ui/renderers/renderSidebar.ts"() {
      "use strict";
      init_state();
      init_renderProjects();
      init_renderProjectForm();
      init_renderItems();
      init_renderItemForm();
      init_renderItemDetails();
    }
  });

  // src/ui/sidebarController.ts
  async function initSidebarController(root) {
    const dom = createSidebarDom(root);
    const projectSelectionDeps = {
      setSelectedProjectId,
      setSelectedItemId,
      refreshItemsState
    };
    const itemSelectionDeps = {
      setSelectedItemId
    };
    function rerender() {
      renderUi({
        dom,
        onProjectSelect: handleProjectSelect,
        onProjectDraftInput: handleProjectDraftInput,
        onProjectSubmit: handleProjectSubmit,
        onProjectCancel: handleProjectCancel,
        onItemSelect: handleItemSelect,
        onItemTitleInput: handleItemTitleInput,
        onItemContentInput: handleItemContentInput,
        onItemSubmit: handleItemSubmit,
        onItemCancel: handleItemCancel
      });
    }
    async function handleProjectSelect(projectId) {
      await selectProject(projectId, projectSelectionDeps);
      rerender();
    }
    function handleProjectDraftInput(name) {
      setProjectDraftName(name);
    }
    async function handleProjectSubmit() {
      const draftName = getProjectDraftName().trim();
      if (!draftName) {
        return;
      }
      const newProject = await createProject(draftName);
      await refreshProjectsState();
      setSelectedProjectId(newProject.id);
      setSelectedItemId(null);
      await refreshItemsState();
      closeProjectForm();
      resetProjectDraft();
      rerender();
    }
    function handleProjectCancel() {
      closeProjectForm();
      resetProjectDraft();
      rerender();
    }
    function handleItemSelect(itemId) {
      selectItem(itemId, itemSelectionDeps);
      rerender();
    }
    function handleItemTitleInput(title) {
      setItemDraftTitle(title);
    }
    function handleItemContentInput(content) {
      setItemDraftContent(content);
    }
    async function handleItemSubmit() {
      const selectedProjectId = getSelectedProjectId();
      if (!selectedProjectId) {
        return;
      }
      const title = getItemDraftTitle().trim();
      const content = getItemDraftContent().trim();
      if (!title || !content) {
        return;
      }
      const newItem = await createItem(
        selectedProjectId,
        "note",
        title,
        content,
        {
          createdFrom: "manual"
        }
      );
      await refreshItemsState();
      setSelectedItemId(newItem.id);
      closeItemForm();
      resetItemDraft();
      rerender();
    }
    function handleItemCancel() {
      closeItemForm();
      resetItemDraft();
      rerender();
    }
    dom.addProjectButtonEl.addEventListener("click", () => {
      openProjectForm();
      resetProjectDraft();
      rerender();
    });
    dom.addItemButtonEl.addEventListener("click", () => {
      const selectedProjectId = getSelectedProjectId();
      if (!selectedProjectId) {
        return;
      }
      openItemForm();
      resetItemDraft();
      rerender();
    });
    await refreshProjectsState();
    await refreshItemsState();
    rerender();
  }
  var init_sidebarController = __esm({
    "src/ui/sidebarController.ts"() {
      "use strict";
      init_storage();
      init_state();
      init_dom();
      init_sidebarStateSync();
      init_sidebarActions();
      init_renderSidebar();
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
