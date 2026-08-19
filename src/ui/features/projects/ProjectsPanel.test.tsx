// src/ui/features/projects/ProjectsPanel.test.tsx
/** @vitest-environment jsdom */
// ------------------------------------------------------------
// PROJECTS PANEL TESTS
// ------------------------------------------------------------
//
// What is pinned here:
// - the state ladder (loading / error / empty / rows)
// - selection semantics: row click selects, the deselect strip
//   releases WITHOUT selecting (stopPropagation contract)
// - the row menu: trigger toggles, Rename enters a focused,
//   fully-selected inline edit, Enter commits, Escape cancels
// - the create form draft doctrine: hydrate, write-through,
//   trim-on-submit, re-sync after the workflow
//
// Harness note: the REAL state modules are used — only the
// controller is mocked, because the component's contract with
// the modules IS the thing under test. requestRender in
// production is renderUi → root.render; the harness mirrors it
// by re-rendering the same element, so module-state mutations
// become visible exactly like they do live.
// ------------------------------------------------------------
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { Project } from "../../../models/project";
import type { ProjectsController } from "./projectsController";
import { ProjectsPanel } from "./ProjectsPanel";
import {
  resetSessionState,
  setSelectedProjectId,
} from "../../core/sessionState";
import {
  resetProjectsState,
  setError,
  setLoading,
  setProjects,
} from "./projectsState";
import {
  clearCreateProjectNameDraft,
  getCreateProjectNameDraft,
  resetProjectsDraftState,
  setCreateProjectNameDraft,
} from "./projectsDraftState";
import {
  getEditingProjectId,
  resetProjectsRenameState,
} from "./projectsRenameState";
import {
  getOpenProjectMenuId,
  resetProjectsMenuState,
} from "./projectsMenuState";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Alpha",
    createdAt: 1,
    ...overrides,
  };
}

function createProjectsControllerMock() {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    selectProject: vi.fn(),
    deselectProject: vi.fn(),
    create: vi.fn().mockResolvedValue(undefined),
    renameProject: vi.fn().mockResolvedValue(undefined),
    deleteProject: vi.fn().mockResolvedValue(undefined),
  } satisfies ProjectsController;
}

// Renders the panel with a requestRender that re-renders the
// same element — the harness twin of renderUi → root.render.
function setup(
  projectsController: ProjectsController = createProjectsControllerMock(),
) {
  const notify = vi.fn();
  let view: ReturnType<typeof render> | null = null;
  const requestRender = (): void => {
    view?.rerender(
      <ProjectsPanel
        projectsController={projectsController}
        notify={notify}
        requestRender={requestRender}
      />,
    );
  };
  view = render(
    <ProjectsPanel
      projectsController={projectsController}
      notify={notify}
      requestRender={requestRender}
    />,
  );
  return { projectsController, notify, view };
}

