// src/ui/features/backup/BackupPanel.tsx
// ------------------------------------------------------------
// BACKUP PANEL (REACT)
// ------------------------------------------------------------
//
// Responsibility:
// - the Backup panel: export and import controls, plus the
//   auto-backup ring list (AutoBackupList) composed below them
// - buttons own their clicks and delegate straight to the
//   injected backupController (what took a renderer plus a
//   delegation handler module in vanilla is one component here)
//
// IMPORTANT:
// - NO notify dep on purpose: backupController owns all user
//   notifications for its workflows
// - NO storage access, NO business logic (controller's job)
// ------------------------------------------------------------

import type { BackupController } from "./backupController";
import { FloatingPanelShell } from "../../shared/FloatingPanelShell";
import { AutoBackupList } from "./AutoBackupList";

type Props = { backupController: BackupController };

export function BackupPanel({ backupController }: Props) {
  return (
    <FloatingPanelShell title="Backup">
      <div className="aiw-backup-section">
        <p>
          Export all projects and items to a JSON file, or import a backup to
          replace everything.
        </p>
        <div className="aiw-backup-actions">
          <button
            type="button"
            className="aiw-backup-export"
            onClick={() => void backupController.exportBackup()}
          >
            Export backup
          </button>
          <button
            type="button"
            className="aiw-backup-import"
            onClick={() => void backupController.importBackup()}
          >
            Import backup
          </button>
        </div>
      </div>

      <AutoBackupList backupController={backupController} />
    </FloatingPanelShell>
  );
}
