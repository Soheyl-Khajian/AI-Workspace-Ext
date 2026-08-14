// src/ui/features/backup/autoBackupController.test.ts
// ------------------------------------------------------------
// AUTO-BACKUP CONTROLLER -- POLICY WIRING TESTS
// ------------------------------------------------------------
//
// Under test: the controller that connects the mutation bus to
// the snapshot pipeline -- debounce arming/re-arming, the count
// cap, ack discipline (ok:false keeps the policy dirty),
// single-flight dropping, pagehide, stop(), and beforeImport.
//
// Environment notes, and one deliberate asymmetry:
//
// - FULL fake timers, unlike index.test.ts (Date only). That
//   suite runs real fake-indexeddb work, which hangs under a
//   frozen clock. Here the storage facade is mocked away, so no
//   real async machinery needs the clock to move -- and freezing
//   setTimeout is exactly what lets us drive the debounce by hand.
//
// - vi.mock("../../../storage") is HOISTED above the imports by
//   vitest, so the factory must be self-contained: it must not
//   reference any variable declared in this file.
//
// - The window stub is created once at module scope and never
//   unstubbed: per-test unstubbing would strip window from every
//   test after the first, and vitest's per-file isolation means
//   the stub cannot leak into other suites.
//
// - Flush idiom: await vi.advanceTimersByTimeAsync(0) drains the
//   whole microtask queue. A bare `await Promise.resolve()` yields
//   exactly ONE hop and silently couples the test to the number
//   of awaits inside the controller.
//
// - The mutation bus is REAL -- these tests enter through
//   notifyMutation(), the same door production uses.
// ------------------------------------------------------------

import type { BackupDocument, SnapshotReason } from "../../../models/backup";
import type { AutoBackupAck } from "../../../background/messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  notifyMutation,
  resetMutationEvents,
} from "../../../storage/mutationEvents";
import { createAutoBackupController } from "./autoBackupController";
import { BACKUP_SCHEMA_VERSION } from "./buildBackup";

vi.mock("../../../storage", () => ({
  exportAllData: vi.fn(async () => ({ projects: [], items: [] })),
}));

// Declared before the stub that closes over it: the arrows below
// only read it at call time, but declaration-before-use reads true.
const pagehideHandlers = new Set<() => void>();

vi.stubGlobal("window", {
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (id: number) => clearTimeout(id),
  addEventListener: (type: string, fn: () => void) => {
    if (type === "pagehide") pagehideHandlers.add(fn);
  },
  removeEventListener: (type: string, fn: () => void) => {
    if (type === "pagehide") pagehideHandlers.delete(fn);
  },
});

let sendSnapshot: ReturnType<
  typeof vi.fn<
    (reason: SnapshotReason, backup: BackupDocument) => Promise<AutoBackupAck>
  >
>;
let autoBackupController: ReturnType<typeof createAutoBackupController>;

const config = { debounceMs: 1_000, maxMutations: 3 };

function firePagehide(): void {
  for (const handler of pagehideHandlers) {
    handler();
  }
}

// File-level hooks run for every test in every describe below --
// one setup, zero copies to drift apart.
beforeEach(() => {
  vi.useFakeTimers();
  resetMutationEvents();
  sendSnapshot = vi.fn();
  sendSnapshot.mockResolvedValue({ ok: true });
  autoBackupController = createAutoBackupController({
    config,
    sendSnapshot,
  });
  autoBackupController.start();
});

