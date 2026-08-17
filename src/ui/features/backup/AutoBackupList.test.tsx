// src/ui/features/backup/AutoBackupList.test.tsx
/** @vitest-environment jsdom */
// ------------------------------------------------------------
// AUTO-BACKUP LIST COMPONENT TESTS
// ------------------------------------------------------------
//
// Contract under test (see AutoBackupList.tsx):
//
// - three body states: loading (ring not yet read), empty, rows
// - each row shows when + why, newest order as provided
// - Restore delegates the SAME snapshot object the list holds
//   (the ordering law's in-memory copy), and the busy flag
//   disables every Restore button while one restore runs
// ------------------------------------------------------------

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { AutoBackupSnapshot } from "../../../models/backup";
import type { BackupController } from "./backupController";
import { AutoBackupList } from "./AutoBackupList";

function createBackupControllerMock() {
  return {
    exportBackup: vi.fn().mockResolvedValue(undefined),
    importBackup: vi.fn().mockResolvedValue(undefined),
    listAutoBackups: vi.fn().mockResolvedValue([]),
    restoreSnapshot: vi.fn().mockResolvedValue(undefined),
  } satisfies BackupController;
}

/**
 * A ring snapshot with a syntactically complete backup document.
 * The component never validates contents (the controller does), so
 * the document stays minimal.
 */
function makeSnapshot(savedAt: number): AutoBackupSnapshot {
  return {
    savedAt,
    reason: "debounce",
    backup: {
      schemaVersion: 1,
      exportedAt: new Date(savedAt).toISOString(),
      projects: [],
      items: [],
    },
  };
}

describe("AutoBackupList", () => {
  afterEach(cleanup);

  it("shows the loading state until the ring read resolves", () => {
    const controller = createBackupControllerMock();
    // A promise that never settles pins the loading state open.
    controller.listAutoBackups.mockReturnValue(new Promise(() => {}));
    render(<AutoBackupList backupController={controller} />);

    expect(screen.getByText("Loading snapshots…")).not.toBeNull();
  });

  it("shows the empty state when the ring has no snapshots", async () => {
    render(<AutoBackupList backupController={createBackupControllerMock()} />);

    expect(
      await screen.findByText(/No automatic snapshots yet/),
    ).not.toBeNull();
  });

  it("renders one row per snapshot with its reason label", async () => {
    const controller = createBackupControllerMock();
    controller.listAutoBackups.mockResolvedValue([
      makeSnapshot(2_000),
      makeSnapshot(1_000),
    ]);
    render(<AutoBackupList backupController={controller} />);

    const buttons = await screen.findAllByRole("button", { name: "Restore" });
    expect(buttons).toHaveLength(2);
    expect(screen.getAllByText("Shortly after your last change")).toHaveLength(
      2,
    );
  });

  it("restores the exact snapshot object the list holds", async () => {
    const controller = createBackupControllerMock();
    const ring = [makeSnapshot(2_000), makeSnapshot(1_000)];
    controller.listAutoBackups.mockResolvedValue(ring);
    render(<AutoBackupList backupController={controller} />);

    const buttons = await screen.findAllByRole("button", { name: "Restore" });
    fireEvent.click(buttons[1]);

    // toBe, not toEqual: the ordering law restores from the held
    // in-memory copy -- identity is the contract, not shape.
    expect(controller.restoreSnapshot).toHaveBeenCalledTimes(1);
    expect(controller.restoreSnapshot.mock.calls[0][0]).toBe(ring[1]);
  });

  it("disables every Restore button while a restore is running", async () => {
    const controller = createBackupControllerMock();
    const ring = [makeSnapshot(2_000), makeSnapshot(1_000)];
    controller.listAutoBackups.mockResolvedValue(ring);
    // A deferred: the test holds the resolver, so it controls
    // exactly when the in-flight restore completes.
    let finishRestore = () => {};
    controller.restoreSnapshot.mockImplementation(
      () => new Promise<void>((resolve) => (finishRestore = resolve)),
    );
    render(<AutoBackupList backupController={controller} />);

    const buttons = await screen.findAllByRole("button", { name: "Restore" });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(buttons.every((button) => button.hasAttribute("disabled"))).toBe(
        true,
      );
    });

    finishRestore();
    await waitFor(() => {
      expect(buttons.some((button) => button.hasAttribute("disabled"))).toBe(
        false,
      );
    });
  });
});
