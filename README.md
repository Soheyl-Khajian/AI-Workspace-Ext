# AI Workspace

AI Workspace is a Chrome extension that adds a local workspace layer on top of ChatGPT.

The extension provides a floating UI for organizing information into projects and items without relying on external services. All data is stored locally in the browser.

## Current MVP

### Projects

- Create projects
- Rename projects
- Delete projects
- Select projects
- Persist projects locally

### Items

- Create items inside projects
- Edit item content
- Delete items
- Browse project items
- Persist items locally

### Interface

- Floating orb entry point
- Expandable action menu
- Floating glass-style panels
- Runtime loading states
- Runtime empty states
- Runtime error states

## Architecture

The codebase follows a layered architecture.

### Storage Layer

Responsible for persistence and data access.

Responsibilities:

- IndexedDB access
- CRUD operations
- Repository functions
- Cascade deletion workflows

### State Layer

Responsible for runtime UI state.

Responsibilities:

- Projects state
- Items state
- Session state
- Floating UI state

### Controller Layer

Responsible for orchestration.

Responsibilities:

- Feature workflows
- State synchronization
- Storage coordination
- UI refresh triggering

Controllers do not render UI and do not manipulate DOM directly.

### Rendering Layer

Responsible for UI creation.

Responsibilities:

- DOM generation
- State visualization
- Component composition

Renderers do not perform storage operations and do not mutate application state.

### UI Components

Reusable presentational factories.

Examples:

- Project rows
- Item rows
- Panel shells
- Action buttons
- State placeholders

Components remain stateless and reusable.

## Development Principles

- Strict separation of concerns
- Feature-oriented structure
- TypeScript strict mode
- Local-first storage
- No framework dependencies
- Minimal global state ownership
- Explicit data flow

## Build

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Watch mode:

```bash
npm run watch
```

## Loading Extension

1. Open Chrome.
2. Navigate to `chrome://extensions`.
3. Enable Developer Mode.
4. Click "Load unpacked".
5. Select the project root directory.

## Technology

- TypeScript
- Chrome Extension Manifest V3
- IndexedDB
- Esbuild

## Project Goal

Provide a lightweight local workspace inside ChatGPT for organizing captured information, notes, prompts, and future AI-assisted workflows.
