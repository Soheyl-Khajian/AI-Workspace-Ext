"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/content/injectSidebar.ts
  var require_injectSidebar = __commonJS({
    "src/content/injectSidebar.ts"() {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL("dist/ui/sidebar.css");
      document.head.append(link);
      fetch(chrome.runtime.getURL("dist/ui/sidebar.html")).then((response) => response.text()).then((sidebarHTML) => {
        document.body.insertAdjacentHTML("beforeend", sidebarHTML);
      }).catch((error) => {
        console.error("Failed to inject sidebar HTML:", error);
      });
    }
  });
  require_injectSidebar();
})();
//# sourceMappingURL=injectSidebar.js.map
