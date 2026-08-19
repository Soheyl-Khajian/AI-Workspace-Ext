// src/ui/shared/PanelState.tsx
// ------------------------------------------------------------
// FLOATING PANEL STATE (REACT)
// ------------------------------------------------------------
//
// Responsibility:
// - React twin of createPanelState: same classes, same variant
//   contract, ONE visual language for panel runtime states
//
// IMPORTANT RULES:
// - NO domain-specific text
// - NO business logic
// - the variant union replaces the vanilla twin's exhaustive
//   switch: the template literal is type-safe because variant
//   can only be one of the four class suffixes
// - the vanilla twin dies when the last vanilla panel does
// ------------------------------------------------------------

import type { PanelVariant } from "./createPanelState";

type Props = {
  variant: PanelVariant;
  message: string;
};

export function PanelState({ variant, message }: Props) {
  return (
    <div className={`aiw-panel-state aiw-panel-state--${variant}`}>
      {message}
    </div>
  );
}
