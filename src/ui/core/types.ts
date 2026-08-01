// src/ui/core/types.ts
// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

import type { Project } from "../../models/project";

export type OrbActionId = "projects" | "backup" | "search";

export type OrbPanelId =
  | "projects"
  | "items"
  | "itemDetail"
  | "backup"
  | "search";

export type RenderContext = {
  projectName: string | null;
  projects: Project[];
};
