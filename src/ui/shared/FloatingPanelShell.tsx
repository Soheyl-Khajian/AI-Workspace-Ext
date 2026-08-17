// src/ui/shared/FloatingPanelShell.tsx
// ------------------------------------------------------------
// FLOATING PANEL SHELL (REACT)
// ------------------------------------------------------------
//
// Responsibility:
// - React twin of createFloatingPanelShell: same structure,
//   same classes, ONE source of truth for both (the vanilla
//   module owns the shared constants and the PanelContext type)
// - children fill the panel body
//
// IMPORTANT RULES:
// - the enter class is STATIC: React creates this node once per
//   mount and reconciles after, so the entrance animation plays
//   on panel open and is never wipe-killed — the vanilla replay
//   hack does not apply here
// - the context button carries NO listener yet (no migrated
//   panel needs one; grows an onContextClick prop in v0.8)
// - the vanilla twin dies when the last vanilla panel does
// ------------------------------------------------------------

import type { ReactNode } from "react";
import type { PanelContext } from "./createFloatingPanelShell";
import { PANEL_SHELL_CONTEXT_CLASS } from "./createFloatingPanelShell";

type Props = {
  title: string;
  context?: PanelContext;
  children: ReactNode;
};

export function FloatingPanelShell({ title, context, children }: Props) {
  return (
    <section className="aiw-floating-panel aiw-floating-panel--enter">
      <header className="aiw-floating-panel__header">
        {context && (
          <>
            <button
              className={
                context.muted
                  ? `${PANEL_SHELL_CONTEXT_CLASS} ${PANEL_SHELL_CONTEXT_CLASS}--muted`
                  : PANEL_SHELL_CONTEXT_CLASS
              }
              type="button"
            >
              {context.label}
            </button>
            <span className={`${PANEL_SHELL_CONTEXT_CLASS}-separator`}>›</span>
          </>
        )}
        <h2 className="aiw-floating-panel__title">{title}</h2>
      </header>
      <div className="aiw-floating-panel__body">{children}</div>
    </section>
  );
}
