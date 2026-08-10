"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/background/autoBackupWriter.ts
  async function performWrite(reason, backup) {
    const result = await chrome.storage.local.get(AUTO_BACKUP_STORAGE_KEY);
    const existing = result[AUTO_BACKUP_STORAGE_KEY] ?? [];
    const record = {
      savedAt: Date.now(),
      reason,
      backup
    };
    const updated = [record, ...existing].slice(0, AUTO_BACKUP_RETENTION);
    await chrome.storage.local.set({ [AUTO_BACKUP_STORAGE_KEY]: updated });
    return updated;
  }
  function enqueueAutoBackupWrite(reason, backup) {
    const write = queue.then(() => performWrite(reason, backup));
    queue = write.then(
      () => void 0,
      () => void 0
    );
    return write;
  }
  var AUTO_BACKUP_STORAGE_KEY, AUTO_BACKUP_RETENTION, queue;
  var init_autoBackupWriter = __esm({
    "src/background/autoBackupWriter.ts"() {
      "use strict";
      AUTO_BACKUP_STORAGE_KEY = "aiw_auto_backups";
      AUTO_BACKUP_RETENTION = 5;
      queue = Promise.resolve();
    }
  });

  // src/background/serviceWorker.ts
  var require_serviceWorker = __commonJS({
    "src/background/serviceWorker.ts"() {
      init_autoBackupWriter();
      var CONTEXT_MENU_SAVE_TO_WORKSPACE_ID = "aiw-save-to-workspace";
      var CONTEXT_MENU_SAVE_LINK_TO_WORKSPACE_ID = "aiw-save-link-to-workspace";
      chrome.runtime.onInstalled.addListener(() => {
        chrome.contextMenus.removeAll(() => {
          chrome.contextMenus.create({
            id: CONTEXT_MENU_SAVE_TO_WORKSPACE_ID,
            title: "Save to Workspace",
            contexts: ["selection"],
            documentUrlPatterns: ["https://chatgpt.com/*"]
          });
          chrome.contextMenus.create({
            id: CONTEXT_MENU_SAVE_LINK_TO_WORKSPACE_ID,
            title: "Save link to Workspace",
            contexts: ["link"],
            documentUrlPatterns: ["https://chatgpt.com/*"]
          });
        });
      });
      chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (!tab?.id) return;
        if (info.menuItemId === CONTEXT_MENU_SAVE_TO_WORKSPACE_ID) {
          if (!info.selectionText) return;
          const message = {
            type: "CAPTURE_SELECTION",
            selectionText: info.selectionText,
            // info.pageUrl can be undefined if Chrome doesn't have permission to read the URL
            sourceUrl: info.pageUrl ?? "",
            sourceTitle: tab.title
          };
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
          });
          return;
        }
        if (info.menuItemId === CONTEXT_MENU_SAVE_LINK_TO_WORKSPACE_ID) {
          if (!info.linkUrl) return;
          if (!info.pageUrl) return;
          const message = {
            type: "CAPTURE_LINK",
            linkUrl: info.linkUrl,
            sourceUrl: info.pageUrl,
            sourceTitle: tab.title
          };
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
          });
        }
      });
      chrome.runtime.onMessage.addListener(
        (message, _sender, sendResponse) => {
          if (message.type !== "AUTO_BACKUP_SNAPSHOT") return;
          enqueueAutoBackupWrite(message.reason, message.backup).then(() => {
            const ack = { ok: true };
            sendResponse(ack);
          }).catch(() => {
            const ack = { ok: false };
            sendResponse(ack);
          });
          return true;
        }
      );
    }
  });
  require_serviceWorker();
})();
//# sourceMappingURL=serviceWorker.js.map
