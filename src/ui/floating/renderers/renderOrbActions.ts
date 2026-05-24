// src/ui/floating/renderers/renderOrbActions.ts
// ------------------------------------------------------------
// Orb action button renderer
// ------------------------------------------------------------
// This renderer is responsible for:
// rendering ALL orb actions
// mounting/unmounting them
// reflecting expanded/collapsed state
// attaching click callbacks
// ------------------------------------------------------------

import type { OrbPanelId } from "../types";
import { createOrbActionButton } from "../components/createOrbActionButton";

type OrbAction = {
  id: OrbPanelId;
  label: string;
};

export function renderOrbActions(
  containerEl: HTMLElement,
  expanded: boolean,
  actions: OrbAction[],
  onActionClick: (actionId: OrbPanelId) => void,
): void {
  containerEl.textContent = "";

  if (!expanded) {
    return;
  }

  for (const action of actions) {
    const buttonEl = createOrbActionButton({
      actionId: action.id,
      label: action.label,
    });

    buttonEl.addEventListener("click", () => onActionClick(action.id));

    containerEl.append(buttonEl);
  }
}
