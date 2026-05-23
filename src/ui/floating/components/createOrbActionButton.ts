// src/ui/floating/components/createOrbActionButton.ts
// ------------------------------------------------------------
// Orb action button component
// ------------------------------------------------------------
// This file is a pure UI factory.

// Responsibility:

// create ONE action button
// attach classes
// attach label
// return DOM node

// Nothing else.

// No global state.
// No rendering orchestration.
// No querying existing DOM.

type OrbActionId = "projects" | "capture" | "search";

type OrbActionButtonParams = {
  label: string;
  actionId: OrbActionId;
};

export function createOrbActionButton({
  label,
  actionId,
}: OrbActionButtonParams): HTMLButtonElement {
  const buttonEl = document.createElement("button");

  buttonEl.type = "button";
  buttonEl.className = "aiw-orb-action";

  buttonEl.dataset.actionId = actionId;
  buttonEl.textContent = label;

  return buttonEl;
}
