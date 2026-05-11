# AI Workspace (v0) — SPEC

## Purpose

AI Workspace is a local-first browser extension that adds a persistent project workspace alongside ChatGPT. It helps the user organize work into Projects and Items (notes/snippets/tasks/links) and generate structured “context packs” to paste into ChatGPT.

v0 is designed for a single user (the developer) and runs on `chatgpt.com` only.

## Non-goals (v0)

- No cloud sync
- No collaboration / multi-user
- No AI features inside the extension
- No full chat scraping or automatic ingestion of conversations
- No advanced editor (plain input/textarea is sufficient)
- No global search across all items (optional later)

## Core Concepts

### Project

A Project is the top-level container for work. All captured text and user-created content is stored as Items under a Project.

### Item

An Item is a single unit of stored content. Items belong to exactly one Project.

Supported Item types (v0):

- `note`
- `snippet`
- `task`
- `link`

## Data Model

### Field conventions

- All IDs are strings.
- Timestamps are stored as epoch milliseconds (`number`).
- Strings are UTF-8.
- All objects should be JSON-serializable.

### Project shape

Required:

- `id: string` — globally unique ID
- `name: string` — human-readable project name
- `createdAt: number` — epoch ms

Optional:

- `updatedAt: number` — epoch ms
- `description: string` — short free-text description

Constraints:

- `name` must be non-empty after trimming whitespace.
- `name` uniqueness is not enforced in v0 (two projects may share a name), but the UI should discourage duplicates.

### Item shape

Required:

- `id: string` — globally unique ID
- `projectId: string` — must match an existing Project `id`
- `type: "note" | "snippet" | "task" | "link"`
- `title: string` — short label; can be empty in v0 but UI should generate a default
- `content: string` — main payload; meaning depends on `type`
- `createdAt: number` — epoch ms

Optional:

- `updatedAt: number` — epoch ms
- `meta: object` — optional metadata (see below)

Constraints:

- Every Item must belong to exactly one Project.
- `type` is immutable after creation in v0 (optional; if you want it mutable, decide now and keep it consistent).
- `content` must be a string. No binary in v0.

### Item `meta` shape (optional)

All fields optional:

- `sourceUrl: string` — page URL where capture occurred (e.g., current chat URL)
- `createdFrom: "manual" | "selection"` — how the item was created
- `language: string` — only meaningful for `snippet` (e.g., "js", "ts", "bash")
- `selectionContext: string` — optional small context around selection (future)

Constraints:

- No secrets (tokens/keys) are ever stored in metadata.
- Metadata should be safe to export.

### Type-specific semantics

- `note`: `content` is free text.
- `snippet`: `content` is code text; `meta.language` may be set.
- `task`: `content` is task text (single task per item in v0). Completion state is not stored in v0 unless explicitly added as a field (see “Future Extensions”).
- `link`: `content` is a URL string; `title` is the label.

## Storage (IndexedDB)

### Storage goals

- Local-first persistence
- Efficient retrieval of items by project
- Minimal schema for v0 to reduce migration complexity

### Database

- `dbName`: `aiw_db`
- `dbVersion`: `1`

### Object stores

1. `projects`

- Key path: `id`
- Value: Project objects

2. `items`

- Key path: `id`
- Value: Item objects
- Indexes:
  - `byProjectId` on `projectId` (non-unique)
  - `byType` on `type` (non-unique) (optional in v0; include only if you know you’ll filter by type early)

### Upgrade policy

- Schema changes require incrementing `dbVersion` and implementing an upgrade path.
- v0 avoids schema churn; fields may be added in a backward-compatible way, but stores and key paths should remain stable.

## Operations (v0)

### Projects

- Create Project
  - Input: `name` (required), `description` (optional)
  - Output: stored Project record

- List Projects
  - Output: projects sorted by `createdAt` ascending or descending (pick one and keep consistent)

- Rename Project
  - Updates `name` and `updatedAt`

- Delete Project
  - v0 behavior: **cascade delete** all Items with matching `projectId`
  - Rationale: simpler UX and avoids orphaned items

### Items

- Create Item
  - Input: `projectId`, `type`, `title`, `content`, optional `meta`

- List Items by Project
  - Query uses `items.byProjectId`

- Update Item
  - Updates `title` and/or `content` and `updatedAt`

- Delete Item
  - Removes from `items`

## UI Mapping (v0)

### Sidebar

- Visible only on `chatgpt.com`
- Injected as an overlay anchored to the right side
- UI structure loaded from `sidebar.html`
- CSS loaded from `sidebar.css` via extension URL injection into page `<head>`

### Minimum UI elements

- Project list
- “New Project” button
- Items list for active project (optional in early v0, but planned)
- “Save selection” action (button or context menu later)

UI State (v0)

Define explicitly:

selectedProjectId: string | null (ephemeral UI state)
projects: Project[] (loaded from IndexedDB at startup)

Rule:

UI state is ephemeral
DB is persistent
render is derived from UI state + cached DB snapshot (not live queries inside render)

### Behavior rules

- Sidebar injection must be idempotent (never insert twice).
- CSS injection must be idempotent (never insert duplicate `<link>`).
- No scraping of chat history; only intentional user capture.

## Capture Workflow (v0)

### Manual creation

User can create a note/snippet/task/link item via sidebar UI under the active project.

### Selection capture

User selects text on the page and saves it as a new Item:

- `content` = selected text
- `meta.sourceUrl` = current URL
- `meta.createdFrom` = `"selection"`

Context menus are optional after basic capture works.

## Export / Import (planned, not required in the earliest v0)

Export format:

- JSON file containing:
  - `schemaVersion: number`
  - `exportedAt: number`
  - `projects: Project[]`
  - `items: Item[]`

Import behavior (future):

- Either “merge” or “replace” mode (choose later)

## Security & Privacy

- All data stored locally in IndexedDB.
- No network calls for user data.
- Web-accessible resources are restricted to only required UI assets and only for `chatgpt.com/*`.
- Never store API keys or credentials anywhere in the extension.

## Future Extensions (out of scope for v0)

- Item completion field for `task` (`done: boolean`)
- Tags and global search
- Multi-site capture
- Context pack generator
- Version history and backup automation
- Encrypted sync
