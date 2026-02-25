// src/content/contentScript.ts
const styleLink = document.getElementById("aiw-sidebar-style");
if (!styleLink) {
  const parent = document.head ?? document.documentElement; // ?? falls back to right side only if null or undefined; does not check falsy.

  const link = document.createElement("link");
  link.id = "aiw-sidebar-style";
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("dist/ui/sidebar.css");

  parent.append(link);
}

const sidebar = document.getElementById("aiw-sidebar-root");
if (!sidebar) {
  fetch(chrome.runtime.getURL("dist/ui/sidebar.html"))
    .then((response) => {
      if (!response.ok)
        throw new Error(`Failed to load sidebar.html (${response.status})`);
      return response.text();
    })
    .then((sidebarHTML) => {
      if (document.getElementById("aiw-sidebar-root")) return; // recheck if sidebar exists to avoid race condition
      const parent = document.body ?? document.documentElement;
      // Inject the HTML into the page
      parent.insertAdjacentHTML("beforeend", sidebarHTML);
    })
    .catch((error) => {
      console.error("Failed to inject sidebar HTML:", error);
    });
}
