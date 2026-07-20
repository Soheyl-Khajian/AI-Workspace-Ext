# AI Workspace

> A local-first Chrome extension that adds a persistent workspace layer on top
> of ChatGPT — organize captured information into projects and items without
> leaving the chat.

**Status:** MVP · `v0.1.0` · source-available (all rights reserved — see [License](#license))

AI Workspace injects a lightweight floating UI onto `chatgpt.com` where you can
keep project notes and snippets right next to your conversations. Everything is
stored locally in your browser — no account, no backend, no data leaving your
machine.

<!-- TODO: add a screenshot or short GIF of the orb + panels here, e.g.: -->
<!-- ![AI Workspace floating UI](docs/screenshot.png) -->

## Features

- **Floating orb UI** — an unobtrusive orb on `chatgpt.com` that expands into
  action buttons and panels, and collapses when you click away.
- **Projects** — create, rename, select, and delete projects. Deleting a project
  cascades to its items so nothing is left orphaned.
- **Items** — typed items (notes and more) with a title and content. Create them,
  open a detail view to edit and save, select them, and delete them.
- **Capture from the page** — select text on `chatgpt.com`, right-click, and save
  it as an item. It goes into your selected project, or into an auto-created
  **Inbox** project if none is selected.
- **Build context** — assemble a project's items into a single context pack and
  copy it to your clipboard, ready to paste back into a prompt.
- **Backup & restore** — export your entire workspace to a JSON file and import
  it to fully restore your data.
- **Local-first** — all data lives in IndexedDB in your browser; runtime UI state
  is rebuilt from storage on every load.
- **Resilient** — the UI survives ChatGPT's in-app navigation (auto-remounts if
  the page detaches it) and guards against double-injection and duplicate-project
  races.

## Data & privacy

All data is stored locally via **IndexedDB**, scoped to the `chatgpt.com` origin.
There is no backend, no telemetry, and no external network calls — nothing ever
leaves your browser. Since your only copy is local, use **Export** to keep
backups.

> Because the data is tied to the `chatgpt.com` origin (not to the extension),
> uninstalling the extension does **not** erase your workspace, and captured data
> persists across reinstalls.

## Product model

```
Workspace
└── Projects
    └── Items
```

- A **Project** is a container.
- An **Item** is a saved piece of information that belongs to exactly one
  project.

### Data models

**Project**

| Field       | Notes     |
| ----------- | --------- |
| `id`        | unique    |
| `name`      | non-empty |
| `createdAt` | timestamp |

**Item**

| Field       | Notes                          |
| ----------- | ------------------------------ |
| `id`        | unique                         |
| `projectId` | owning project                 |
| `type`      | item type                      |
| `title`     | may be empty                   |
| `content`   | may be empty                   |
| `meta`      | capture metadata (e.g. source) |
| `createdAt` | timestamp                      |
| `updatedAt` | timestamp (set on edit)        |

## Installation (load unpacked)

Not on the Chrome Web Store yet. To run it:

**Option A — from a release (no build needed)**

1. Download the source archive from the [Releases](../../releases) page and unzip
   it. The built `dist/` is included, so it's ready to load.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the unzipped folder (the one containing
   `manifest.json`).
5. Open or reload `https://chatgpt.com` — the orb appears in the corner.

**Option B — build from source** (see below), then load the project folder the
same way.

## Build from source

Requirements: [Node.js](https://nodejs.org) 18+ and npm.

```bash
npm install     # install dev dependencies
npm run build   # one-off build into dist/
npm run watch   # rebuild on change during development
```

The build ([esbuild](https://esbuild.github.io/)) bundles the TypeScript entry
points into IIFE bundles under `dist/`, then copies the UI shell HTML and styles
into `dist/ui/`. Load the project root as an unpacked extension as described
above.

## Architecture

The UI follows a one-directional layering:

```
Storage → Controllers → Runtime State → Renderers → DOM
```

- **Storage** — persistence only.
- **Controllers** — orchestrate workflows.
- **Runtime state** — the current in-memory UI state (selection, active panel);
  rebuilt from storage on load.
- **Renderers** — turn state into DOM.

Storage itself is further layered **facade → repo → IndexedDB**: the facade owns
validation and domain rules, while the repo layer stays a thin, predictable
adapter over IndexedDB with no business logic.

### Project structure

```
src/
  background/   Service worker: context menu + capture messaging
  content/      Content-script entry: bootstrap + asset injection
  capture/      Capture handler (selection -> item, Inbox resolution)
  ui/
    core/       Mount lifecycle, floating controller, DOM, UI state
    features/   Feature controllers: projects, items, backup
    shared/     Small shared helpers (e.g. toasts)
    styles/     Floating UI CSS
  storage/
    index.ts    Public storage API (validation + domain rules)
    repo/       Thin IndexedDB adapters (projects, items, backup)
    idb/        DB open / migrations / schema / promise helpers
  models/       Domain types (Project, Item)
build.mjs       esbuild build + asset copy
manifest.json   MV3 manifest
```

## Tech stack

- **TypeScript** (strict), targeting Chrome 120+
- **esbuild** for bundling
- **Chrome Extensions Manifest V3** (service worker + content script)
- **IndexedDB** for local persistence

## Roadmap

`v0.1.0` is the MVP baseline. Planned next:

- Search across local workspace data (project names, item titles, content)
- Richer item types and content editing
- UI/UX polish and theming
- Pro features
- Chrome Web Store release

## License

All rights reserved. This source is publicly viewable but is **not** currently
licensed for use, modification, or redistribution. A formal license may be added
in a future release.

© 2026 Soheyl Khajian. All rights reserved.
