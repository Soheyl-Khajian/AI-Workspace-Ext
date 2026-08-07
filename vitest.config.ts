// vitest.config.ts
// ------------------------------------------------------------
// VITEST CONFIG
// ------------------------------------------------------------
//
// silent: "passed-only" -- console output from PASSING tests is
// suppressed (e.g. the [IDB] open/upgrade logs that openDb.ts
// prints on every fresh per-test database). Output from FAILING
// tests still prints in full, which is exactly when those logs
// become diagnostics instead of noise.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    silent: "passed-only",
  },
});
