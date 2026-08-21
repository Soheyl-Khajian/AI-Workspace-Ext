// src/ui/core/floatingDom.ts
// ------------------------------------------------------------
// DOM layer: responsible ONLY for safely resolving required floating UI elements
// ------------------------------------------------------------

function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector(selector);

  if (!el) {
    throw new Error(`Missing required UI element: ${selector}`);
  }

  return el as T;
}

export type FloatingDom = {
  rootEl: HTMLElement;
  orbButtonEl: HTMLButtonElement;
  orbActionsEl: HTMLDivElement;
  reactPanelsEl: HTMLDivElement;
};

export function createFloatingDom(rootEl: HTMLElement): FloatingDom {
  return {
    rootEl,
    orbButtonEl: mustQuery(rootEl, "#aiw-orb-button"),
    orbActionsEl: mustQuery(rootEl, "#aiw-orb-actions"),
    reactPanelsEl: mustQuery(rootEl, "#aiw-react-panels"),
  };
}
