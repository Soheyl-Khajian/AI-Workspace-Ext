// contentScript.js
const sidebarHTML = `
  <div id="ai-sidebar" style="position: fixed; top: 0; right: 0; width: 320px; height: 100vh; background: white; box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1); z-index: 9999;">
    <div style="padding: 10px; border-bottom: 1px solid #ccc;">
      <strong>AI Workspace</strong>
    </div>
    <div id="ai-projects-list" style="padding: 10px; overflow-y: auto;"></div>
    <button id="ai-add-project" style="margin: 10px;">Add Project</button>
  </div>
`;

// Inject the sidebar into the body of the page
document.body.insertAdjacentHTML('beforeend', sidebarHTML);