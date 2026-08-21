// src/ui/shared/FloatingPanelShell.test.tsx
/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("renders footer content after the body", () => {
    const { container } = render(
      <FloatingPanelShell
        title="Projects"
        footer={<div className="footer-probe" />}
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
      "aiw-floating-panel__body",
      "footer-probe",
    ]);
  });

  it("forwards panel clicks to onClick", () => {
    const onClick = vi.fn();
    render(
      <FloatingPanelShell title="Projects" onClick={onClick}>
        content
      </FloatingPanelShell>,
    );
    fireEvent.click(screen.getByRole("heading", { name: "Projects" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the back button only when onBackClick is given, and forwards clicks", () => {
    const onBackClick = vi.fn();
    const { container, rerender } = render(
      <FloatingPanelShell title="Items">content</FloatingPanelShell>,
    );
    expect(container.querySelector(".aiw-panel-back-button")).toBeNull();

    rerender(
      <FloatingPanelShell title="Items" onBackClick={onBackClick}>
        content
      </FloatingPanelShell>,
    );
    fireEvent.click(screen.getByText("←"));
    expect(onBackClick).toHaveBeenCalledTimes(1);
  });

  it("forwards breadcrumb clicks to onContextClick", () => {
    const onContextClick = vi.fn();
    render(
      <FloatingPanelShell
        title="Items"
        context={{ label: "Alpha", muted: false }}
        onContextClick={onContextClick}
      >
        content
      </FloatingPanelShell>,
    );
    fireEvent.click(screen.getByText("Alpha"));
    expect(onContextClick).toHaveBeenCalledTimes(1);
  });

  it("renders headerActions inside the header", () => {
    const { container } = render(
      <FloatingPanelShell
        title="Items"
        headerActions={<div className="actions-probe" />}
      >
        content
      </FloatingPanelShell>,
    );
    const headerEl = container.querySelector(".aiw-floating-panel__header");
    expect(headerEl?.querySelector(".actions-probe")).not.toBeNull();
  });

  it("appends bodyClassName to the body class", () => {
    const { container } = render(
      <FloatingPanelShell
        title="Items"
        bodyClassName="aiw-floating-panel__body--split"
      >
        content
      </FloatingPanelShell>,
    );
    const bodyEl = container.querySelector(".aiw-floating-panel__body");
    expect(bodyEl?.classList.contains("aiw-floating-panel__body--split")).toBe(
      true,
    );
  });
});