afterEach(() => {
  autoBackupController.stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("debounce wiring", () => {
  it("a mutation followed by the quiet period snapshots with reason 'debounce'", async () => {
    notifyMutation();
    expect(sendSnapshot).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(config.debounceMs);
    expect(sendSnapshot).toHaveBeenCalledTimes(1);
    expect(sendSnapshot.mock.calls[0][0]).toBe("debounce");
  });

  it("mutations restart the quiet period", async () => {
    notifyMutation();
    await vi.advanceTimersByTimeAsync(600);
    notifyMutation();
    await vi.advanceTimersByTimeAsync(600);
    expect(sendSnapshot).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(400);
    expect(sendSnapshot).toHaveBeenCalledTimes(1);
  });

  it("the sent backup is built from the exported snapshot", async () => {
    notifyMutation();
    await vi.advanceTimersByTimeAsync(config.debounceMs);

    const [, backup] = sendSnapshot.mock.calls[0];
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(backup.projects).toEqual([]);
    expect(backup.items).toEqual([]);
  });
});

describe("count-cap", () => {
  it("the Nth mutation snapshots immediately with reason 'count-cap'", async () => {
    notifyMutation();
    notifyMutation();
    notifyMutation();
    await vi.advanceTimersByTimeAsync(0); // flush, no time passes

    expect(sendSnapshot).toHaveBeenCalledTimes(1);
    expect(sendSnapshot.mock.calls[0][0]).toBe("count-cap");
  });

  it("a committed snapshot disarms the pending timer", async () => {
    notifyMutation();
    notifyMutation();
    notifyMutation();

    // Draining the full quiet period must NOT produce a second
    // snapshot: the count-cap commit already cleared the timer.
    await vi.advanceTimersByTimeAsync(config.debounceMs);
    expect(sendSnapshot).toHaveBeenCalledTimes(1);
  });
});

describe("ack discipline", () => {
  it("ok: true resets the counters", async () => {
    notifyMutation();
    notifyMutation();
    notifyMutation();
    await vi.advanceTimersByTimeAsync(0);
    expect(sendSnapshot).toHaveBeenCalledTimes(1);

    // The proof: two more mutations stay under the cap ONLY if
    // the committed snapshot reset the count. Without the reset
    // the running count would be 5 >= 3 and fire again here.
    notifyMutation();
    notifyMutation();
    await vi.advanceTimersByTimeAsync(0);
    expect(sendSnapshot).toHaveBeenCalledTimes(1);

    notifyMutation();
    await vi.advanceTimersByTimeAsync(0);
    expect(sendSnapshot).toHaveBeenCalledTimes(2);
    expect(sendSnapshot.mock.calls[1][0]).toBe("count-cap");
  });

  it("ok: false leaves the policy dirty and a later trigger retries", async () => {
    sendSnapshot.mockResolvedValueOnce({ ok: false });

    notifyMutation();
    await vi.advanceTimersByTimeAsync(config.debounceMs);
    expect(sendSnapshot).toHaveBeenCalledTimes(1);

    // Pagehide adds no new mutation and only fires when dirty --
    // so a second call here proves the failure preserved the dirt.
    firePagehide();
    await vi.advanceTimersByTimeAsync(0);
    expect(sendSnapshot).toHaveBeenCalledTimes(2);
    expect(sendSnapshot.mock.calls[1][0]).toBe("pagehide");
  });

  it("a rejected send behaves like ok: false and never throws", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    sendSnapshot.mockRejectedValueOnce(new Error("send failed"));

    notifyMutation();
    await vi.advanceTimersByTimeAsync(config.debounceMs);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(sendSnapshot).toHaveBeenCalledTimes(1);

    firePagehide();
    await vi.advanceTimersByTimeAsync(0);
    expect(sendSnapshot).toHaveBeenCalledTimes(2);
    expect(sendSnapshot.mock.calls[1][0]).toBe("pagehide");
  });
});

describe("single-flight", () => {
  it("triggers during an in-flight snapshot are dropped, not queued", async () => {
    let resolveSnapshot!: (ack: AutoBackupAck) => void;
    sendSnapshot.mockImplementationOnce(
      () =>
        new Promise<AutoBackupAck>((resolve) => {
          resolveSnapshot = resolve;
        }),
    );

    notifyMutation();
    await vi.advanceTimersByTimeAsync(config.debounceMs);
    expect(sendSnapshot).toHaveBeenCalledTimes(1);

    // Count-cap triggers land while the first send is airborne.
    notifyMutation();
    notifyMutation();
    notifyMutation();
    await vi.advanceTimersByTimeAsync(0);
    expect(sendSnapshot).toHaveBeenCalledTimes(1);

    resolveSnapshot({ ok: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(sendSnapshot).toHaveBeenCalledTimes(1);
  });
});

describe("pagehide", () => {
  it("pagehide with unsnapshotted mutations snapshots with reason 'pagehide'", async () => {
    notifyMutation();

    firePagehide();
    await vi.advanceTimersByTimeAsync(0);

    expect(sendSnapshot).toHaveBeenCalledTimes(1);
    expect(sendSnapshot.mock.calls[0][0]).toBe("pagehide");
  });

  it("pagehide with nothing to save does nothing", async () => {
    firePagehide();
    await vi.advanceTimersByTimeAsync(0);

    expect(sendSnapshot).toHaveBeenCalledTimes(0);
  });
});

describe("stop()", () => {
  it("stop disconnects the bus, the timer, and pagehide", async () => {
    notifyMutation();
    autoBackupController.stop();

    await vi.advanceTimersByTimeAsync(config.debounceMs);
    expect(sendSnapshot).toHaveBeenCalledTimes(0);

    notifyMutation();
    await vi.advanceTimersByTimeAsync(config.debounceMs);
    expect(sendSnapshot).toHaveBeenCalledTimes(0);

    expect(pagehideHandlers.size).toBe(0);
  });
});

describe("beforeImport", () => {
  it("resolves true after a committed emergency snapshot", async () => {
    const preImport = await autoBackupController.beforeImport();

    expect(preImport).toBe(true);
    expect(sendSnapshot.mock.calls[0][0]).toBe("pre-import");
  });

  it("resolves false when the snapshot is refused", async () => {
    sendSnapshot.mockResolvedValue({ ok: false });

    const result = await autoBackupController.beforeImport();

    expect(result).toBe(false);
    expect(sendSnapshot).toHaveBeenCalledTimes(1);
  });

  it("resolves false when the snapshot send fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    sendSnapshot.mockRejectedValueOnce(new Error("send failed"));

    const result = await autoBackupController.beforeImport();

    expect(result).toBe(false);
    expect(sendSnapshot).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});
