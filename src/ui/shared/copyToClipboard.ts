// src/ui/shared/copyToClipboard.ts
// ------------------------------------------------------------
// COPY TO CLIPBOARD (UTILITY)
// ------------------------------------------------------------
//
// Responsibility:
//
// - copy a string to the system clipboard
// - prefer the async Clipboard API, fall back to a temporary
//   textarea + execCommand for older / restricted contexts
// - report success as a boolean; never throw
//
// IMPORTANT:
//
// - must be called within a user gesture (e.g. a click handler),
//   and the clipboard write must be the first await in that chain
// - NO app state access
// - NO rendering / business logic
// ------------------------------------------------------------

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    let textareaEl: HTMLTextAreaElement | null = null;

    try {
      textareaEl = document.createElement("textarea");
      textareaEl.value = text;

      textareaEl.style.position = "fixed";
      textareaEl.style.top = "0";
      textareaEl.style.opacity = "0";
      textareaEl.style.pointerEvents = "none";

      document.body.appendChild(textareaEl);

      textareaEl.focus();
      textareaEl.select();
      textareaEl.setSelectionRange(0, text.length);

      // Deprecated but still works everywhere; only reached when the async Clipboard API fails.
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      textareaEl?.remove();
    }
  }
}
