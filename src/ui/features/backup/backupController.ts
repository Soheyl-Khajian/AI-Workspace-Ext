// src/ui/features/backup/backupController.ts
// ------------------------------------------------------------
// BACKUP CONTROLLER (FEATURE ORCHESTRATOR)
// ------------------------------------------------------------
//
// Responsibility:
//
// - orchestrate the export workflow (snapshot -> document -> download)
// - orchestrate the import workflow (pick -> parse -> confirm ->
//   replace-all -> refresh)
// - surface success / failure to the user via notify
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO DOM access (file picking lives in a shared utility)
// - NO rendering logic (the post-import refresh is delegated
//   to onImported, owned by the caller)
// - NO format ownership (buildBackup / parseBackup own the shape)
//
// This layer ONLY coordinates systems.
// ------------------------------------------------------------

import { exportAllData, replaceAllData } from "../../../storage";
import { buildBackup } from "./buildBackup";
import type { BackupDocument } from "./buildBackup";
import { parseBackup } from "./parseBackup";
import { downloadJson } from "../../shared/downloadJson";
import { pickJsonFile } from "../../shared/pickJsonFile";
import { toErrorMessage } from "../../shared/toErrorMessage";

// ------------------------------------------------------------
// DEPENDENCIES
// ------------------------------------------------------------

type BackupControllerDependencies = {
  notify: (message: string) => void;
  // Called after a successful import so the caller can reload runtime
  // state and re-render (the DB was fully replaced underneath us).
  onImported: () => Promise<void> | void;
};

// ------------------------------------------------------------
// PUBLIC CONTROLLER API
// ------------------------------------------------------------

export type BackupController = {
  exportBackup: () => Promise<void>;
  importBackup: () => Promise<void>;
};

// ------------------------------------------------------------
// CONTROLLER FACTORY
// ------------------------------------------------------------

export function createBackupController(
  dependencies: BackupControllerDependencies,
): BackupController {
  // ----------------------------------------------------------
  // EXPORT BACKUP WORKFLOW
  // ----------------------------------------------------------
  async function exportBackup(): Promise<void> {
    try {
      const snapshot = await exportAllData();
      const exportedAt = new Date().toISOString();
      const backup = buildBackup(snapshot, exportedAt);

      // Colons and dots are invalid in Windows filenames, so flatten the
      // ISO timestamp (e.g. 2026-07-07T03:59:39.425Z) into a safe stamp.
      const safeStamp = exportedAt.replace(/[:.]/g, "-");
      const filename = `ai-workspace-backup-${safeStamp}.json`;

      downloadJson(backup, filename);
      dependencies.notify("Backup exported");
    } catch (error) {
      dependencies.notify(toErrorMessage(error, "Couldn't export backup."));
    }
  }

  // ----------------------------------------------------------
  // IMPORT BACKUP WORKFLOW
  //
  // pick -> parse -> confirm -> replace-all -> refresh.
  // Each stage can abort cleanly (cancel, invalid file, declined
  // confirm) without touching stored data.
  // ----------------------------------------------------------
  async function importBackup(): Promise<void> {
    // 1) Pick + read a file. null => user cancelled the dialog.
    let jsonText: string | null;
    try {
      jsonText = await pickJsonFile();
    } catch (error) {
      dependencies.notify(
        toErrorMessage(error, "Couldn't read the selected file."),
      );
      return;
    }
    if (jsonText === null) {
      return;
    }

    // 2) Validate BEFORE we threaten any data. Parse failures are an
    //    expected outcome (wrong/edited file), so toast and abort.
    let backup: BackupDocument;
    try {
      backup = parseBackup(jsonText);
    } catch (error) {
      dependencies.notify(
        toErrorMessage(error, "Couldn't read that backup file."),
      );
      return;
    }

    // 3) Destructive guard — only now that we know the file is good.
    const confirmed = window.confirm(
      "Importing will REPLACE all current projects and items with this " +
        "backup. This can't be undone. Continue?",
    );
    if (!confirmed) {
      return;
    }

    // 4) Atomic replace-all.
    try {
      await replaceAllData(backup.projects, backup.items);
    } catch (error) {
      dependencies.notify(toErrorMessage(error, "Couldn't import backup."));
      return;
    }

    // 5) Success — notify, then let the caller rehydrate the UI.
    dependencies.notify("Backup imported");
    await dependencies.onImported();
  }

  return { exportBackup, importBackup };
}
