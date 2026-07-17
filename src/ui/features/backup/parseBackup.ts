// src/ui/features/backup/parseBackup.ts
// ------------------------------------------------------------
// PARSE BACKUP (VALIDATION GATE)
// ------------------------------------------------------------
//
// Responsibility:
//
// - safely parse untrusted backup-file text and validate it is a
//   BackupDocument this app understands, BEFORE it can reach the
//   destructive replace-all import
// - reject wrong / old / corrupted files with a clear message
//
// IMPORTANT:
//
// - PURE: no DOM, no storage, no Date — parse -> validate -> return
// - buildBackup owns the format; this only reads it back
// - only JSON.parse is wrapped in try/catch so each specific
//   validation error message survives
// ------------------------------------------------------------

import type { Item } from "../../../models/item";
import { ITEM_TYPES } from "../../../models/item";
import type { Project } from "../../../models/project";
import { BACKUP_SCHEMA_VERSION, type BackupDocument } from "./buildBackup";

function assertValidProjects(projects: unknown[]): void {
  for (const project of projects) {
    // Guard it's an object BEFORE using `in` / property access.
    if (typeof project !== "object" || project === null) {
      throw new Error("Each project must be an object.");
    }
    const candidate = project as Partial<Project>;
    if (typeof candidate.id !== "string") {
      throw new Error("Each project needs a string id.");
    }
    if (typeof candidate.name !== "string") {
      throw new Error("Each project needs a string name.");
    }
  }
}

function assertValidItems(items: unknown[]): void {
  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      throw new Error("Each item must be an object.");
    }
    const candidate = item as Partial<Item>;
    if (typeof candidate.id !== "string") {
      throw new Error("Each item needs a string id.");
    }
    if (typeof candidate.projectId !== "string") {
      throw new Error("Each item needs a string projectId.");
    }
    if (!(ITEM_TYPES as readonly string[]).includes(candidate.type as string)) {
      throw new Error(`Unknown item type: ${String(candidate.type)}`);
    }
  }
}

export function parseBackup(jsonText: string): BackupDocument {
  // ONLY JSON.parse belongs in the try — everything else must throw freely
  // so its specific message survives.
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("This backup file is malformed.");
  }
  const doc = parsed as Partial<BackupDocument>;

  if (doc.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error("Unsupported backup version.");
  }
  if (!Array.isArray(doc.projects) || !Array.isArray(doc.items)) {
    throw new Error("This backup file is missing its projects or items.");
  }

  assertValidProjects(doc.projects);
  assertValidItems(doc.items);

  return doc as BackupDocument;
}
