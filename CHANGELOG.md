# Changelog

All notable changes to this project are documented in this file.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/Soheyl-Khajian/AI-Workspace-Ext/releases/tag/v0.1.0
