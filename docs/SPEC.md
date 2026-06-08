# AI Workspace — MVP Specification

Version: MVP
Status: In Development

---

# 1. Purpose

AI Workspace is a local-first Chrome extension that adds a persistent workspace layer on top of ChatGPT.

The extension allows users to organize captured information into projects and items without leaving the ChatGPT interface.

All data is stored locally.

No backend services are used.

---

# 2. Core Goals

The MVP must provide:

- Project management
- Item management
- Persistent local storage
- Fast retrieval of saved information
- Lightweight floating UI
- Full operation inside ChatGPT

The MVP does not include:

- Cloud sync
- Authentication
- Collaboration
- AI-generated organization
- Sharing
- Export systems
- Advanced search

---

# 3. Product Model

The workspace contains Projects.

Projects contain Items.

Relationship:

Workspace
└── Projects
└── Items

A Project acts as a container.

An Item represents a saved piece of information.

---

# 4. Data Models

## Project

Fields:

- id
- name
- createdAt

Requirements:

- id must be unique
- name must not be empty

---

## Item

Fields:

- id
- projectId
- title
- content
- createdAt
- updatedAt

Requirements:

- item belongs to exactly one project
- title may be empty
- content may be empty

---

# 5. Storage

Storage is fully local.

Implementation:

- IndexedDB

Storage responsibilities:

- persist projects
- persist items
- support CRUD operations

Storage must not:

- render UI
- mutate runtime UI state
- perform UI orchestration

---

# 6. Runtime State

Runtime state exists only in memory.

Purpose:

- loading indicators
- error indicators
- render snapshots
- selected entities

Runtime state is separate from storage.

Refreshing the page rebuilds runtime state from IndexedDB.

---

# 7. UI Architecture

Architecture layers:

Storage
↓
Controllers
↓
Runtime State
↓
Renderers
↓
DOM

Responsibilities:

Storage:

- persistence

Controllers:

- orchestration

Runtime State:

- current UI state

Renderers:

- DOM generation

Components:

- reusable UI fragments

---

# 8. Floating UI

The extension injects a floating interface into ChatGPT.

The floating interface consists of:

- Orb
- Action Buttons
- Floating Panels

---

# 9. Orb

The Orb is the primary entry point.

Responsibilities:

- open action menu
- close action menu

The Orb does not:

- render business data
- perform storage operations

---

# 10. Actions

Current actions:

- Projects
- Capture
- Search

MVP requirement:

Projects must be functional.

Capture and Search may initially exist as placeholders.

---

# 11. Projects Feature

Projects panel displays:

- loading state
- error state
- empty state
- project list

Projects panel includes:

- create project form

Each project row supports:

- selection
- rename
- delete

---

# 12. Project Creation

User enters a name.

System:

1. Creates project.
2. Persists project.
3. Reloads projects.
4. Re-renders UI.

Validation:

- empty names rejected

---

# 13. Project Selection

Selecting a project:

1. Stores selected project id.
2. Opens items panel.
3. Loads items for project.

---

# 14. Project Rename

User initiates rename.

System:

1. Displays inline rename input.
2. Saves updated name.
3. Reloads projects.
4. Re-renders UI.

Validation:

- empty names rejected

---

# 15. Project Delete

Deleting a project:

1. Removes project.
2. Removes associated items.
3. Reloads projects.
4. Returns user to Projects panel if deleted project was selected.

Deletion is permanent.

---

# 16. Items Feature

Items belong to a single project.

Items panel displays:

- loading state
- error state
- empty state
- item list

Items panel includes:

- create item form

Each item supports:

- selection
- update
- delete

---

# 17. Item Creation

User enters:

- title
- content

System:

1. Creates item.
2. Persists item.
3. Reloads item list.
4. Re-renders UI.

---

# 18. Item Selection

Selecting an item opens detail view.

Detail view allows editing.

---

# 19. Item Update

User edits:

- title
- content

System:

1. Saves item.
2. Updates storage.
3. Reloads item.
4. Re-renders UI.

---

# 20. Item Delete

Deleting an item:

1. Removes item.
2. Reloads list.
3. Clears selection if necessary.

Deletion is permanent.

---

# 21. Search (MVP)

Search is scoped to local workspace data.

Search may initially support:

- project names
- item titles
- item content

A simplified implementation is acceptable for MVP.

---

# 22. Capture (MVP)

Capture creates items from current page context.

Initial MVP requirement:

- manual capture action
- item creation from selected text

Advanced capture workflows are out of scope.

---

# 23. Error Handling

Every async workflow should support:

- loading state
- failure state
- recovery through retry

Errors should be converted into user-readable messages.

---

# 24. Non-Goals

The MVP intentionally excludes:

- remote APIs
- user accounts
- synchronization
- sharing
- team features
- AI categorization
- vector databases
- browser-wide indexing

---

# 25. MVP Completion Criteria

The MVP is complete when:

✓ Projects can be created

✓ Projects can be renamed

✓ Projects can be deleted

✓ Items can be created

✓ Items can be edited

✓ Items can be deleted

✓ Data survives browser refresh

✓ Data survives browser restart

✓ Floating UI remains stable

✓ Search works against local data

✓ Capture can create items

No additional features are required for MVP completion.
