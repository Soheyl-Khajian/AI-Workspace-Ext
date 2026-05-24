// src/ui/floating/orbActions.ts
// ------------------------------------------------------------
// ORB ACTIONS
//
// This is NOT UI. It is domain-level mapping.
// ------------------------------------------------------------

import type { OrbPanelId } from "./types";

export type OrbAction = {
  id: OrbPanelId;
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
