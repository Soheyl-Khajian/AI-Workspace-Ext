// src/background/serviceWorker.ts
// ------------------------------------------------------------
// SERVICE WORKER (MV3 BACKGROUND CONTEXT)
// ------------------------------------------------------------
//
// Responsibility:
// - register context menu items on extension install
// - handle context menu click events
// - forward capture data to content script via messaging
//
// IMPORTANT:
// - NO DOM access
// - NO IndexedDB access
// - NO UI logic
// - NO runtime state
//
// Data flow:
// context menu click
//   → build CaptureSelectionMessage
//   → chrome.tabs.sendMessage → content script
// ------------------------------------------------------------

import type { CaptureSelectionMessage } from "./messages";

const CONTEXT_MENU_SAVE_TO_WORKSPACE_ID = "aiw-save-to-workspace";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_SAVE_TO_WORKSPACE_ID,
    title: "Save to Workspace",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_SAVE_TO_WORKSPACE_ID) return;
  if (!tab?.id) return;
  if (!info.selectionText) return;

  const message: CaptureSelectionMessage = {
    type: "CAPTURE_SELECTION",
    selectionText: info.selectionText,
    // info.pageUrl can be undefined if Chrome doesn't have permission to read the URL
    sourceUrl: info.pageUrl ?? "",
  };

  // expected behavior when the extension isn't running on the target tab
  chrome.tabs.sendMessage(tab.id, message).catch(() => {});
});
