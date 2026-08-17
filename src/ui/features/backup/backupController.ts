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
// - orchestrate the restore workflow (ring snapshot -> validate ->
//   confirm -> safety backup -> replace-all -> refresh)
// - surface success / failure to the user via notify
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO DOM access (file picking lives in a shared utility; the
//   destructive confirm is an injected dependency)
// - NO rendering logic (the post-import refresh is delegated
//   to onImported, owned by the caller)
// - NO format ownership (buildBackup / parseBackup own the shape)
//
// This layer ONLY coordinates systems.
// ------------------------------------------------------------

import type { BackupDocument } from "../../../models/backup";
import type { AutoBackupSnapshot } from "../../../models/backup";
import { exportAllData, replaceAllData } from "../../../storage";
import { buildBackup } from "./buildBackup";
import { parseBackup } from "./parseBackup";
import { downloadJson } from "../../shared/downloadJson";
import { pickJsonFile } from "../../shared/pickJsonFile";
import { toErrorMessage } from "../../shared/toErrorMessage";

// ------------------------------------------------------------
// DEPENDENCIES
// ------------------------------------------------------------

type BackupControllerDependencies = {
  notify: (message: string) => void;

  // Awaited between the destructive confirm and replaceAllData: the
  // auto-backup feature takes an emergency snapshot and reports
  // whether the current data is protected. false => ABORT the import
  // (a cancelled import is recoverable; destroyed data is not).
  beforeImport: () => Promise<boolean>;

  // Called after a successful import so the caller can reload runtime
  // state and re-render (the DB was fully replaced underneath us).
  onImported: () => Promise<void> | void;

  // Reads the auto-backup ring (newest first). Injected like
  // sendSnapshot on the write side: the controller stays free of
  // chrome.* APIs; the composition root owns the one chrome-touching
  // read. A read racing a ring write just sees the ring before or
  // after that write -- both are valid lists.
  readAutoBackups: () => Promise<AutoBackupSnapshot[]>;

  // Destructive-action gate. Injected so the controller honors its
  // own "NO DOM access" law (window.confirm quietly violated it)
  // and so workflows are testable in the node environment. The
  // composition root passes a window.confirm arrow; slice 4 may
  // replace it with a React confirm without touching this file.
  confirmDestructive: (message: string) => boolean;
};

// ------------------------------------------------------------
// PUBLIC CONTROLLER API
// ------------------------------------------------------------

export type BackupController = {
  exportBackup: () => Promise<void>;
  importBackup: () => Promise<void>;
  listAutoBackups: () => Promise<AutoBackupSnapshot[]>;
  restoreSnapshot: (snapshot: AutoBackupSnapshot) => Promise<void>;
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
  // pick -> parse -> confirm -> safety backup -> replace-all -> refresh.
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
    const confirmed = dependencies.confirmDestructive(
      "Importing will REPLACE all current projects and items with this " +
        "backup. This can't be undone. Continue?",
    );
    if (!confirmed) {
      return;
    }

    // 4) Emergency snapshot BEFORE destruction. Abort rather than
    //    proceed unprotected (see the beforeImport dependency).
    const backedUp = await dependencies.beforeImport();
    if (!backedUp) {
      dependencies.notify(
        "Couldn't save a safety backup, so the import was cancelled. Please try again.",
      );
      return;
    }

    // 5) Atomic replace-all.
    try {
      await replaceAllData(backup.projects, backup.items);
    } catch (error) {
      dependencies.notify(toErrorMessage(error, "Couldn't import backup."));
      return;
    }

    // 6) Success — notify, then let the caller rehydrate the UI.
    dependencies.notify("Backup imported");
    await dependencies.onImported();
  }

  // ----------------------------------------------------------
  // LIST AUTO-BACKUPS
  //
  // Thin passthrough on purpose: ordering (newest first) and depth
  // are the ring writer's contract, not re-interpreted here. Read
  // failures propagate to the caller, which owns presentation.
  // ----------------------------------------------------------
  async function listAutoBackups(): Promise<AutoBackupSnapshot[]> {
    return dependencies.readAutoBackups();
  }

  // ----------------------------------------------------------
  // RESTORE-FROM-RING WORKFLOW
  //
  // validate -> confirm -> safety backup -> replace-all -> refresh.
  //
  // ORDERING LAW (do not "simplify"): the snapshot argument is an
  // in-memory copy taken from listAutoBackups BEFORE this call, and
  // the ring is NEVER re-read here. The safety backup below pushes
  // a "pre-import" snapshot into the ring, which trims to depth and
  // may EVICT the very slot being restored. Eviction can take the
  // slot; it cannot take our copy.
  // ----------------------------------------------------------
  async function restoreSnapshot(snapshot: AutoBackupSnapshot): Promise<void> {
    // 1) Validate BEFORE we threaten any data. The snapshot came
    //    from buildBackup, but it sat at rest in extension storage
    //    across versions -- so it re-earns trust through the same
    //    validator file imports pass, not a weaker one.
    let backup: BackupDocument;
    try {
      backup = parseBackup(JSON.stringify(snapshot.backup));
    } catch (error) {
      dependencies.notify(
        toErrorMessage(error, "Couldn't read that snapshot."),
      );
      return;
    }

    // 2) Destructive guard -- named by when it was saved, so the
    //    user confirms a specific snapshot, not an abstract action.
    const savedAtLabel = new Date(snapshot.savedAt).toLocaleString();
    const confirmed = dependencies.confirmDestructive(
      `Restoring the snapshot from ${savedAtLabel} will REPLACE all ` +
        "current projects and items. This can't be undone. Continue?",
    );
    if (!confirmed) {
      return;
    }

    // 3) Emergency snapshot BEFORE destruction. Abort rather than
    //    proceed unprotected -- the restore itself must be undoable.
    const backedUp = await dependencies.beforeImport();
    if (!backedUp) {
      dependencies.notify(
        "Couldn't save a safety backup, so the restore was cancelled. Please try again.",
      );
      return;
    }

    // 4) Atomic replace-all from the in-memory copy (see ORDERING LAW).
    try {
      await replaceAllData(backup.projects, backup.items);
    } catch (error) {
      dependencies.notify(toErrorMessage(error, "Couldn't restore backup."));
      return;
    }

    // 5) Success -- notify, then let the caller rehydrate the UI.
    dependencies.notify("Backup restored");
    await dependencies.onImported();
  }

  return { exportBackup, importBackup, listAutoBackups, restoreSnapshot };
}
