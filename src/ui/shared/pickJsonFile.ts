// src/ui/shared/pickJsonFile.ts
// ------------------------------------------------------------
// PICK JSON FILE (UTILITY)
// ------------------------------------------------------------
//
// Responsibility:
//
// - open a native file dialog, let the user pick a .json file,
//   and resolve with its text contents
//
// IMPORTANT:
//
// - SIDE-EFFECTING: creates a file input and opens a dialog
// - resolves null when the user cancels or picks nothing, so the
//   caller can treat "no selection" as a clean no-op (not an error)
// - rejects only when a chosen file genuinely fails to read
// ------------------------------------------------------------

export function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";

    // Fired by the browser when the dialog is dismissed with no choice.
    input.addEventListener("cancel", () => {
      resolve(null);
    });

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const text = await file.text();
        resolve(text);
      } catch {
        reject(new Error("Couldn't read the selected file."));
      }
    });

    // A detached input is fine to click in Chromium.
    input.click();
  });
}
