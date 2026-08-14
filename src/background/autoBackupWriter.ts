// src/background/autoBackupWriter.ts
// ------------------------------------------------------------
// AUTO-BACKUP RING-BUFFER WRITER
// ------------------------------------------------------------
//
// Responsibility:
//
// - persist auto-backup snapshots into a fixed-depth ring in
//   chrome.storage.local: newest first, oldest evicted
// - serialize every write through a promise queue so concurrent
//   messages can never interleave a read-modify-write and lose
//   a snapshot
//
// Why chrome.storage.local: it is extension-scoped, so it survives
// a chatgpt.com site-data wipe -- the disaster this feature exists
// to answer.
//
// On the service worker's "NO runtime state" law: this module
// holds state (the queue), but the queue only carries meaning
// while a write is in flight, and Chrome keeps the worker alive
// while a message channel awaits a response. A worker suspended by
// Chrome is therefore one whose queue was already empty --
// suspension can reset the queue, never lose a write.
// ------------------------------------------------------------

import type {
  AutoBackupSnapshot,
  BackupDocument,
  SnapshotReason,
} from "../models/backup";

export const AUTO_BACKUP_STORAGE_KEY = "aiw_auto_backups";

/**
 * Ring depth: how many snapshots survive before the oldest is
 * evicted -- i.e. how many post-corruption snapshots the system
 * tolerates before the last good copy is gone.
 */
export const AUTO_BACKUP_RETENTION = 5;

// The serialization queue. Every write chains onto the settled
// tail of the previous one, so read-modify-write sequences execute
// strictly one at a time, in arrival order.
let queue: Promise<void> = Promise.resolve();

/**
 * The actual read-modify-write. Runs only inside the queue; never
 * call it directly. Stamps savedAt here -- at persistence time --
 * so the timestamp is honest even when the write sat queued behind
 * another.
 */
async function performWrite(
  reason: SnapshotReason,
  backup: BackupDocument,
): Promise<AutoBackupSnapshot[]> {
  const result = await chrome.storage.local.get(AUTO_BACKUP_STORAGE_KEY);
  const existing =
    (result[AUTO_BACKUP_STORAGE_KEY] as AutoBackupSnapshot[] | undefined) ?? [];

  const record: AutoBackupSnapshot = {
    savedAt: Date.now(),
    reason,
    backup,
  };

  // Newest first, then trim to depth: index 0 is always the latest.
  const updated = [record, ...existing].slice(0, AUTO_BACKUP_RETENTION);

  await chrome.storage.local.set({ [AUTO_BACKUP_STORAGE_KEY]: updated });
  return updated;
}

/**
 * Queue one snapshot write. Resolves with the updated ring once
 * the write has COMMITTED; rejects if it failed.
 *
 * A failed write has two consumers with opposite needs:
 * - the CALLER must see the failure, so the service worker can ack
 *   ok: false and the policy stays dirty and retries later;
 * - the QUEUE must survive it -- a rejected tail would poison
 *   every future write forever.
 * Hence two promises: `write` is returned untouched (failure
 * delivered), while the queue chains onto a copy with both arms
 * absorbed (failure contained).
 */
export function enqueueAutoBackupWrite(
  reason: SnapshotReason,
  backup: BackupDocument,
): Promise<AutoBackupSnapshot[]> {
  const write = queue.then(() => performWrite(reason, backup));

  queue = write.then(
    () => undefined,
    () => undefined,
  );

  return write;
}
