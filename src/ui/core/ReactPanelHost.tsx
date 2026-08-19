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
// ------------------------------------------------------------

import type { OrbPanelId } from "./types";
import type { BackupController } from "../features/backup/backupController";
import { BackupPanel } from "../features/backup/BackupPanel";
import { SearchPanel } from "../features/search/SearchPanel";

type Props = {
  activePanel: OrbPanelId | null;
  backupController: BackupController;
  openProject: (projectId: string) => void;
};

export function ReactPanelHost({
  activePanel,
  backupController,
  openProject,
}: Props) {
  return (
    <div data-aiw-react="ready">
      {activePanel === "backup" ? (
        <BackupPanel backupController={backupController} />
      ) : null}

      {activePanel === "search" ? (
        <SearchPanel openProject={openProject} />
      ) : null}
    </div>
  );
}
