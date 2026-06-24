// src/ui/shared/toErrorMessage.ts
// ------------------------------------------------------------
// ERROR NORMALIZER
// ------------------------------------------------------------
// Converts an unknown thrown value into a user-readable string.
// Used by controllers to surface mutation failures (SPEC §23).
// ------------------------------------------------------------

export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}
