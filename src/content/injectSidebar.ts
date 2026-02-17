// contentScript.ts
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = chrome.runtime.getURL("dist/ui/sidebar.css");

document.head.append(link);

fetch(chrome.runtime.getURL("dist/ui/sidebar.html"))
  .then((response) => response.text())
  .then((sidebarHTML) => {
    // Inject the HTML into the page
    document.body.insertAdjacentHTML("beforeend", sidebarHTML);
  })
  .catch((error) => {
    console.error("Failed to inject sidebar HTML:", error);
  });
