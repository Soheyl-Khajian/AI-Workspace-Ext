// src/ui/core/ReactPanelHost.tsx
// ------------------------------------------------------------
// REACT PANEL HOST
// ------------------------------------------------------------
//
// Responsibility:
//
// - the single React entry component: everything React renders
//   in the floating UI lives under this component
// - receives the active panel id from renderUi on every render
//   pass and routes it: React-owned panels render here, all
//   others render null (the vanilla coordinator's mirror image)
// - the probe attribute proves the root survives vanilla
//   re-renders
//
// IMPORTANT:
//
// - mounted ONCE by the composition root into #aiw-react-panels,
//   a SIBLING of the wiped #aiw-orb-panels container — vanilla
//   clears its own subtree, React reconciles this one; neither
//   touches the other's
// - projects/projectName arrive as PROPS computed by renderUi:
//   the items feature must never import projectsState (sibling
//   decoupling rule)
// ------------------------------------------------------------
import type { OrbPanelId } from "./types";
import type { Project } from "../../models/project";
import type { BackupController } from "../features/backup/backupController";
import type { ItemsController } from "../features/items/itemsController";
import type { ProjectsController } from "../features/projects/projectsController";
import { BackupPanel } from "../features/backup/BackupPanel";
import { ItemsPanel } from "../features/items/ItemsPanel";
import { ProjectsPanel } from "../features/projects/ProjectsPanel";
import { SearchPanel } from "../features/search/SearchPanel";

type Props = {
  activePanel: OrbPanelId | null;
  backupController: BackupController;
  projectsController: ProjectsController;
  itemsController: ItemsController;
  projects: Project[];
  projectName: string | null;
  openProject: (projectId: string) => void;
  notify: (message: string) => void;
  resolveProjectName: (projectId: string) => string;
  hasActiveInlineEdit: () => boolean;
  requestRender: () => void;
};

export function ReactPanelHost({
  activePanel,
  backupController,
  projectsController,
  itemsController,
  projects,
  projectName,
  openProject,
  notify,
  resolveProjectName,
  hasActiveInlineEdit,
  requestRender,
}: Props) {
  return (
    <div data-aiw-react="ready">
      {activePanel === "backup" ? (
        <BackupPanel backupController={backupController} />
      ) : null}
      {activePanel === "search" ? (
        <SearchPanel openProject={openProject} />
      ) : null}
      {activePanel === "projects" ? (
        <ProjectsPanel
          projectsController={projectsController}
          notify={notify}
          requestRender={requestRender}
        />
      ) : null}
      {activePanel === "items" ? (
        <ItemsPanel
          itemsController={itemsController}
          projects={projects}
          projectName={projectName}
          notify={notify}
          resolveProjectName={resolveProjectName}
          hasActiveInlineEdit={hasActiveInlineEdit}
          requestRender={requestRender}
        />
      ) : null}
    </div>
  );
}
