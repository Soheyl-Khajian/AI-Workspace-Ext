// src/ui/features/backup/AutoBackupList.tsx
// ------------------------------------------------------------
// AUTO-BACKUP LIST (REACT)
// ------------------------------------------------------------
//
// Responsibility:
// - render the auto-backup ring: one row per snapshot (when it
//   was saved + why), each with a Restore action delegating to
//   the injected backupController
// - own the list's transient state: the loaded ring (null while
//   loading -- a different fact from "loaded, empty") and the
//   busy flag disabling every Restore button while one runs
//
// IMPORTANT:
// - the mount effect reads the ring once per panel open; the
//   cleanup flag drops a late read landing after unmount
// - rows follow the adaptive discipline: touch-sized targets,
//   always-visible actions, no fixed dimensions
// - NO notify dep on purpose: backupController owns all user
//   notifications for its workflows
// ------------------------------------------------------------

import { useState, useEffect, ReactNode } from "react";
import type { BackupController } from "./backupController";
import type {
  AutoBackupSnapshot,
  SnapshotReason,
} from "../../../models/backup";

type Props = { backupController: BackupController };

const reasonLabels: Record<SnapshotReason, string> = {
  "count-cap": "After a burst of changes",
  debounce: "Shortly after your last change",
  pagehide: "When you left the page",
  "pre-import": "Safety copy before a restore or import",
};

export function AutoBackupList({ backupController }: Props) {
  const [snapshots, setSnapshots] = useState<AutoBackupSnapshot[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void backupController.listAutoBackups().then((ring) => {
      if (!cancelled) setSnapshots(ring);
    });
    return () => {
      cancelled = true;
    };
  }, [backupController]);

  async function handleRestore(snapshot: AutoBackupSnapshot): Promise<void> {
    // A successful restore flips to the projects panel via
    // onImported, unmounting this list mid-await; the finally then
    // sets state on an unmounted component, which React ignores by
    // design. Harmless -- and the busy release still matters on
    // every failure path, where we stay mounted.
    setBusy(true);
    try {
      await backupController.restoreSnapshot(snapshot);
    } finally {
      setBusy(false);
    }
  }

  let body: ReactNode;
  if (snapshots === null) {
    body = <div className="aiw-panel-state">Loading snapshots…</div>;
  } else if (snapshots.length === 0) {
    body = (
      <div className="aiw-panel-state">
        No automatic snapshots yet. They appear as you make changes.
      </div>
    );
  } else {
    body = (
      <div className="aiw-backup-ring__list">
        {snapshots.map((snapshot) => (
          <div className="aiw-backup-ring__row" key={snapshot.savedAt}>
            <div className="aiw-backup-ring__meta">
              <span className="aiw-backup-ring__time">
                {new Date(snapshot.savedAt).toLocaleString()}
              </span>
              <span className="aiw-backup-ring__reason">
                {reasonLabels[snapshot.reason]}
              </span>
            </div>

            <button
              className="aiw-backup-ring__restore"
              type="button"
              disabled={busy}
              onClick={() => void handleRestore(snapshot)}
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="aiw-backup-ring">
      <h3 className="aiw-backup-ring__title">Automatic snapshots</h3>
      {body}
    </div>
  );
}
