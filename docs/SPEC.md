# AI Workspace (v0) — Technical Specification

Version: `0.1`
Target Platform: Chrome Extension (Manifest V3)
Primary Host: `chatgpt.com`
Architecture Style: Local-first, vertical-slice development

---

# 1. Purpose

AI Workspace is a local-first browser extension that injects a persistent workspace sidebar into ChatGPT.

The extension allows users to:

- organize work into Projects
- store structured Items under Projects
- capture selected text from pages
- build reusable context packs for AI workflows
- export/import local workspace data

The system is intentionally minimal in v0.

The goal is reliability, persistence, and workflow utility — not feature breadth.

---

# 2. Scope (v0)

## Included

### Projects

- create
- list
- rename
- delete

### Items

- create
- list by project
- update
- delete

### Capture

- manual item creation
- save current text selection into active project

### Utility

- context pack generation
- clipboard copy
- JSON export/import

### Persistence

- IndexedDB
- local-only storage

---

# 3. Non-Goals (v0)

The following are explicitly out of scope:

- cloud sync
- authentication
- collaboration
- AI API integration
- automatic conversation ingestion
- semantic search
- markdown editor
- rich text editor
- multi-device sync
- encryption
- chat history scraping
- background sync
- browser support outside Chrome MV3

---

# 4. Architectural Principles

## 4.1 Local-first

All user data is stored locally inside IndexedDB.

No remote server exists in v0.

---

## 4.2 Vertical Slice Development

Features are implemented end-to-end in isolated slices.

Example:

- model
- storage
- state
- rendering
- interaction

...for a single feature before moving to the next.

---

## 4.3 Separation of Responsibilities

### Storage Layer

Responsible for:

- IndexedDB access
- persistence
- schema upgrades

Not responsible for:

- DOM
- rendering
- UI state

---

### State Layer

Responsible for:

- in-memory UI state
- selected entities
- cached data snapshots

Not responsible for:

- rendering
- IndexedDB logic

---

### Render Layer

Responsible for:

- DOM rendering
- HTML generation
- visual updates

Not responsible for:

- persistence
- business logic

---

### Controller Layer

Responsible for:

- orchestration
- event wiring
- coordinating state + storage + rendering

Not responsible for:

- direct DOM querying
- HTML generation
- IndexedDB implementation details

---

# 5. Data Model

---

# 5.1 General Conventions

## IDs

- all IDs are strings
- IDs must be globally unique

Recommended format:

- `crypto.randomUUID()`

---

## Timestamps

All timestamps use:

```ts
number; // epoch milliseconds
```

````

Example:

```ts
Date.now();
```

---

## Serialization

All stored objects must be JSON-serializable.

No functions, classes, Maps, Sets, or binary data.

---

# 5.2 Project Model

```ts
type Project = {
  id: string;
  name: string;

  createdAt: number;

  updatedAt?: number;
  description?: string;
};
```

---

## Project Constraints

### Required

- `id`
- `name`
- `createdAt`

### Optional

- `updatedAt`
- `description`

---

## Validation Rules

### `name`

- trimmed before persistence
- cannot be empty after trimming

---

## Uniqueness

Project name uniqueness is NOT enforced in v0.

Duplicate names are allowed.

---

# 5.3 Item Model

```ts
type ItemType = "note" | "snippet" | "task" | "link";

type Item = {
  id: string;

  projectId: string;

  type: ItemType;

  title: string;
  content: string;

  createdAt: number;

  updatedAt?: number;

  meta?: ItemMeta;
};
```

---

# 5.4 Item Metadata

```ts
type ItemMeta = {
  sourceUrl?: string;

  createdFrom?: "manual" | "selection";

  language?: string;

  selectionContext?: string;
};
```

---

# 5.5 Item Constraints

## Required

- `id`
- `projectId`
- `type`
- `title`
- `content`
- `createdAt`

---

## Relationships

Each Item belongs to exactly one Project.

`projectId` must reference an existing Project.

---

## Content Rules

### `content`

- must always be a string
- binary data unsupported in v0

---

## Type Rules

Supported types:

- `note`
- `snippet`
- `task`
- `link`

Type behavior:

| Type    | Meaning           |
| ------- | ----------------- |
| note    | freeform text     |
| snippet | code/text snippet |
| task    | single task text  |
| link    | URL content       |

---

# 6. Persistence

---

# 6.1 Storage Engine

Persistence uses:

- IndexedDB
- directly inside the content script

Service worker persistence is intentionally avoided in v0.

Reason:

- simpler architecture
- avoids MV3 service worker lifecycle complexity

---

# 6.2 Database Definition

```ts
dbName = "aiw_db";
dbVersion = 1;
```

---

# 6.3 Object Stores

## projects

### Key Path

```ts
id;
```

### Stored Values

```ts
Project;
```

---

## items

### Key Path

```ts
id;
```

### Stored Values

```ts
Item;
```

### Indexes

#### byProjectId

```ts
projectId;
```

Non-unique.

Used for:

- filtering items by project

---

