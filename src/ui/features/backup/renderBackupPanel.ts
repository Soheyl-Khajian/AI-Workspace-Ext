// src/ui/features/backup/renderBackupPanel.ts
// ------------------------------------------------------------
// RENDER BACKUP PANEL (PRESENTATION)
// ------------------------------------------------------------
//
// Responsibility:
//
// - build the Backup panel DOM: Export and Import controls
//
// IMPORTANT:
//
// - PRESENTATION ONLY — builds and appends DOM
// - NO behavior wiring; clicks are handled centrally via event
//   delegation in floatingController
// - NO state / storage access
// ------------------------------------------------------------

import { createFloatingPanelShell } from "../../shared/createFloatingPanelShell";

export function renderBackupPanel(containerEl: HTMLElement): void {
  const shell = createFloatingPanelShell("Backup");

  const sectionEl = document.createElement("div");
  sectionEl.className = "aiw-backup-section";

  const descriptionParagraphEl = document.createElement("p");
  descriptionParagraphEl.textContent =
    "Export all projects and items to a JSON file, or import a backup to replace everything.";
  sectionEl.append(descriptionParagraphEl);

  const actionsEl = document.createElement("div");
  actionsEl.className = "aiw-backup-actions";

  const exportButtonEl = document.createElement("button");
  exportButtonEl.type = "button";
  exportButtonEl.className = "aiw-backup-export";
  exportButtonEl.textContent = "Export backup";
  actionsEl.append(exportButtonEl);

  const importButtonEl = document.createElement("button");
  importButtonEl.type = "button";
  importButtonEl.className = "aiw-backup-import";
  importButtonEl.textContent = "Import backup";
  actionsEl.append(importButtonEl);

  sectionEl.append(actionsEl);
  shell.panelEl.append(sectionEl);

  // ------------------------------------------------------------
  // FINAL ASSEMBLY
  // ------------------------------------------------------------
  containerEl.append(shell.panelEl);
}
