// src/ui/shared/downloadJson.ts
// ------------------------------------------------------------
// DOWNLOAD JSON (UTILITY)
// ------------------------------------------------------------
//
// Responsibility:
//
// - serialize a value to pretty-printed JSON and trigger a
//   browser file download under the given filename
//
// IMPORTANT:
//
// - SIDE-EFFECTING: touches the DOM and starts a download
//   (not a pure function)
// - revokes the object URL after use to avoid leaking blobs
// - knows nothing about backups — caller owns the filename
// ------------------------------------------------------------

export function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);

  const blob = new Blob([json], { type: "application/json" });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
