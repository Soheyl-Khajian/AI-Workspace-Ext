// src/ui/features/backup/buildBackup.ts
// ------------------------------------------------------------
// BACKUP DOCUMENT BUILDER
// ------------------------------------------------------------
//
// Responsibility:
//
// - wrap a raw storage snapshot into a versioned, self-describing
//   backup document (schemaVersion + exportedAt + data)
// - own the schema-version stamp for the on-disk backup format
//   (the BackupDocument type itself lives in models/backup.ts as
//   shared vocabulary for the UI and background layers alike)
//
// IMPORTANT:
//
// - PURE: no Date.now(), no I/O, no serialization — the caller
//   supplies the timestamp; downloading and parsing live elsewhere
// - schemaVersion is independent of the IndexedDB DB_VERSION
// ------------------------------------------------------------

import type { BackupDocument } from "../../../models/backup";
import type { WorkspaceSnapshot } from "../../../storage";

export const BACKUP_SCHEMA_VERSION = 1;

export function buildBackup(
  snapshot: WorkspaceSnapshot,
  exportedAt: string,
): BackupDocument {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    projects: snapshot.projects,
    items: snapshot.items,
  };
}
