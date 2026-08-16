// src/ui/core/ReactPanelHost.test.tsx
/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { BackupController } from "../features/backup/backupController";
import { ReactPanelHost } from "./ReactPanelHost";

function createBackupControllerMock() {
  return {
    exportBackup: vi.fn().mockResolvedValue(undefined),
    importBackup: vi.fn().mockResolvedValue(undefined),
    listAutoBackups: vi.fn().mockResolvedValue([]),
    restoreSnapshot: vi.fn().mockResolvedValue(undefined),
  } satisfies BackupController;
}

describe("ReactPanelHost", () => {
  // Testing Library only auto-cleans between tests when vitest
  // globals are enabled; this project imports explicitly, so
  // cleanup is explicit too.
  afterEach(cleanup);

  it("mounts and exposes the readiness probe", () => {
    const { container } = render(
      <ReactPanelHost
        activePanel={null}
        backupController={createBackupControllerMock()}
      />,
    );

    expect(container.querySelector('[data-aiw-react="ready"]')).not.toBeNull();
  });

  it("renders the backup panel only when it is the active panel", () => {
    const { container, rerender } = render(
      <ReactPanelHost
        activePanel="projects"
        backupController={createBackupControllerMock()}
      />,
    );

    expect(container.querySelector(".aiw-backup-section")).toBeNull();

    rerender(
      <ReactPanelHost
        activePanel="backup"
        backupController={createBackupControllerMock()}
      />,
    );

    expect(container.querySelector(".aiw-backup-section")).not.toBeNull();
  });
});
