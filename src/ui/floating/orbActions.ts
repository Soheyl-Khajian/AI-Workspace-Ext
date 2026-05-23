// src/ui/floating/orbActions.ts
// ------------------------------------------------------------
// ORB ACTIONS
//
// This is NOT UI. It is domain-level mapping.

export type OrbActionId = "projects" | "capture" | "search";

export type OrbAction = {
  id: OrbActionId;
  label: string;
};

const orbActions: OrbAction[] = [
  {
    id: "projects",
    label: "Projects",
  },
  {
    id: "capture",
    label: "Capture",
  },
  {
    id: "search",
    label: "Search",
  },
];

export function getOrbActions(): OrbAction[] {
  return orbActions;
}