describe("ProjectsPanel", () => {
  // The panel renders from shared modules; every one it touches
  // must be reset or state leaks across tests.
  afterEach(() => {
    cleanup();
    resetProjectsState();
    resetProjectsDraftState();
    resetProjectsRenameState();
    resetProjectsMenuState();
    resetSessionState();
  });

  it("shows the loading state while projects load", () => {
    setLoading(true);
    setup();
    expect(screen.getByText("Loading...")).not.toBeNull();
  });

  it("shows the error state when the load failed", () => {
    setError("Storage failed");
    setup();
    expect(screen.getByText("Storage failed")).not.toBeNull();
  });

  it("shows the empty state when there are no projects", () => {
    setup();
    expect(screen.getByText("No projects yet")).not.toBeNull();
  });

  it("renders a row per project and marks only the selected row", () => {
    setProjects([
      makeProject({ id: "p1", name: "Alpha" }),
      makeProject({ id: "p2", name: "Beta" }),
    ]);
    setSelectedProjectId("p1");
    const { view } = setup();

    const rows = view.container.querySelectorAll(".aiw-project-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.classList.contains("aiw-project-row--selected")).toBe(true);
    expect(rows[1]?.classList.contains("aiw-project-row--selected")).toBe(
      false,
    );
    // The deselect strip renders ONLY on the selected row.
    expect(
      view.container.querySelectorAll(".aiw-project-deselect"),
    ).toHaveLength(1);
  });

  it("clicking a row selects the project", () => {
    setProjects([makeProject({ id: "p1", name: "Alpha" })]);
    const { projectsController } = setup();
    fireEvent.click(screen.getByText("Alpha"));
    expect(projectsController.selectProject).toHaveBeenCalledWith("p1");
  });

  it("clicking the deselect strip releases the selection without selecting", () => {
    setProjects([makeProject({ id: "p1", name: "Alpha" })]);
    setSelectedProjectId("p1");
    const { projectsController } = setup();

    fireEvent.click(screen.getByText("⏏"));

    expect(projectsController.deselectProject).toHaveBeenCalledTimes(1);
    // The stopPropagation contract: the strip's click must not
    // bubble into the row's select.
    expect(projectsController.selectProject).not.toHaveBeenCalled();
  });

  it("hydrates the create input from the draft and writes keystrokes through", () => {
    setCreateProjectNameDraft("half-typed");
    setup();
    const input =
      screen.getByPlaceholderText<HTMLInputElement>("New project name");
    expect(input.value).toBe("half-typed");

    fireEvent.change(input, { target: { value: "half-typed more" } });
    expect(getCreateProjectNameDraft()).toBe("half-typed more");
  });

  it("submits a trimmed name and re-syncs the input from the cleared draft", async () => {
    const projectsController = createProjectsControllerMock();
    // The real controller clears the module draft on success; the
    // mock mirrors that side effect because the input's re-sync
    // contract depends on it.
    projectsController.create = vi.fn(async () => {
      clearCreateProjectNameDraft();
    });
    setup(projectsController);
    const input =
      screen.getByPlaceholderText<HTMLInputElement>("New project name");

    fireEvent.change(input, { target: { value: "  New name  " } });
    fireEvent.click(screen.getByText("Create"));

    expect(projectsController.create).toHaveBeenCalledWith("New name");
    await act(async () => {});
    expect(input.value).toBe("");
  });

  it("rejects an empty name with a toast and no create call", () => {
    const { projectsController, notify } = setup();
    const input = screen.getByPlaceholderText("New project name");

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByText("Create"));

    expect(notify).toHaveBeenCalledWith("Project name can't be empty");
    expect(projectsController.create).not.toHaveBeenCalled();
  });

  it("the menu trigger opens the row menu and the same trigger closes it", () => {
    setProjects([makeProject({ id: "p1", name: "Alpha" })]);
    const { view } = setup();

    fireEvent.click(screen.getByText("…"));
    expect(view.container.querySelector(".aiw-row-menu")).not.toBeNull();
    expect(getOpenProjectMenuId()).toBe("p1");

    fireEvent.click(screen.getByText("…"));
    expect(view.container.querySelector(".aiw-row-menu")).toBeNull();
    expect(getOpenProjectMenuId()).toBeNull();
  });

  it("menu Rename swaps the name for a focused, fully-selected input", () => {
    setProjects([makeProject({ id: "p1", name: "Alpha" })]);
    const { view } = setup();

    fireEvent.click(screen.getByText("…"));
    fireEvent.click(screen.getByText("Rename"));

    const input = view.container.querySelector(".aiw-project-rename-input");
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) return;

    expect(getEditingProjectId()).toBe("p1");
    expect(input.value).toBe("Alpha");
    expect(document.activeElement).toBe(input);
    // Select-all on edit start (draft === null at mount).
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("Alpha".length);
  });

  it("Enter commits a changed name through the controller", async () => {
    setProjects([makeProject({ id: "p1", name: "Alpha" })]);
    const { projectsController, view } = setup();

    fireEvent.click(screen.getByText("…"));
    fireEvent.click(screen.getByText("Rename"));
    const input = view.container.querySelector(".aiw-project-rename-input");
    if (!(input instanceof HTMLInputElement)) throw new Error("no input");

    fireEvent.change(input, { target: { value: "Alpha renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await act(async () => {});

    expect(projectsController.renameProject).toHaveBeenCalledWith(
      "p1",
      "Alpha renamed",
    );
  });

  it("Escape cancels the edit with no controller call", () => {
    setProjects([makeProject({ id: "p1", name: "Alpha" })]);
    const { projectsController, view } = setup();

    fireEvent.click(screen.getByText("…"));
    fireEvent.click(screen.getByText("Rename"));
    const input = view.container.querySelector(".aiw-project-rename-input");
    if (!(input instanceof HTMLInputElement)) throw new Error("no input");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(getEditingProjectId()).toBeNull();
    expect(
      view.container.querySelector(".aiw-project-rename-input"),
    ).toBeNull();
    expect(screen.getByText("Alpha")).not.toBeNull();
    expect(projectsController.renameProject).not.toHaveBeenCalled();
  });

  it("Enter in the create input submits like the Create button", () => {
    const { projectsController } = setup();
    const input = screen.getByPlaceholderText("New project name");
    fireEvent.change(input, { target: { value: "Via Enter" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(projectsController.create).toHaveBeenCalledWith("Via Enter");
  });
});
