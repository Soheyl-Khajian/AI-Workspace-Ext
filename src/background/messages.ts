// src/background/messages.ts
// ------------------------------------------------------------
// CROSS-CONTEXT MESSAGE TYPES
// ------------------------------------------------------------
//
// Responsibility:
// - define all messages passed between extension contexts
// - define the response (ack) shapes those messages answer with
// - provide a shared type contract for senders and listeners
//
// IMPORTANT:
// - NO logic
// - NO Chrome API calls
// - pure types only
//
// To add a new message type:
// 1. define a new named type with a unique "type" literal
// 2. add it to the AiwMessage union
// ------------------------------------------------------------

import type { BackupDocument, SnapshotReason } from "../models/backup";

export type CaptureSelectionMessage = {
  type: "CAPTURE_SELECTION";
  selectionText: string;
  sourceUrl: string;
};

/**
 * Content script -> service worker: "persist this finished backup".
 * Carries the raw document plus the trigger that demanded it. The
 * message carries no clock: the writer stamps savedAt at
 * persistence time.
 */
export type AutoBackupSnapshotMessage = {
  type: "AUTO_BACKUP_SNAPSHOT";
  reason: SnapshotReason;
  backup: BackupDocument;
};

/**
 * Service worker -> sender, answering AUTO_BACKUP_SNAPSHOT.
 * `ok: true` means the ring-buffer write COMMITTED -- only then may
 * the sender call policy.snapshotTaken().
 */
export type AutoBackupAck = {
  ok: boolean;
};

export type AiwMessage = CaptureSelectionMessage | AutoBackupSnapshotMessage;
