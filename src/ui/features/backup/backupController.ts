// src/ui/features/backup/backupController.ts
// ------------------------------------------------------------
// BACKUP CONTROLLER (FEATURE ORCHESTRATOR)
// ------------------------------------------------------------
//
// Responsibility:
//
// - orchestrate the export-backup workflow
// - pull a raw snapshot from storage, stamp it into a versioned
//   backup document, and hand it to the download utility
// - surface success / failure to the user via notify
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO DOM access
// - NO rendering logic
// - NO storage / IndexedDB implementation details
// - NO format ownership (buildBackup owns the document shape)
//
// This layer ONLY coordinates systems.
// ------------------------------------------------------------

import { exportAllData } from "../../../storage";
import { buildBackup } from "./buildBackup";
import { downloadJson } from "../../shared/downloadJson";
import { toErrorMessage } from "../../shared/toErrorMessage";

// ------------------------------------------------------------
// DEPENDENCIES
// ------------------------------------------------------------

type BackupControllerDependencies = {
  notify: (message: string) => void;
};

// ------------------------------------------------------------
// PUBLIC CONTROLLER API
// ------------------------------------------------------------

export type BackupController = {
  exportBackup: () => Promise<void>;
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

  return { exportBackup };
}
