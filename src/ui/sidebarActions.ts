// src/ui/sidebarActions.ts
// ------------------------------------------------------------
// SIDEBAR ACTIONS
//
// Responsibility:
// - Encapsulate UI state transitions
// - Coordinate dependent state updates
// - Provide reusable interaction logic
//
// Rules:
// - No rendering
// - No DOM access
// - No direct storage access
// ------------------------------------------------------------

type SelectProjectDeps = {
  setSelectedProjectId: (projectId: string | null) => void;
  setSelectedItemId: (itemId: string | null) => void;
  refreshItemsState: () => Promise<void>;
};

type SelectItemDeps = {
  setSelectedItemId: (itemId: string | null) => void;
};

// ------------------------------------------------------------
// PROJECT SELECTION
// ------------------------------------------------------------

export async function selectProject(
  projectId: string,
  deps: SelectProjectDeps,
): Promise<void> {
  // Update primary selection
  deps.setSelectedProjectId(projectId);

  // Reset dependent selection
  deps.setSelectedItemId(null);

  // Synchronize dependent items state
  await deps.refreshItemsState();
}

// ------------------------------------------------------------
// ITEM SELECTION
// ------------------------------------------------------------

export function selectItem(itemId: string, deps: SelectItemDeps): void {
  deps.setSelectedItemId(itemId);
}
