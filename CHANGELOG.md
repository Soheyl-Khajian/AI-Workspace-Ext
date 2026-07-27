# Changelog

All notable changes to this project are documented in this file.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Soheyl-Khajian/AI-Workspace-Ext/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Soheyl-Khajian/AI-Workspace-Ext/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Soheyl-Khajian/AI-Workspace-Ext/releases/tag/v0.1.0
