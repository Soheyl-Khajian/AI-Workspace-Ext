// src/models/backup.ts
// ------------------------------------------------------------
// BACKUP FORMAT TYPES (SHARED VOCABULARY)
// ------------------------------------------------------------
//
// Responsibility:
//
// - own the backup types BOTH sides of the extension must agree
//   on: the on-disk backup document, the auto-backup trigger
//   reasons, and the stored auto-backup record
//
// IMPORTANT:
//
// - pure types only -- no logic, no behavior-bearing constants
//   (BACKUP_SCHEMA_VERSION stays in buildBackup.ts, which stamps it)
// - models import nothing outside models; every layer may import
//   models, so the dependency arrows stay clean
// ------------------------------------------------------------

import type { Project } from "./project";
import type { Item } from "./item";

/**
 * The versioned, self-describing on-disk backup format.
 * buildBackup stamps it on export; parseBackup validates it back
 * in on import.
 */
export type BackupDocument = {
  schemaVersion: number;
  exportedAt: string;
  projects: Project[];
  items: Item[];
};

/**
 * Which auto-backup trigger fired. Decided by autoBackupPolicy,
 * carried across the message channel, and stored with each copy
 * so every snapshot can explain its own existence.
 */
export type SnapshotReason =
  | "count-cap"
  | "debounce"
  | "pagehide"
  | "pre-import";

/**
 * One stored auto-backup: a slot in the service worker's ring
 * buffer. `savedAt` is stamped by the writer at persistence time,
 * so it records when the copy reached safety -- not when some
 * earlier context built or sent it.
 */
export type AutoBackupSnapshot = {
  savedAt: number;
  reason: SnapshotReason;
  backup: BackupDocument;
};
