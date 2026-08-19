// src/ui/core/ReactPanelHost.test.tsx
/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { BackupController } from "../features/backup/backupController";
import type { ProjectsController } from "../features/projects/projectsController";
import { ReactPanelHost } from "./ReactPanelHost";

vi.mock("../../storage", () => ({
  listProjects: vi.fn().mockResolvedValue([]),
  listAllItems: vi.fn().mockResolvedValue([]),
}));

function createBackupControllerMock() {
  return {
    exportBackup: vi.fn().mockResolvedValue(undefined),
    importBackup: vi.fn().mockResolvedValue(undefined),
    listAutoBackups: vi.fn().mockResolvedValue([]),
    restoreSnapshot: vi.fn().mockResolvedValue(undefined),
  } satisfies BackupController;
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

// One fresh prop bag per render: mocks must not leak across tests.
function createHostProps() {
  return {
    backupController: createBackupControllerMock(),
    projectsController: createProjectsControllerMock(),
    openProject: vi.fn(),
    notify: vi.fn(),
    requestRender: vi.fn(),
  };
}

describe("ReactPanelHost", () => {
  // Testing Library only auto-cleans between tests when vitest
  // globals are enabled; this project imports explicitly, so
  // cleanup is explicit too.
  afterEach(cleanup);

  it("mounts and exposes the readiness probe", () => {
    const { container } = render(
      <ReactPanelHost activePanel={null} {...createHostProps()} />,
    );
    expect(container.querySelector('[data-aiw-react="ready"]')).not.toBeNull();
  });

  it("renders the backup panel only when it is the active panel", () => {
    const { container, rerender } = render(
      <ReactPanelHost activePanel="items" {...createHostProps()} />,
    );
    expect(container.querySelector(".aiw-backup-section")).toBeNull();
    rerender(<ReactPanelHost activePanel="backup" {...createHostProps()} />);
    expect(container.querySelector(".aiw-backup-section")).not.toBeNull();
  });

  it("renders the search panel only when it is the active panel", () => {
    const { container, rerender } = render(
      <ReactPanelHost activePanel="items" {...createHostProps()} />,
    );
    expect(container.querySelector(".aiw-search-bar")).toBeNull();
    rerender(<ReactPanelHost activePanel="search" {...createHostProps()} />);
    expect(container.querySelector(".aiw-search-bar")).not.toBeNull();
  });

  it("renders the projects panel only when it is the active panel", () => {
    const { container, rerender } = render(
      <ReactPanelHost activePanel="search" {...createHostProps()} />,
    );
    expect(container.querySelector(".aiw-create-project-form")).toBeNull();
    rerender(<ReactPanelHost activePanel="projects" {...createHostProps()} />);
    expect(container.querySelector(".aiw-create-project-form")).not.toBeNull();
  });
});
