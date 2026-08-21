// src/ui/features/items/ItemsPanel.test.tsx
/** @vitest-environment jsdom */
// ------------------------------------------------------------
// ITEMS PANEL TESTS
// ------------------------------------------------------------
//
// What is pinned here:
// - the list ladder INCLUDING the quiet window (loading with the
//   indicator hidden renders an intentionally empty region)
// - selection semantics: row click selects, the checkbox toggles
//   batch selection WITHOUT selecting (stopPropagation contract)
// - header navigation: back button and breadcrumb return to the
//   projects panel; back also drops the item selection
// - the detail column: keyed-draft hydration, key-forced remount
//   on selection change, trim-on-save, validation
// - the create form draft doctrine (hydrate / write-through /
//   re-sync after the workflow)
// - the two-page row menu: root actions, in-place morph to the
//   move picker, target resolution, confirm-gated delete
// - build-context count and dispatch
// - scroll doctrine: restored from module state after render,
//   captured by scrolling
//
// Harness note: the REAL state modules are used — only the
// controller is mocked. requestRender mirrors production
// (renderUi → root.render) by re-rendering the same element.
// ------------------------------------------------------------
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { Item } from "../../../models/item";
import type { Project } from "../../../models/project";
import type { ItemsController } from "./itemsController";
import { ItemsPanel } from "./ItemsPanel";
import { getActivePanel, resetState } from "../../core/floatingUiState";
import {
  getSelectedItemId,
  resetSessionState,
  setSelectedItemId,
  setSelectedProjectId,
} from "../../core/sessionState";
import {
  resetItemsState,
  setItems,
  setItemsError,
  setItemsListScrollTop,
  getItemsListScrollTop,
  setItemsLoading,
  setItemsLoadingIndicatorVisible,
} from "./itemsState";
import {
  clearCreateItemDraft,
  getCreateItemTitleDraft,
  getCreateItemContentDraft,
  resetItemsDraftState,
  setCreateItemTitleDraft,
  setItemDetailTitleDraft,
} from "./itemsDraftState";
import { resetItemsMenuState } from "./itemsMenuState";
import { clearItemSelection, toggleItemSelection } from "./itemSelectionState";

const PROJECTS: Project[] = [
  { id: "p1", name: "Alpha", createdAt: 1 },
  { id: "p2", name: "Beta", createdAt: 2 },
];

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "i1",
    projectId: "p1",
    type: "note",
    title: "First note",
    content: "Body text",
    createdAt: 1,
    meta: { createdFrom: "manual" },
    ...overrides,
  };
}

function createItemsControllerMock() {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    selectItem: vi.fn(),
    toggleSelection: vi.fn(),
    clearSelection: vi.fn(),
    create: vi.fn().mockResolvedValue(undefined),
    updateItem: vi.fn().mockResolvedValue(undefined),
    moveItem: vi.fn().mockResolvedValue(undefined),
    copyContextPack: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
  } satisfies ItemsController;
}

// Renders the panel with a requestRender that re-renders the
// same element — the harness twin of renderUi → root.render.
// Returned so tests can flush module-state changes they made
// directly (the production equivalent is any renderUi pass).
function setup(itemsController: ItemsController = createItemsControllerMock()) {
  const notify = vi.fn();
  const resolveProjectName = (projectId: string): string =>
    PROJECTS.find((project) => project.id === projectId)?.name ??
    "Untitled project";
  const props = {
    itemsController,
    projects: PROJECTS,
    projectName: "Alpha",
    notify,
    resolveProjectName,
    hasActiveInlineEdit: () => false,
    requestRender: () => {},
  };
  let view: ReturnType<typeof render> | null = null;
  const requestRender = (): void => {
    view?.rerender(<ItemsPanel {...props} requestRender={requestRender} />);
  };
  view = render(<ItemsPanel {...props} requestRender={requestRender} />);
  return { itemsController, notify, view, requestRender };
}

