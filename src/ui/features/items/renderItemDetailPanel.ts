// src/ui/features/items/renderItemDetailPanel.ts
// ------------------------------------------------------------
// ITEM DETAIL PANEL RENDERER
// ------------------------------------------------------------
//
// Responsibility:
//
// - render item detail floating panel
// - display selected item fields in editable form
// - render the project select (the move-item control)
// - mount item detail UI into provided container
//
// IMPORTANT:
//
// - PURE renderer
// - NO state mutation
// - NO storage access
// - NO async logic
// - NO business logic
// - NO global DOM queries
//
// Derives item from selectedItemId in sessionState
// matched against current items snapshot in itemsState.
// ------------------------------------------------------------

import type { Project } from "../../../models/project";
import { getSelectedItemId } from "../../core/sessionState";
import { createFloatingPanelShell } from "../../shared/createFloatingPanelShell";
import { createPanelState } from "../../shared/createPanelState";
import { getItems } from "./itemsState";
import {
  getItemDetailTitleDraft,
  getItemDetailContentDraft,
} from "./itemsDraftState";

export function renderItemDetailPanel(
  containerEl: HTMLElement,
  projectName: string | null,
  projects: Project[],
): HTMLElement {
  // ------------------------------------------------------------
  // READ RUNTIME STATE SNAPSHOT
  // ------------------------------------------------------------

  const selectedItemId = getSelectedItemId();
  const items = getItems();

  // ------------------------------------------------------------
  // PANEL SHELL
  // ------------------------------------------------------------
  let muted = false;
  let label = projectName;
  let panelTitle = "Item Detail";
  const item = items.find((candidate) => candidate.id === selectedItemId);

  if (item) {
    const hasTitle = item.title.trim().length > 0;
    panelTitle = hasTitle ? item.title : "Untitled";
  }

  if (label === null) {
    muted = true;
    label = "Select a project";
  }
  const shell = createFloatingPanelShell(panelTitle, {
    label,
    muted,
  });

  const backButtonEl = document.createElement("button");
  backButtonEl.type = "button";
  backButtonEl.className = "aiw-panel-back-button";
  backButtonEl.textContent = "←";

  shell.headerEl.prepend(backButtonEl);

  // ------------------------------------------------------------
  // STATE-DRIVEN RENDER FLOW
  // ------------------------------------------------------------

  if (!item) {
    const placeholderStateEl = createPanelState({
      variant: "placeholder",
      message: "Item not found",
    });

    shell.bodyEl.append(placeholderStateEl);
  }

  // ------------------------------------------------------------
  // CREATE FORM
  // ------------------------------------------------------------

  if (item !== undefined) {
    const formEl = document.createElement("div");
    formEl.className = "aiw-item-detail-form";

    const titleInputEl = document.createElement("input");
    titleInputEl.className = "aiw-item-detail-title";
    titleInputEl.type = "text";
    // Draft wins over the stored value; ?? keeps a deliberately
    // cleared ("") draft from resurrecting the old text
    titleInputEl.value = getItemDetailTitleDraft(item.id) ?? item.title;

    const contentInputEl = document.createElement("textarea");
    contentInputEl.className = "aiw-item-detail-content";
    contentInputEl.value = getItemDetailContentDraft(item.id) ?? item.content;

    const buttonEl = document.createElement("button");
    buttonEl.className = "aiw-item-detail-save";
    buttonEl.type = "button";
    buttonEl.textContent = "Save";
    buttonEl.dataset.itemId = item.id;

    // Project row: a fact about the item that doubles as the move
    // control. The item's current project is pre-selected, so at
    // rest the select reads as "this item lives in X"; committing
    // a different option IS the move (handled on "change").
    const projectRowEl = document.createElement("div");
    projectRowEl.className = "aiw-item-detail-project-row";

    const projectLabelEl = document.createElement("span");
    projectLabelEl.className = "aiw-item-detail-project-label";
    projectLabelEl.textContent = "Project:";

    const projectSelectEl = document.createElement("select");
    projectSelectEl.className = "aiw-item-detail-project-select";
    projectSelectEl.dataset.itemId = item.id;

    for (const project of projects) {
      const optionEl = document.createElement("option");
      optionEl.value = project.id;
      optionEl.textContent = project.name;
      optionEl.selected = project.id === item.projectId;
      projectSelectEl.append(optionEl);
    }

    projectRowEl.append(projectLabelEl, projectSelectEl);

    formEl.append(titleInputEl, contentInputEl, projectRowEl, buttonEl);
    shell.panelEl.append(formEl);
  }

  // ------------------------------------------------------------
  // FINAL ASSEMBLY
  // ------------------------------------------------------------

  containerEl.append(shell.panelEl);

  return shell.panelEl;
}
