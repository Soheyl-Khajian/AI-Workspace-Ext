// src/ui/features/projects/projectsDraftState.ts
// ------------------------------------------------------------
// PROJECTS DRAFT STATE
// ------------------------------------------------------------
//
// Responsibility:
// - hold in-flight (not yet submitted) text for the
//   create-project form
// - survive wipe-rebuild re-renders: the renderer re-hydrates
//   the input from here instead of losing typed text
//
// IMPORTANT:
//
// - null and "" are DIFFERENT facts:
//   null = "no draft — show the source of truth"
//   ""   = "user deliberately cleared the field — keep it empty"
//   Callers must hydrate with `draft ?? fallback`, never truthiness.
// - runtime-only memory state — NOT persistent storage
// - NO DOM access, NO rendering, NO business orchestration
// ------------------------------------------------------------

// ------------------------------------------------------------
// PRIVATE STATE
// ------------------------------------------------------------

type ProjectsDraftState = {
  createName: string | null;
};

const state: ProjectsDraftState = {
  createName: null,
};

// ------------------------------------------------------------
// CREATE-PROJECT DRAFT
// ------------------------------------------------------------

export function getCreateProjectNameDraft(): string | null {
  return state.createName;
}

export function setCreateProjectNameDraft(value: string): void {
  state.createName = value;
}

export function clearCreateProjectNameDraft(): void {
  state.createName = null;
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------

export function resetProjectsDraftState(): void {
  state.createName = null;
}
