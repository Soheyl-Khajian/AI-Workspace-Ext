// src/ui/features/projects/projectsMenuState.ts
// ------------------------------------------------------------
// PROJECTS ROW MENU STATE
// ------------------------------------------------------------
//
// Responsibility:
// - track which project row's "…" menu is open (at most one)
//
// IMPORTANT:
// - menu openness is STATE, not DOM: renderers re-project the
//   open menu after every wipe-rebuild, so a background
//   re-render can never close it (DOM-held-state ledger)
// - "only one open" WITHIN this feature is structural — a
//   single variable cannot hold two menus. ACROSS features it
//   is owned by the coordinator glue in the composition root.
// - project menus have NO second page: the whole state is one
//   nullable id. "movePicker" is an items-menu concept and is
//   deliberately unrepresentable here.
// ------------------------------------------------------------

let openMenuProjectId: string | null = null;

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

export function getOpenProjectMenuId(): string | null {
  return openMenuProjectId;
}

// ------------------------------------------------------------
// TRANSITIONS
// ------------------------------------------------------------

export function openProjectMenu(projectId: string): void {
  // Last write wins: opening a menu implicitly closes any other
  // project menu — structurally, not by convention.
  openMenuProjectId = projectId;
}

export function closeProjectMenu(): void {
  openMenuProjectId = null;
}

// ------------------------------------------------------------
// RESET (import/reload path)
// ------------------------------------------------------------
//
// Same body as closeProjectMenu today, but a separate door on
// purpose: every state module exposes reset* for the
// import/reload path, and the two doors may diverge later.
// ------------------------------------------------------------

export function resetProjectsMenuState(): void {
  openMenuProjectId = null;
}
