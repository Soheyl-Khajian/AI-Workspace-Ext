// src/ui/renderers/renderItemForm.ts
// ------------------------------------------------------------
// ITEM FORM RENDERER
//
// Responsibility:
// - Renders the item creation form UI
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
// renderItemForm(...)
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

export function renderItemForm(
  containerEl: HTMLElement,
  isOpen: boolean,
  draftTitle: string,
  draftContent: string,
  onTitleInput: (title: string) => void,
  onContentInput: (content: string) => void,
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
  // Create item title input
  // ----------------------------------------------------------

  const titleInputEl = document.createElement("input");

  titleInputEl.type = "text";
  titleInputEl.placeholder = "Item title";
  titleInputEl.value = draftTitle;

  // ----------------------------------------------------------
  // Sync title changes back to state owner
  // ----------------------------------------------------------

  titleInputEl.addEventListener("input", () => {
    onTitleInput(titleInputEl.value);
  });

  // ----------------------------------------------------------
  // Create item content textarea
  // ----------------------------------------------------------

  const contentTextareaEl = document.createElement("textarea");

  contentTextareaEl.placeholder = "Item content";
  contentTextareaEl.rows = 3;
  contentTextareaEl.value = draftContent;

  // ----------------------------------------------------------
  // Sync content changes back to state owner
  // ----------------------------------------------------------

  contentTextareaEl.addEventListener("input", () => {
    onContentInput(contentTextareaEl.value);
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

  formEl.append(
    titleInputEl,
    contentTextareaEl,
    submitButtonEl,
    cancelButtonEl,
  );

  // ----------------------------------------------------------
  // Mount form into container
  // ----------------------------------------------------------

  containerEl.append(formEl);
}
