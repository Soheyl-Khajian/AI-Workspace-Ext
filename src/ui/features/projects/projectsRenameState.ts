// src/ui/features/projects/projectsRenameState.ts
// ------------------------------------------------------------
// PROJECTS RENAME STATE (edit mode)
// ------------------------------------------------------------
//
// Responsibility:
//
// - hold the rename edit MODE: which project is being renamed
// - hold the in-flight rename text (draft) for that edit
//
// IMPORTANT:
//
// - INVARIANT: draftName is null whenever editingProjectId is
//   null. Both fields change ONLY through start/stop/set below —
//   that is what makes the invariant structural, not conventional.
// - null and "" are DIFFERENT facts:
//   null = "no draft — hydrate from the stored project name"
//   ""   = "user deliberately cleared the field — keep it empty"
//   Callers must hydrate with `draft ?? fallback`, never truthiness.
// - draftName === null also means "first render of this edit" —
//   the renderer uses it to select-all exactly once
// - mode state, NOT form-text state: this changes WHAT the
//   renderer draws (input vs span), which is why it lives apart
//   from projectsDraftState
// - runtime-only memory state — NOT persistent storage
// - NO DOM access, NO rendering, NO business orchestration
// ------------------------------------------------------------

// ------------------------------------------------------------
// STATE SHAPE
// ------------------------------------------------------------
type ProjectsRenameState = {
  editingProjectId: string | null;
  draftName: string | null;
};

// ------------------------------------------------------------
// PRIVATE STATE
// ------------------------------------------------------------
const state: ProjectsRenameState = { editingProjectId: null, draftName: null };

// ------------------------------------------------------------
// GETTERS
// ------------------------------------------------------------
export function getEditingProjectId(): string | null {
  return state.editingProjectId;
}

export function getRenameDraft(): string | null {
  return state.draftName;
}

// ------------------------------------------------------------
// MUTATIONS
// ------------------------------------------------------------
export function setRenameDraft(value: string): void {
  state.draftName = value;
}

export function startRenameEditing(projectId: string): void {
  state.editingProjectId = projectId;
  state.draftName = null;
}

export function stopRenameEditing(): void {
  state.editingProjectId = null;
  state.draftName = null;
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------
export function resetProjectsRenameState(): void {
  state.editingProjectId = null;
  state.draftName = null;
}
