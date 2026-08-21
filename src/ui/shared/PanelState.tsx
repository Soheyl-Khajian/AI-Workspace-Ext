// src/ui/shared/PanelState.tsx
// ------------------------------------------------------------
// FLOATING PANEL STATE (REACT)
// ------------------------------------------------------------
//
// Responsibility:
// - THE panel state node (sole implementation since v0.8 Slice 4;
//   its vanilla twin createPanelState is deleted): same classes,
//   same variant
//
// IMPORTANT RULES:
// - NO domain-specific text
// - NO business logic
// - the variant union replaces the vanilla twin's exhaustive
//   switch: the template literal is type-safe because variant
//   can only be one of the four class suffixes
// - the vanilla twin dies when the last vanilla panel does
// ------------------------------------------------------------

// ------------------------------------------------------------
// VARIANT CONTRACT (owned here since v0.8, Slice 4)
// ------------------------------------------------------------
//
// Relocated from createPanelState.ts when the vanilla factory
// was buried: the React component is now the sole owner of the
// state-node variant contract. The variant names are behavior
// hooks — they map 1:1 onto the .aiw-panel-state--* classes.

export type PanelVariant = "loading" | "empty" | "error" | "placeholder";

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
