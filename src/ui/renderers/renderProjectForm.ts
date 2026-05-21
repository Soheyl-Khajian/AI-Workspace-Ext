// src/ui/renderers/renderProjectForm.ts
// ------------------------------------------------------------
// PROJECT FORM RENDERER
//
// Responsibility:
// - Renders the project creation form UI
// - Reflects current form state into the DOM
// - Emits user interaction events through callbacks
//
// IMPORTANT RULES:
// - PURE renderer
// - NO IndexedDB access
// - NO global state access
// - NO async logic
// - NO business logic
// - NO side effects outside provided container
//
// RENDER FLOW:
//
// state
//   ↓
// renderProjectForm(...)
//   ↓
// DOM reflects current state
//
// user types
//   ↓
// callback emitted
//   ↓
// external state updated
//   ↓
// rerender triggered
//   ↓
// DOM refreshed from state again
// ------------------------------------------------------------

export function renderProjectForm(
  containerEl: HTMLElement,
  isOpen: boolean,
  draftName: string,
  onInput: (name: string) => void,
  onSubmit: () => void,
  onCancel: () => void,
): void {
  // ----------------------------------------------------------
  // Clear previous render tree
  // ----------------------------------------------------------

  containerEl.textContent = "";

  // ----------------------------------------------------------
  // Render nothing when closed
  // ----------------------------------------------------------

  if (!isOpen) {
    return;
  }

  // ----------------------------------------------------------
  // Create form container
  // ----------------------------------------------------------

  const formEl = document.createElement("form");

  // ----------------------------------------------------------
  // Create project name input
  // ----------------------------------------------------------

  const inputEl = document.createElement("input");

  inputEl.type = "text";
  inputEl.placeholder = "Project name";
  inputEl.value = draftName;

  // ----------------------------------------------------------
  // Sync user typing back to state owner
  // ----------------------------------------------------------

  inputEl.addEventListener("input", () => {
    onInput(inputEl.value);
  });

  // ----------------------------------------------------------
  // Create submit button
  // ----------------------------------------------------------

  const submitButtonEl = document.createElement("button");

  submitButtonEl.type = "submit";
  submitButtonEl.textContent = "Create";

  // ----------------------------------------------------------
  // Create cancel button
  // ----------------------------------------------------------

  const cancelButtonEl = document.createElement("button");

  cancelButtonEl.type = "button";
  cancelButtonEl.textContent = "Cancel";

  // ----------------------------------------------------------
  // Bind cancel action
  // ----------------------------------------------------------

  cancelButtonEl.addEventListener("click", () => {
    onCancel();
  });

  // ----------------------------------------------------------
  // Bind form submission
  // ----------------------------------------------------------

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();

    onSubmit();
  });

  // ----------------------------------------------------------
  // Assemble form tree
  // ----------------------------------------------------------

  formEl.append(inputEl, submitButtonEl, cancelButtonEl);

  // ----------------------------------------------------------
  // Mount form into container
  // ----------------------------------------------------------

  containerEl.append(formEl);
}
