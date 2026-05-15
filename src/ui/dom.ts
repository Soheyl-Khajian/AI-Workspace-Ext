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
  root: HTMLElement;
  projectsListEl: HTMLDivElement;
  itemsListEl: HTMLDivElement;
  addProjectBtn: HTMLButtonElement;
};

// Factory: binds DOM structure to a given sidebar root
export function createSidebarDom(root: HTMLElement): SidebarDom {
  return {
    root,
    projectsListEl: mustQuery<HTMLDivElement>(root, "#aiw-projects-list"),
    itemsListEl: mustQuery<HTMLDivElement>(root, "#aiw-items-list"),
    addProjectBtn: mustQuery<HTMLButtonElement>(
      root,
      "#aiw-add-project-button",
    ),
  };
}
