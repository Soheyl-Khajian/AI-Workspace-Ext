// src/ui/features/items/buildContextPack.ts
// ------------------------------------------------------------
// CONTEXT PACK BUILDER
// ------------------------------------------------------------
//
// Responsibility:
//
// - format a set of items into deterministic, grouped Markdown
// - group by item type in a fixed order (Notes, Snippets, Tasks, Links)
// - sort within each group by createdAt (id as a stable tiebreaker)
//
// IMPORTANT:
//
// - PURE function: inputs -> string, no side effects
// - NO DOM access
// - NO state access (operates only on the items passed in)
// - NO storage access
// - NO clipboard / async work
//
// Resolving selected IDs to items, copying to clipboard, and showing
// toasts are the wiring layer's job, not this function's.
// ------------------------------------------------------------

import type { Item } from "../../../models/item";

const GROUPS = [
  { type: "note", label: "Notes" },
  { type: "snippet", label: "Snippets" },
  { type: "task", label: "Tasks" },
  { type: "link", label: "Links" },
] as const;

export function buildContextPack(projectName: string, items: Item[]): string {
  const lines: string[] = [];

  lines.push(`# Context Pack — ${projectName}`);
  lines.push("");

  for (const group of GROUPS) {
    const groupItems = items
      .filter((item) => item.type === group.type)
      .slice()
      .sort((a, b) => {
        const createdAtDiff = a.createdAt - b.createdAt;

        if (createdAtDiff !== 0) return createdAtDiff;

        return a.id.localeCompare(b.id);
      });

    if (groupItems.length === 0) continue;

    lines.push(`## ${group.label}`);
    lines.push("");

    for (const item of groupItems) {
      const title = item.title.trim().length > 0 ? item.title : "Untitled";

      lines.push(`### ${title}`);

      if (item.content.trim().length > 0) {
        lines.push(item.content);
      }

      lines.push("");
    }
  }

  return lines.join("\n").trim();
}
