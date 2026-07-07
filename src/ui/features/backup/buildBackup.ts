// src/ui/features/backup/buildBackup.ts
// ------------------------------------------------------------
// BACKUP DOCUMENT BUILDER
// ------------------------------------------------------------
//
// Responsibility:
//
// - wrap a raw storage snapshot into a versioned, self-describing
//   backup document (schemaVersion + exportedAt + data)
// - own the single source-of-truth type and schema version for the
//   on-disk backup format (reused by import / parseBackup)
//
// IMPORTANT:
//
// - PURE: no Date.now(), no I/O, no serialization — the caller
//   supplies the timestamp; downloading and parsing live elsewhere
// - schemaVersion is independent of the IndexedDB DB_VERSION
// ------------------------------------------------------------

import type { Item } from "../../../models/item";
import type { Project } from "../../../models/project";
import type { WorkspaceSnapshot } from "../../../storage";

export const BACKUP_SCHEMA_VERSION = 1;
export type BackupDocument = {
  schemaVersion: number;
  exportedAt: string;
  projects: Project[];
  items: Item[];
};

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
