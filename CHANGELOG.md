# Changelog

All notable changes to this project are documented in this file.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-08-03

### Added

- **Master-detail items panel**: item details render in a second column
  beside the items list, so the list stays visible and scrollable while
  editing. Selecting an item swaps the detail column's subject in place,
  and the separate item-detail panel is retired.
- **Fixed panel geometry**: panels use a fixed size (1050×680, clamped to
  the viewport) instead of content-driven bounds, so the layout stays
  stable across panels and states.

### Changed

- **`panels.css` split into role and feature files** under
  `src/ui/styles/panels/` (base, rows, projects, forms, items, buttons,
  context, search, backup, toast) with a byte-identical rule stream; the
  manifest exposes the folder via a wildcard.
- Item rows are fixed-height (40px), single-line with ellipsis; the list
  column is fixed at 320px.

### Fixed

- The items list keeps its scroll position across re-renders (checkbox
  toggles, saves, deletes) instead of jumping back to the selected row;
  the position resets only when switching projects.
- Action pill hover uses an opaque surface, so it no longer turns white
  over light host pages.
- All scrollables inside panels (body, list column, textareas) share one
  scrollbar treatment; textareas previously rendered unstyled browser
  scrollbars, and scrollbar tracks no longer show the text I-beam cursor.
- Panel entrance animation no longer gets cancelled when a panel's
  opening triggers an immediate data load (search panel appeared
  with no animation at all).

## [0.3.0] - 2026-08-01

### Added

- **Workspace search**: a search panel on the orb that matches items across
  all projects by title and content, backed by a new `listAllItems` storage
  door and a test-first matching contract.
- **Search → project navigation**: search result rows are clickable and open
  the matched item's project directly in the Items panel.
- **Move items between projects**: the item detail panel shows a project
  selector alongside the item's fields; picking a different project moves the
  item, returns to the source project's items list, and confirms with a
  "Moved to X" toast. Everything except the item's project and `updatedAt` is
  preserved, and unsaved detail edits survive the move. The native dropdown is
  pinned to the anchored-glass theme so it stays readable on any host page.
- **`moveItemToProject` storage door**: the only API that changes an item's
  `projectId` (`updateItem` deliberately ignores it). Strict target-project
  validation; moving an item to the project it already lives in is a no-op.
- **Test harness and contract suites**: Vitest infrastructure with 56 tests
  across 5 files pinning the rename-draft, form-draft, and search-matching
  state contracts, the full `parseBackup` validation contract, and the
  storage facade contract (run against real IndexedDB semantics via
  `fake-indexeddb`, with per-test database isolation and deterministic
  clocks).
- **CI stale-dist guard**: the pipeline fails when the committed `dist/`
  bundle doesn't match a fresh build.

### Fixed

- Inline project rename no longer breaks when draft updates arrive outside an
  active rename edit; `setRenameDraft` now guards against calls with no edit
  in progress.

## [0.2.0] - 2026-07-27

### Added

- **Project context breadcrumb**: project-scoped panels (Items, Item Detail)
  show which project they belong to in the panel header; opening Items with no
  project selected shows a "Select a project" state that links back to the
  Projects panel.
- **Deselect strip**: the selected project row shows a control to release the
  selection without having to select a different project.

### Changed

- **Design system retheme**: all styles tokenized (role-named custom
  properties, `color-mix()`-derived color families) under an "anchored glass"
  theme; elliptical action fan anchored to the orb; panels centered on the
  viewport; build-context bar moved into the items panel header.
- **Inline project rename is state-driven**: renaming now survives UI
  re-renders. Enter commits, Escape cancels, clicking away commits changed
  text and cancels unchanged text; committing an empty or unchanged name
  cancels instead of writing.
- **In-flight form text survives re-renders**: create-project, create-item,
  and item-detail inputs no longer lose typed text when the UI re-renders in
  the background (e.g. after a capture).
- **Items loading indicator is delayed**: "Loading items…" appears only when
  loading exceeds a perception threshold, removing the indicator flash on
  fast loads.

### Fixed

- `animations.css` was missing from `web_accessible_resources`, silently
  disabling all entrance animations.
- Panel entrance animation no longer replays on every same-panel re-render;
  it plays only when the active panel actually changes.
- Duplicate project names (e.g. two "Inbox" projects) now resolve
  deterministically to the oldest project instead of an arbitrary match, so
  captures always land in the same Inbox.

## [0.1.0] - 2026-07-20

Initial MVP release.

### Added

- **Floating orb UI** injected on `chatgpt.com` that expands into action buttons
  and panels and collapses on outside click.
- **Projects**: create, rename, select, and delete, with cascade deletion of a
  project's items.
- **Items**: typed items with a title and content — create, edit via a detail
  view, select, and delete.
- **Capture from page**: save selected text on `chatgpt.com` as an item via the
  right-click menu, routed to the selected project or an auto-created **Inbox**.
- **Build context**: assemble a project's items into a context pack copied to the
  clipboard.
- **Backup & restore**: export the workspace to JSON and import to fully restore
  it.
- **Local-first persistence** via IndexedDB, scoped to the `chatgpt.com` origin;
  runtime UI state is rebuilt from storage on load.
- **Resilience hardening**: survives ChatGPT's in-app navigation by
  automatically re-mounting the UI, guards against duplicate content-script
  injection, and makes Inbox creation atomic to prevent duplicate projects.

[Unreleased]: https://github.com/Soheyl-Khajian/AI-Workspace-Ext/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/Soheyl-Khajian/AI-Workspace-Ext/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Soheyl-Khajian/AI-Workspace-Ext/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Soheyl-Khajian/AI-Workspace-Ext/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Soheyl-Khajian/AI-Workspace-Ext/releases/tag/v0.1.0
