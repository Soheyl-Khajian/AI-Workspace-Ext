// src/ui/core/orbActions.ts
// ------------------------------------------------------------
// ORB ACTIONS
//
// This is NOT UI. It is domain-level mapping.
// ------------------------------------------------------------

import type { OrbActionId } from "./types";

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
    id: "search",
    label: "Search",
  },
];

export function getOrbActions(): OrbAction[] {
  return orbActions;
}
