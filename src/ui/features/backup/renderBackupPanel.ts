// src/ui/features/backup/renderBackupPanel.ts
// ------------------------------------------------------------
// RENDER BACKUP PANEL (PRESENTATION)
// ------------------------------------------------------------
//
// Responsibility:
//
// - build the Backup panel DOM: an Export control
//   (Import is added in a later slice)
//
// IMPORTANT:
//
// - PRESENTATION ONLY — builds and appends DOM
// - NO behavior wiring; the Export click is handled centrally
//   via event delegation in floatingController
// - NO state / storage access
// ------------------------------------------------------------

import { createFloatingPanelShell } from "../../shared/createFloatingPanelShell";

export function renderBackupPanel(containerEl: HTMLElement): void {
  const shell = createFloatingPanelShell("Backup");

  const sectionEl = document.createElement("div");
  sectionEl.className = "aiw-backup-section";

  const descriptionParagraphEl = document.createElement("p");
  descriptionParagraphEl.textContent =
    "Download all projects and items as a JSON file.";
  sectionEl.append(descriptionParagraphEl);

  const exportButtonEl = document.createElement("button");
  exportButtonEl.type = "button";
  exportButtonEl.className = "aiw-backup-export";
  exportButtonEl.textContent = "Export backup";
  sectionEl.append(exportButtonEl);

  shell.panelEl.append(sectionEl);

  // ------------------------------------------------------------
  // FINAL ASSEMBLY
  // ------------------------------------------------------------

  containerEl.append(shell.panelEl);
}
