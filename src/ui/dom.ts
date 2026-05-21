// src/ui/dom.ts
// ------------------------------------------------------------
// DOM layer: responsible ONLY for safely resolving required UI elements
// ------------------------------------------------------------

function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector(selector);

  if (!el) {
    throw new Error(`Missing required sidebar element: ${selector}`);
  }

  return el as T;
}

export type SidebarDom = {
  rootEl: HTMLElement;
  projectsListEl: HTMLDivElement;
  itemsListEl: HTMLDivElement;
  itemDetailsEl: HTMLDivElement;
  projectFormEl: HTMLDivElement;
  itemFormEl: HTMLDivElement;
  addProjectButtonEl: HTMLButtonElement;
  addItemButtonEl: HTMLButtonElement;
};

// Factory: binds DOM structure to a given sidebar root
export function createSidebarDom(rootEl: HTMLElement): SidebarDom {
  return {
    rootEl,
    projectsListEl: mustQuery<HTMLDivElement>(rootEl, "#aiw-projects-list"),
    itemsListEl: mustQuery<HTMLDivElement>(rootEl, "#aiw-items-list"),
    itemDetailsEl: mustQuery<HTMLDivElement>(rootEl, "#aiw-item-details"),
    projectFormEl: mustQuery<HTMLDivElement>(rootEl, "#aiw-project-form"),
    itemFormEl: mustQuery<HTMLDivElement>(rootEl, "#aiw-item-form"),
    addProjectButtonEl: mustQuery<HTMLButtonElement>(
      rootEl,
      "#aiw-add-project-button",
    ),
    addItemButtonEl: mustQuery<HTMLButtonElement>(
      rootEl,
      "#aiw-add-item-button",
    ),
  };
}
