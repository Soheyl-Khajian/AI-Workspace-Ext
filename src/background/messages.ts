// src/background/messages.ts
// ------------------------------------------------------------
// CROSS-CONTEXT MESSAGE TYPES
// ------------------------------------------------------------
//
// Responsibility:
// - define all messages passed between extension contexts
// - provide a shared type contract for senders and listeners
//
// IMPORTANT:
// - NO logic
// - NO Chrome API calls
// - pure types only
//
// To add a new message type:
// 1. define a new named type with a unique "type" literal
// 2. add it to the AiwMessage union
// ------------------------------------------------------------

export type CaptureSelectionMessage = {
  type: "CAPTURE_SELECTION";
  selectionText: string;
  sourceUrl: string;
};

export type AiwMessage = CaptureSelectionMessage;
