// src/ui/shared/FloatingPanelShell.test.tsx
/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FloatingPanelShell } from "./FloatingPanelShell";
import { PANEL_SHELL_CONTEXT_SELECTOR } from "./createFloatingPanelShell";

describe("FloatingPanelShell", () => {
  afterEach(cleanup);

  it("renders the title as the panel heading", () => {
    render(<FloatingPanelShell title="Backup">content</FloatingPanelShell>);

    expect(screen.getByRole("heading", { name: "Backup" })).not.toBeNull();
  });

  it("renders children inside the panel body", () => {
    const { container } = render(
      <FloatingPanelShell title="Backup">
        <p>hello body</p>
      </FloatingPanelShell>,
    );

    const bodyEl = container.querySelector(".aiw-floating-panel__body");
    expect(bodyEl?.textContent).toBe("hello body");
  });

  it("renders no context segment without a context", () => {
    const { container } = render(
      <FloatingPanelShell title="Backup">content</FloatingPanelShell>,
    );

    expect(container.querySelector(PANEL_SHELL_CONTEXT_SELECTOR)).toBeNull();
  });

  it("renders the context button and separator when a context is given", () => {
    render(
      <FloatingPanelShell title="Items" context={{ label: "My project" }}>
        content
      </FloatingPanelShell>,
    );

    expect(screen.getByRole("button", { name: "My project" })).not.toBeNull();
  });

  it("marks a muted context with the muted modifier class", () => {
    render(
      <FloatingPanelShell
        title="Items"
        context={{ label: "Select a project", muted: true }}
      >
        content
      </FloatingPanelShell>,
    );

    const buttonEl = screen.getByRole("button", { name: "Select a project" });
    expect(buttonEl.classList.contains("aiw-panel-context--muted")).toBe(true);
  });

  it("renders pinned content between the header and the body", () => {
    const { container } = render(
      <FloatingPanelShell
        title="Search"
        pinned={<div className="pinned-probe" />}
      >
        content
      </FloatingPanelShell>,
    );

    const panelEl = container.querySelector(".aiw-floating-panel");
    const childClasses = Array.from(panelEl?.children ?? []).map(
      (child) => child.className,
    );
    expect(childClasses).toEqual([
      "aiw-floating-panel__header",
      "pinned-probe",
      "aiw-floating-panel__body",
    ]);
  });
});
