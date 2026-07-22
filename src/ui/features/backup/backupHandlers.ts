// src/ui/features/backup/backupHandlers.ts
// ------------------------------------------------------------
// BACKUP EVENT HANDLERS (FEATURE BINDINGS)
// ------------------------------------------------------------
//
// Responsibility:
//
// - own the backup panel's DOM event handlers (export / import)
// - own the backup selector constants
// - contribute EventBinding[] to the floating controller's
//   declarative add/remove table via createBackupHandlers()
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO direct storage access (delegates to backupController)
// - NO notify dep on purpose: backupController owns all user
//   notifications for its workflows
// - NO global DOM queries (scoped to deps.panelsEl)
// - listener lifecycle is owned by the CALLER (register + teardown)
// ------------------------------------------------------------

import { type EventBinding } from "../../core/eventBindings";
import type { BackupController } from "./backupController";
import { asListener } from "../../core/eventBindings";

const BACKUP_EXPORT_SELECTOR = ".aiw-backup-export";
const BACKUP_IMPORT_SELECTOR = ".aiw-backup-import";

type BackupHandlersDependencies = {
  panelsEl: HTMLElement;
  backupController: BackupController;
};

export function createBackupHandlers(
  deps: BackupHandlersDependencies,
): EventBinding[] {
  // ----------------------------------------------------------
  // EXPORT BACKUP HANDLER
  // ----------------------------------------------------------

  async function handleExportBackup(event: MouseEvent): Promise<void> {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const exportButton = target.closest(BACKUP_EXPORT_SELECTOR);
    if (!(exportButton instanceof HTMLElement)) {
      return;
    }

    await deps.backupController.exportBackup();
  }

  // ----------------------------------------------------------
  // IMPORT BACKUP HANDLER
  // ----------------------------------------------------------

  async function handleImportBackup(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const importButton = target.closest(BACKUP_IMPORT_SELECTOR);
    if (!(importButton instanceof HTMLElement)) {
      return;
    }
    await deps.backupController.importBackup();
  }

  // ----------------------------------------------------------
  // EVENT BINDINGS
  // ----------------------------------------------------------

  const eventBindings: EventBinding[] = [
    [deps.panelsEl, "click", asListener(handleExportBackup)],
    [deps.panelsEl, "click", asListener(handleImportBackup)],
  ];

  return eventBindings;
}
