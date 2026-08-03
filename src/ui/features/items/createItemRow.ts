// src/ui/features/items/createItemRow.ts
// ------------------------------------------------------------
// ITEM ROW COMPONENT
// ------------------------------------------------------------
//
// Responsibility:
//
// - create one item row
// - render the selection checkbox and the (ellipsized) title
// - reflect selected state visually
// - render the "…" menu trigger, and PROJECT the row menu when
//   this row's menu is open in state: the root page (Move to… /
//   Delete) or the move-picker page (one button per move target)
// - expose item identity via dataset
//
// IMPORTANT:
//
// - NO listeners (delegation in itemsHandlers owns all events)
// - NO state mutation (flags and move targets arrive as inputs)
// - NO business logic (the CALLER filters the move targets)
// - NO imports except TYPE
// - the menu is PROJECTED from itemsMenuState, never toggled in
//   the DOM: a background wipe-rebuild re-creates an open menu on
//   its current PAGE, because both facts live in state
//   (DOM-held-state ledger)
// ------------------------------------------------------------

import type { Item } from "../../../models/item";
import type { Project } from "../../../models/project";
import type { ItemMenuPage } from "./itemsMenuState";

// ------------------------------------------------------------
// ROW FLAGS
// ------------------------------------------------------------
//
// Named-flags object instead of positional booleans (same rule as
// createProjectRow): two same-typed positional flags invite silent
// argument swaps the compiler cannot catch.
// ------------------------------------------------------------

type ItemRowFlags = {
  selected: boolean;
  checkboxChecked: boolean;
  // null = this row's menu is closed; otherwise the open page
  menuPage: ItemMenuPage | null;
};

export function createItemRow(
  item: Item,
  flags: ItemRowFlags,
  moveTargets: Project[],
): HTMLDivElement {
  const hasTitle = item.title.trim().length > 0;

  // ------------------------------------------------------------
  // ITEM ROW
  // ------------------------------------------------------------

  const rowEl = document.createElement("div");
  rowEl.className = "aiw-item-row";

  const checkBoxEl = document.createElement("input");
  checkBoxEl.type = "checkbox";
  checkBoxEl.checked = flags.checkboxChecked;
  checkBoxEl.className = "aiw-item-select";
  checkBoxEl.dataset.itemId = item.id;

  rowEl.prepend(checkBoxEl);

  const itemTextEl = document.createElement("span");
  itemTextEl.className = "aiw-item-text";
  itemTextEl.textContent = hasTitle ? item.title : "Untitled";
  if (!hasTitle) {
    itemTextEl.classList.add("aiw-item-text--untitled");
  }

  rowEl.append(itemTextEl);

  // Expose item identity to parent interaction systems
  rowEl.dataset.itemId = item.id;

  if (flags.selected) {
    rowEl.classList.add("aiw-item-row--selected");
  }

  if (flags.menuPage !== null) {
    // Positioning anchor + overflow release for the floating menu
    // (see panels/menus.css)
    rowEl.classList.add("aiw-item-row--menu-open");
  }

  // ----------------------------------------------------------
  // MENU TRIGGER ("…")
  //
  // Replaces the old delete (×) strip: the row actions live in
  // the menu now.
  // ----------------------------------------------------------

  const menuTriggerEl = document.createElement("button");
  menuTriggerEl.type = "button";
  menuTriggerEl.className = "aiw-row-menu-trigger";
  menuTriggerEl.textContent = "…";

  // Expose item identity to parent interaction systems
  menuTriggerEl.dataset.itemId = item.id;

  rowEl.append(menuTriggerEl);

  // ----------------------------------------------------------
  // ROW MENU (projected from state)
  // ----------------------------------------------------------

  if (flags.menuPage === "root") {
    const menuEl = document.createElement("div");
    menuEl.className = "aiw-row-menu";

    const moveItemEl = document.createElement("button");
    moveItemEl.type = "button";
    moveItemEl.className = "aiw-row-menu-item aiw-item-menu-move";
    moveItemEl.textContent = "Move to…";
    moveItemEl.dataset.itemId = item.id;

    const deleteItemEl = document.createElement("button");
    deleteItemEl.type = "button";
    deleteItemEl.className =
      "aiw-row-menu-item aiw-row-menu-item--danger aiw-item-menu-delete";
    deleteItemEl.textContent = "Delete";
    deleteItemEl.dataset.itemId = item.id;

    menuEl.append(moveItemEl, deleteItemEl);
    rowEl.append(menuEl);
  }

  if (flags.menuPage === "movePicker") {
    const menuEl = document.createElement("div");
    menuEl.className = "aiw-row-menu aiw-row-menu--picker";

    if (moveTargets.length === 0) {
      const emptyEl = document.createElement("div");
      emptyEl.className = "aiw-row-menu-empty";
      emptyEl.textContent = "No other projects";
      menuEl.append(emptyEl);
    }

    for (const project of moveTargets) {
      const targetEl = document.createElement("button");
      targetEl.type = "button";
      targetEl.className = "aiw-row-menu-item aiw-item-menu-move-target";
      targetEl.textContent = project.name;
      targetEl.dataset.itemId = item.id;
      targetEl.dataset.projectId = project.id;
      menuEl.append(targetEl);
    }

    rowEl.append(menuEl);
  }

  return rowEl;
}