describe("ItemsPanel", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    resetItemsState();
    resetItemsDraftState();
    resetItemsMenuState();
    clearItemSelection();
    resetSessionState();
    resetState();
  });

  it("shows the scope placeholder and a muted breadcrumb without a selected project", () => {
    const { view } = setup();
    expect(screen.getByText("Select a project to view items")).not.toBeNull();
    const contextEl = screen.getByText("Select a project");
    expect(contextEl.classList.contains("aiw-panel-context--muted")).toBe(true);
    // Early return: no split layout, no create form, no context bar.
    expect(view.container.querySelector(".aiw-items-layout")).toBeNull();
    expect(view.container.querySelector(".aiw-build-context")).toBeNull();
  });

  it("keeps the quiet window empty, then shows the delayed indicator", () => {
    setSelectedProjectId("p1");
    setItemsLoading(true);
    const { requestRender } = setup();
    // Quiet window: loading, but not long enough to show it.
    expect(screen.queryByText("Loading items...")).toBeNull();
    expect(screen.queryByText("No items yet")).toBeNull();

    setItemsLoadingIndicatorVisible(true);
    act(() => requestRender());
    expect(screen.getByText("Loading items...")).not.toBeNull();
  });

  it("shows the error state when the load failed", () => {
    setSelectedProjectId("p1");
    setItemsError("Storage failed");
    setup();
    expect(screen.getByText("Storage failed")).not.toBeNull();
  });

  it("shows the empty state when the project has no items", () => {
    setSelectedProjectId("p1");
    setup();
    expect(screen.getByText("No items yet")).not.toBeNull();
  });

  it("renders rows with type glyphs and the untitled fallback", () => {
    setSelectedProjectId("p1");
    setItems([
      makeItem({ id: "i1", title: "First note", type: "note" }),
      makeItem({ id: "i2", title: "   ", type: "snippet" }),
    ]);
    const { view } = setup();
    expect(view.container.querySelectorAll(".aiw-item-row")).toHaveLength(2);
    expect(view.container.querySelector(".aiw-item-type--note")).not.toBeNull();
    const untitledEl = screen.getByText("Untitled");
    expect(untitledEl.classList.contains("aiw-item-text--untitled")).toBe(true);
  });

  it("clicking a row selects the item", () => {
    setSelectedProjectId("p1");
    setItems([makeItem()]);
    const { itemsController } = setup();
    fireEvent.click(screen.getByText("First note"));
    expect(itemsController.selectItem).toHaveBeenCalledWith("i1");
  });

  it("the checkbox toggles batch selection without selecting the item", () => {
    setSelectedProjectId("p1");
    setItems([makeItem()]);
    const { itemsController, view } = setup();
    const checkbox = view.container.querySelector(".aiw-item-select");
    if (!(checkbox instanceof HTMLInputElement)) throw new Error("no checkbox");
    fireEvent.click(checkbox);
    expect(itemsController.toggleSelection).toHaveBeenCalledWith("i1");
    expect(itemsController.selectItem).not.toHaveBeenCalled();
  });

  it("the back button returns to projects and drops the item selection", () => {
    setSelectedProjectId("p1");
    setSelectedItemId("i1");
    setItems([makeItem()]);
    setup();
    fireEvent.click(screen.getByText("←"));
    expect(getActivePanel()).toBe("projects");
    expect(getSelectedItemId()).toBeNull();
  });

  it("the breadcrumb returns to projects and keeps the item selection", () => {
    setSelectedProjectId("p1");
    setSelectedItemId("i1");
    setItems([makeItem()]);
    setup();
    fireEvent.click(screen.getByText("Alpha"));
    expect(getActivePanel()).toBe("projects");
    expect(getSelectedItemId()).toBe("i1");
  });

  it("shows the detail placeholder when no item is selected", () => {
    setSelectedProjectId("p1");
    setItems([makeItem()]);
    setup();
    expect(screen.getByText("Select an item")).not.toBeNull();
  });

  it("hydrates the detail form with drafts winning over stored values", () => {
    setSelectedProjectId("p1");
    setSelectedItemId("i1");
    setItems([makeItem()]);
    setItemDetailTitleDraft("i1", "Half-edited title");
    const { view } = setup();
    const titleInput = view.container.querySelector(".aiw-item-detail-title");
    const contentInput = view.container.querySelector(
      ".aiw-item-detail-content",
    );
    if (!(titleInput instanceof HTMLInputElement)) throw new Error("no title");
    if (!(contentInput instanceof HTMLTextAreaElement))
      throw new Error("no content");
    expect(titleInput.value).toBe("Half-edited title"); // draft wins
    expect(contentInput.value).toBe("Body text"); // stored fallback
  });

  it("remounts the detail form when the selected item changes (key contract)", () => {
    setSelectedProjectId("p1");
    setSelectedItemId("i1");
    setItems([
      makeItem({ id: "i1", title: "First note" }),
      makeItem({ id: "i2", title: "Second note", content: "Other body" }),
    ]);
    const { view, requestRender } = setup();
    const firstInput = view.container.querySelector(".aiw-item-detail-title");
    if (!(firstInput instanceof HTMLInputElement)) throw new Error("no input");
    // Unsynced local typing that must NOT leak into the next item.
    fireEvent.change(firstInput, { target: { value: "typed but unsaved" } });

    setSelectedItemId("i2");
    act(() => requestRender());

    const secondInput = view.container.querySelector(".aiw-item-detail-title");
    if (!(secondInput instanceof HTMLInputElement)) throw new Error("no input");
    expect(secondInput.value).toBe("Second note");
  });

  it("Save trims the title and calls updateItem", async () => {
    setSelectedProjectId("p1");
    setSelectedItemId("i1");
    setItems([makeItem()]);
    const { itemsController, view } = setup();
    const titleInput = view.container.querySelector(".aiw-item-detail-title");
    if (!(titleInput instanceof HTMLInputElement)) throw new Error("no title");
    fireEvent.change(titleInput, { target: { value: "  Renamed  " } });
    fireEvent.click(screen.getByText("Save"));
    await act(async () => {});
    expect(itemsController.updateItem).toHaveBeenCalledWith(
      "i1",
      "Renamed",
      "Body text",
    );
  });

  it("Save rejects an all-empty form with a toast and no call", () => {
    setSelectedProjectId("p1");
    setSelectedItemId("i1");
    setItems([makeItem()]);
    const { itemsController, notify, view } = setup();
    const titleInput = view.container.querySelector(".aiw-item-detail-title");
    const contentInput = view.container.querySelector(
      ".aiw-item-detail-content",
    );
    if (!(titleInput instanceof HTMLInputElement)) throw new Error("no title");
    if (!(contentInput instanceof HTMLTextAreaElement))
      throw new Error("no content");
    fireEvent.change(titleInput, { target: { value: "   " } });
    fireEvent.change(contentInput, { target: { value: "  " } });
    fireEvent.click(screen.getByText("Save"));
    expect(notify).toHaveBeenCalledWith("Add a title or some content");
    expect(itemsController.updateItem).not.toHaveBeenCalled();
  });

  it("creates from the form, writes drafts through, and re-syncs after success", async () => {
    setSelectedProjectId("p1");
    const itemsController = createItemsControllerMock();
    // Mirror the real controller's success side effect: the draft
    // is cleared, and the re-sync contract depends on it.
    itemsController.create = vi.fn(async () => {
      clearCreateItemDraft();
    });
    setup(itemsController);
    const titleInput = screen.getByPlaceholderText<HTMLInputElement>("Title");
    const contentInput =
      screen.getByPlaceholderText<HTMLTextAreaElement>("Content");

    fireEvent.change(titleInput, { target: { value: "  New item  " } });
    fireEvent.change(contentInput, { target: { value: "Some content" } });
    expect(getCreateItemTitleDraft()).toBe("  New item  ");
    expect(getCreateItemContentDraft()).toBe("Some content");

    fireEvent.click(screen.getByText("Add"));
    expect(itemsController.create).toHaveBeenCalledWith(
      "p1",
      "New item",
      "Some content",
    );
    await act(async () => {});
    expect(titleInput.value).toBe("");
    expect(contentInput.value).toBe("");
  });

  it("rejects an all-empty create with a toast and no call", () => {
    setSelectedProjectId("p1");
    const { itemsController, notify } = setup();
    fireEvent.click(screen.getByText("Add"));
    expect(notify).toHaveBeenCalledWith("Add a title or some content");
    expect(itemsController.create).not.toHaveBeenCalled();
  });

  it("morphs the row menu to the move picker and dispatches the move", async () => {
    setSelectedProjectId("p1");
    setItems([makeItem()]);
    const { itemsController, view } = setup();

    fireEvent.click(screen.getByText("…"));
    expect(screen.getByText("Move to…")).not.toBeNull();
    expect(screen.getByText("Delete")).not.toBeNull();

    fireEvent.click(screen.getByText("Move to…"));
    // In-place morph: the menu is open on its picker page, and the
    // current project is excluded from the targets.
    expect(
      view.container.querySelector(".aiw-row-menu--picker"),
    ).not.toBeNull();
    expect(
      screen.queryByText("Alpha", {
        selector: "button.aiw-item-menu-move-target",
      }),
    ).toBeNull();

    fireEvent.click(screen.getByText("Beta"));
    await act(async () => {});
    expect(itemsController.moveItem).toHaveBeenCalledWith("i1", "p2", "Beta");
    expect(view.container.querySelector(".aiw-row-menu")).toBeNull();
  });

  it("gates delete behind the confirm and closes the menu either way", async () => {
    setSelectedProjectId("p1");
    setItems([makeItem()]);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { itemsController, view } = setup();

    fireEvent.click(screen.getByText("…"));
    fireEvent.click(screen.getByText("Delete"));
    // Cancelled: menu already closed, nothing deleted.
    expect(view.container.querySelector(".aiw-row-menu")).toBeNull();
    expect(itemsController.deleteItem).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByText("…"));
    fireEvent.click(screen.getByText("Delete"));
    await act(async () => {});
    expect(itemsController.deleteItem).toHaveBeenCalledWith("i1", "p1");
  });

  it("shows the batch count and dispatches the context pack", async () => {
    setSelectedProjectId("p1");
    setItems([makeItem({ id: "i1" }), makeItem({ id: "i2", title: "Two" })]);
    toggleItemSelection("i1");
    toggleItemSelection("i2");
    const { itemsController } = setup();
    const buildButton = screen.getByText("Build context (2)");
    fireEvent.click(buildButton);
    await act(async () => {});
    expect(itemsController.copyContextPack).toHaveBeenCalledWith("Alpha");
  });

  it("restores the list scroll position from state and captures scrolling", () => {
    setSelectedProjectId("p1");
    setItems([makeItem()]);
    setItemsListScrollTop(120);
    const { view } = setup();
    const scrollEl = view.container.querySelector(".aiw-items-list-scroll");
    if (!(scrollEl instanceof HTMLElement)) throw new Error("no scroll el");
    expect(scrollEl.scrollTop).toBe(120);

    fireEvent.scroll(scrollEl, { target: { scrollTop: 300 } });
    expect(getItemsListScrollTop()).toBe(300);
  });

  it("submits the create form with Enter in the title field", async () => {
    setSelectedProjectId("p1");
    const { itemsController } = setup();
    const titleInput = screen.getByPlaceholderText<HTMLInputElement>("Title");
    fireEvent.change(titleInput, { target: { value: "Quick add" } });
    fireEvent.keyDown(titleInput, { key: "Enter" });
    await act(async () => {});
    expect(itemsController.create).toHaveBeenCalledWith("p1", "Quick add", "");
  });
});
