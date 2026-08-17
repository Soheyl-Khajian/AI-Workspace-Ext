// src/ui/features/backup/BackupPanel.test.tsx
/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BackupController } from "./backupController";
import { BackupPanel } from "./BackupPanel";

function createBackupControllerMock() {
  return {
    exportBackup: vi.fn().mockResolvedValue(undefined),
    importBackup: vi.fn().mockResolvedValue(undefined),
    listAutoBackups: vi.fn().mockResolvedValue([]),
    restoreSnapshot: vi.fn().mockResolvedValue(undefined),
  } satisfies BackupController;
}

describe("BackupPanel", () => {
  afterEach(cleanup);

  it("renders the description and both actions", async () => {
    render(<BackupPanel backupController={createBackupControllerMock()} />);
    await screen.findByText(/No automatic snapshots yet/);

    expect(screen.getByText(/Export all projects and items/)).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Export backup" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Import backup" }),
    ).not.toBeNull();
  });

  it("delegates an export click to the controller", async () => {
    const backupController = createBackupControllerMock();
    render(<BackupPanel backupController={backupController} />);
    await screen.findByText(/No automatic snapshots yet/);

    fireEvent.click(screen.getByRole("button", { name: "Export backup" }));

    expect(backupController.exportBackup).toHaveBeenCalledTimes(1);
    expect(backupController.importBackup).not.toHaveBeenCalled();
  });

  it("delegates an import click to the controller", async () => {
    const backupController = createBackupControllerMock();
    render(<BackupPanel backupController={backupController} />);
    await screen.findByText(/No automatic snapshots yet/);

    fireEvent.click(screen.getByRole("button", { name: "Import backup" }));

    expect(backupController.importBackup).toHaveBeenCalledTimes(1);
    expect(backupController.exportBackup).not.toHaveBeenCalled();
  });
});
