"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/content/injectSidebar.ts
  var require_injectSidebar = __commonJS({
    "src/content/injectSidebar.ts"() {
      var styleLink = document.getElementById("aiw-sidebar-style");
      if (!styleLink) {
        const parent = document.head ?? document.documentElement;
        const link = document.createElement("link");
        link.id = "aiw-sidebar-style";
        link.rel = "stylesheet";
        link.href = chrome.runtime.getURL("dist/ui/sidebar.css");
        parent.append(link);
      }
      var sidebar = document.getElementById("aiw-sidebar-root");
      if (!sidebar) {
        fetch(chrome.runtime.getURL("dist/ui/sidebar.html")).then((response) => {
          if (!response.ok)
            throw new Error(`Failed to load sidebar.html (${response.status})`);
          return response.text();
        }).then((sidebarHTML) => {
          if (document.getElementById("aiw-sidebar-root")) return;
          const parent = document.body ?? document.documentElement;
          parent.insertAdjacentHTML("beforeend", sidebarHTML);
        }).catch((error) => {
          console.error("Failed to inject sidebar HTML:", error);
        });
      }
    }
  });
  require_injectSidebar();
})();
//# sourceMappingURL=injectSidebar.js.map
