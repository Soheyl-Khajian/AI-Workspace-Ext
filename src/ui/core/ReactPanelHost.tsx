// src/ui/core/ReactPanelHost.tsx
// ------------------------------------------------------------
// REACT PANEL HOST
// ------------------------------------------------------------
//
// Responsibility:
//
// - the single React entry component: everything React renders
//   in the floating UI lives under this component
// - receives the active panel id from renderUi on every render
//   pass; React reconciles instead of wipe-rebuilding
// - renders nothing user-visible yet (v0.7 slice 1): the probe
//   attribute proves the root survives vanilla re-renders
//
// IMPORTANT:
//
// - mounted ONCE by the composition root into #aiw-react-panels,
//   a SIBLING of the wiped #aiw-orb-panels container — vanilla
//   clears its own subtree, React reconciles this one; neither
//   touches the other's
// ------------------------------------------------------------

import type { OrbPanelId } from "./types";

type Props = {
  activePanel: OrbPanelId | null;
};

export function ReactPanelHost({ activePanel }: Props) {
  return <div data-aiw-react="ready"></div>;
}
