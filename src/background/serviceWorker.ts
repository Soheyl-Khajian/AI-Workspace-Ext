// src/background/serviceWorker.ts
// ------------------------------------------------------------
// SERVICE WORKER (MV3 BACKGROUND CONTEXT)
// ------------------------------------------------------------
//
// Responsibility:
// - register context menu items on extension install
// - handle context menu click events
// - forward capture data to content script via messaging
// - receive AUTO_BACKUP_SNAPSHOT messages and delegate them to
//   the ring-buffer writer, acking only after the write settles
//
// IMPORTANT:
// - NO DOM access
// - NO IndexedDB access
// - NO UI logic
// - NO runtime state in this file (the write queue lives in
//   autoBackupWriter.ts, whose banner argues why that is safe)
//
// Data flow:
// context menu click
//   -> build CaptureSelectionMessage | CaptureLinkMessage
//   -> chrome.tabs.sendMessage -> content script
// content script auto-backup trigger
//   -> AutoBackupSnapshotMessage -> chrome.runtime.onMessage (here)
//   -> enqueueAutoBackupWrite -> chrome.storage.local
//   -> sendResponse(AutoBackupAck) back to the sender
// ------------------------------------------------------------

import type {
  AiwMessage,
  AutoBackupAck,
  CaptureLinkMessage,
  CaptureSelectionMessage,
} from "./messages";
import { enqueueAutoBackupWrite } from "./autoBackupWriter";

const CONTEXT_MENU_SAVE_TO_WORKSPACE_ID = "aiw-save-to-workspace";
const CONTEXT_MENU_SAVE_LINK_TO_WORKSPACE_ID = "aiw-save-link-to-workspace";

chrome.runtime.onInstalled.addListener(() => {
  // onInstalled also fires on extension UPDATES,
  // where a bare create would collide with
  // the ids registered by the previous version.
  // Rebuild the whole menu set from scratch instead.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_SAVE_TO_WORKSPACE_ID,
      title: "Save to Workspace",
      contexts: ["selection"],
      documentUrlPatterns: ["https://chatgpt.com/*"],
    });

    chrome.contextMenus.create({
      id: CONTEXT_MENU_SAVE_LINK_TO_WORKSPACE_ID,
      title: "Save link to Workspace",
      contexts: ["link"],
      documentUrlPatterns: ["https://chatgpt.com/*"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === CONTEXT_MENU_SAVE_TO_WORKSPACE_ID) {
    if (!info.selectionText) return;

    const message: CaptureSelectionMessage = {
      type: "CAPTURE_SELECTION",
      selectionText: info.selectionText,
      // info.pageUrl can be undefined if Chrome doesn't have permission to read the URL
      sourceUrl: info.pageUrl ?? "",
      sourceTitle: tab.title,
    };

    // expected behavior when the extension isn't running on the target tab
    chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    return;
  }

  if (info.menuItemId === CONTEXT_MENU_SAVE_LINK_TO_WORKSPACE_ID) {
    if (!info.linkUrl) return;
    if (!info.pageUrl) return;

    const message: CaptureLinkMessage = {
      type: "CAPTURE_LINK",
      linkUrl: info.linkUrl,
      sourceUrl: info.pageUrl,
      sourceTitle: tab.title,
    };

    chrome.tabs.sendMessage(tab.id, message).catch(() => {});
  }
});

// Deliberately NOT an async listener: Chrome's channel-keepalive
// contract wants the literal boolean `true`, and an async function
// returns a Promise instead. Unknown message types return undefined
// so this listener never strands a channel another listener was
// meant to answer.
chrome.runtime.onMessage.addListener(
  (message: AiwMessage, _sender, sendResponse) => {
    if (message.type !== "AUTO_BACKUP_SNAPSHOT") return;

    enqueueAutoBackupWrite(message.reason, message.backup)
      .then(() => {
        const ack: AutoBackupAck = { ok: true };
        sendResponse(ack);
      })
      .catch(() => {
        // ok: false leaves the sender's policy dirty; a later
        // trigger retries. Snapshot twice, never lose data.
        const ack: AutoBackupAck = { ok: false };
        sendResponse(ack);
      });

    // keeps the message channel open while the async write is happening.
    return true;
  },
);
