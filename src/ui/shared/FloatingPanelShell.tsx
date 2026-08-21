// src/ui/shared/FloatingPanelShell.tsx
// ------------------------------------------------------------
// FLOATING PANEL SHELL (REACT)
// ------------------------------------------------------------
//
// Responsibility:
// - React twin of createFloatingPanelShell: same structure,
//   same classes, ONE source of truth for both (the vanilla
//   module owns the shared constants and the PanelContext type)
// - children fill the panel body; pinned renders between the
//   header and the body, footer renders after the body — both
//   OUTSIDE the scroll region (search bar, footer forms)
// - header slots: onBackClick renders the back button, context
//   renders the breadcrumb (clickable when onContextClick is
//   given), headerActions renders after the title (build-context
//   bar)
//
// IMPORTANT RULES:
// - the enter class is STATIC: React creates this node once per
//   mount and reconciles after, so the entrance animation plays
//   on panel open and is never wipe-killed — the vanilla replay
//   hack does not apply here
// - onClick is forwarded to the panel element and nothing more:
//   feature panels own panel-wide click concerns (row-menu
//   dismissal); the shell attaches no behavior of its own
// - bodyClassName appends a modifier to the shared body class
//   (master-detail split); the base class always stays
// - the vanilla twin dies when the last vanilla panel does
// ------------------------------------------------------------
import type { MouseEventHandler, ReactNode } from "react";
import type { PanelContext } from "./createFloatingPanelShell";
import { PANEL_SHELL_CONTEXT_CLASS } from "./createFloatingPanelShell";

type Props = {
  title: string;
  context?: PanelContext;
  onContextClick?: () => void;
  onBackClick?: () => void;
  headerActions?: ReactNode;
  bodyClassName?: string;
  pinned?: ReactNode;
  footer?: ReactNode;
  onClick?: MouseEventHandler<HTMLElement>;
  children: ReactNode;
};

export function FloatingPanelShell({
  title,
  context,
  onContextClick,
  onBackClick,
  headerActions,
  bodyClassName,
  pinned,
  footer,
  onClick,
  children,
}: Props) {
  return (
    <section
      className="aiw-floating-panel aiw-floating-panel--enter"
      onClick={onClick}
    >
      <header className="aiw-floating-panel__header">
        {onBackClick && (
          <button
            type="button"
            className="aiw-panel-back-button"
            onClick={onBackClick}
          >
            ←
          </button>
        )}
        {context && (
          <>
            <button
              className={
                context.muted
                  ? `${PANEL_SHELL_CONTEXT_CLASS} ${PANEL_SHELL_CONTEXT_CLASS}--muted`
                  : PANEL_SHELL_CONTEXT_CLASS
              }
              type="button"
              onClick={onContextClick}
            >
              {context.label}
            </button>
            <span className={`${PANEL_SHELL_CONTEXT_CLASS}-separator`}>›</span>
          </>
        )}
        <h2 className="aiw-floating-panel__title">{title}</h2>
        {headerActions}
      </header>
      {pinned}
      <div
        className={
          bodyClassName
            ? `aiw-floating-panel__body ${bodyClassName}`
            : "aiw-floating-panel__body"
        }
      >
        {children}
      </div>
      {footer}
    </section>
  );
}
