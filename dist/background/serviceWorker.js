"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/background/serviceWorker.ts
  var require_serviceWorker = __commonJS({
    "src/background/serviceWorker.ts"() {
      var CONTEXT_MENU_SAVE_TO_WORKSPACE_ID = "aiw-save-to-workspace";
      chrome.runtime.onInstalled.addListener(() => {
        chrome.contextMenus.create({
          id: CONTEXT_MENU_SAVE_TO_WORKSPACE_ID,
          title: "Save to Workspace",
          contexts: ["selection"]
        });
      });
      chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId !== CONTEXT_MENU_SAVE_TO_WORKSPACE_ID) return;
        if (!tab?.id) return;
        if (!info.selectionText) return;
        const message = {
          type: "CAPTURE_SELECTION",
          selectionText: info.selectionText,
          // info.pageUrl can be undefined if Chrome doesn't have permission to read the URL
          sourceUrl: info.pageUrl ?? ""
        };
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
        });
      });
    }
  });
  require_serviceWorker();
})();
//# sourceMappingURL=serviceWorker.js.map