# 6.4 Schema Upgrade Policy

Schema changes require:

- incrementing database version
- implementing upgrade migration logic

Migrations must ONLY:

- create/remove stores
- create/remove indexes
- transform schema data

Migrations must NOT:

- contain UI logic
- contain rendering logic

---

# 7. Storage API Contract

---

# 7.1 createProject

## Inputs

```ts
name: string
description?: string
```

---

## Behavior

- trims name
- validates non-empty
- generates ID
- creates timestamps
- persists project

---

## Returns

```ts
Promise<Project>;
```

---

## Errors

Throws if:

- IndexedDB write fails
- validation fails

---

# 7.2 listProjects

## Inputs

None.

---

## Behavior

Returns all stored projects.

Sorting policy:

```txt
newest first
```

Sorted by:

```txt
createdAt DESC
```

---

## Returns

```ts
Promise<Project[]>;
```

---

## Errors

Throws if IndexedDB read fails.

---

# 7.3 deleteProject

## Inputs

```ts
projectId: string;
```

---

## Behavior

- deletes matching project
- cascade deletes all items with matching `projectId`

If project does not exist:

```txt
no-op
```

---

## Returns

```ts
Promise<void>;
```

---

# 7.4 createItem

## Inputs

```ts
projectId
type
title
content
meta?
```

---

## Behavior

- validates project existence
- creates Item
- persists Item

---

## Returns

```ts
Promise<Item>;
```

---

# 7.5 listItemsByProject

## Inputs

```ts
projectId: string;
```

---

## Behavior

Uses IndexedDB index:

```txt
byProjectId
```

Sorting policy:

```txt
newest first
```

Sorted by:

```txt
createdAt DESC
```

---

## Returns

```ts
Promise<Item[]>;
```

---

# 7.6 updateItem

## Inputs

```ts
itemId: string;
partialUpdate: Partial<Item>;
```

---

## Behavior

- loads existing item
- merges mutable fields
- updates `updatedAt`

Immutable fields:

- `id`
- `projectId`
- `createdAt`

---

## Returns

```ts
Promise<Item>;
```

---

## Errors

Throws if:

- item does not exist
- IndexedDB operation fails

---

# 7.7 deleteItem

## Inputs

```ts
itemId: string;
```

---

## Behavior

Permanently deletes item.

Missing item:

```txt
no-op
```

---

## Returns

```ts
Promise<void>;
```

---

# 8. UI Architecture

---

# 8.1 Sidebar Injection

The extension injects a fixed-position sidebar into ChatGPT pages.

Requirements:

- idempotent injection
- no duplicate sidebars
- no duplicate CSS injection

---

# 8.2 Sidebar Layout

Minimum v0 layout:

```txt
Header
Projects Section
Items Section
Item Details Section
Footer Actions
```

---

# 8.3 UI State

```ts
selectedProjectId: string | null
selectedItemId: string | null

projects: Project[]
items: Item[]
```

---

# 8.4 State Rules

UI state is ephemeral.

IndexedDB is persistent.

Rendering must derive from:

```txt
state + cached storage snapshot
```

NOT from:

```txt
live IndexedDB queries inside render functions
```

---

# 9. Rendering Rules

Renderers must:

- be pure
- accept explicit inputs
- avoid global state access
- avoid persistence calls

Renderers must NOT:

- query IndexedDB
- mutate application state
- attach global listeners repeatedly

---

# 10. Capture Workflow

---

# 10.1 Manual Creation

User creates Item manually through sidebar controls.

---

# 10.2 Selection Capture

Workflow:

1. user selects page text
2. user clicks "Save Selection"
3. extension creates Item

Stored values:

```ts
content = selected text
meta.sourceUrl = current URL
meta.createdFrom = "selection"
```

---

# 11. Context Pack Generator

User selects multiple Items.

The system generates deterministic grouped output.

Output groups Items by type.

Generated text is copied to clipboard.

---

# 12. Export / Import

---

# 12.1 Export

Export format:

```ts
{
  schemaVersion: number;
  exportedAt: number;

  projects: Project[];
  items: Item[];
}
```

---

# 12.2 Import

v0 policy:

```txt
replace-all
```

Behavior:

- validates schemaVersion
- clears current DB
- imports provided data

Unknown schema versions must be rejected.

---

# 13. Security & Privacy

## Guarantees

- no cloud storage
- no telemetry
- no user tracking
- no AI data transmission

---

## Restrictions

The extension must never store:

- API keys
- auth tokens
- cookies
- credentials

---

# 14. MVP Completion Criteria

The MVP is complete only when all are true:

- Projects persist correctly
- Items persist correctly
- Item update/delete works
- Selection capture works
- Context pack generation works
- Export/import works
- Sidebar injection is stable
- No duplicate injection bugs remain

---

# 15. Future Extensions (Out of Scope)

Potential future features:

- task completion state
- tags
- full-text search
- encrypted sync
- multi-device sync
- drag/drop ordering
- markdown editor
- chat ingestion
- embeddings/vector search
- AI summarization
- workspace templates

```
````
