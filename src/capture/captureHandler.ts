// src/capture/captureHandler.ts
// ------------------------------------------------------------
// CAPTURE HANDLER
// ------------------------------------------------------------
//
// Responsibility:
// - handle incoming CAPTURE_SELECTION messages from service worker
// - determine target project (selected project or auto-created Inbox)
// - create captured selection as an item in storage
// - confirm capture via toast
// - sync projects runtime state after capture
//
// IMPORTANT:
// - NO DOM access
// - NO rendering logic
// - NO UI state mutation
//
// Data flow:
// handleCaptureSelection(selectionText, sourceUrl)
//   → resolve target project
//   → createItem
//   → showToast
//   → loadProjects → dispatch aiw:projects-updated
// ------------------------------------------------------------

import type { Project } from "../models/project";
import { createItem, createProject, listProjects } from "../storage";
import { getSelectedProjectId } from "../ui/core/sessionState";
import { loadProjects } from "../ui/features/projects/loadProjects";
import { getProjects } from "../ui/features/projects/projectsState";
import { showToast } from "../ui/shared/showToast";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const INBOX_PROJECT_NAME = "Inbox";
const TITLE_MAX_LENGTH = 60;

// ------------------------------------------------------------
// INBOX RESOLUTION
// ------------------------------------------------------------

async function findOrCreateInbox(): Promise<Project> {
  const projects = await listProjects();
  const existing = projects.find((p) => p.name === INBOX_PROJECT_NAME);
  if (existing !== undefined) return existing;
  return createProject(INBOX_PROJECT_NAME);
}

// ------------------------------------------------------------
// TITLE BUILDER
// ------------------------------------------------------------

function buildTitle(selectionText: string): string {
  const trimmed = selectionText.trim();
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return trimmed.slice(0, TITLE_MAX_LENGTH) + "...";
}

// ------------------------------------------------------------
// CAPTURE WORKFLOW
// ------------------------------------------------------------

async function capture(
  selectionText: string,
  sourceUrl: string,
): Promise<void> {
  // Guard: empty selection should never reach here, but be defensive.
  if (!selectionText.trim()) return;

  // Resolve target project.
  // Priority: selected project in runtime state → Inbox (auto-created if needed).
  // If selected project ID exists but is absent from runtime state (stale), fall through to Inbox.
  let targetProject: Project | undefined;

  const selectedProjectId = getSelectedProjectId();
  if (selectedProjectId !== null) {
    targetProject = getProjects().find((p) => p.id === selectedProjectId);
  }

  if (targetProject === undefined) {
    targetProject = await findOrCreateInbox();
  }

  const title = buildTitle(selectionText);

  await createItem(targetProject.id, "note", title, selectionText, {
    createdFrom: "selection",
    sourceUrl,
  });

  // Confirm to user immediately after save.
  showToast(`Saved to ${targetProject.name}`);

  // Sync projects runtime state so newly created Inbox (or any other change)
  // is visible in the projects panel without a page refresh.
  // Dispatch custom event after sync so floatingController can re-render.
  await loadProjects();
  document.dispatchEvent(new CustomEvent("aiw:projects-updated"));
}

// ------------------------------------------------------------
// PUBLIC API
// ------------------------------------------------------------

/*
  Exported as a void function intentionally.
  The message listener cannot await async work — this is fire-and-forget.
  Errors are caught internally so they never become silent unhandled rejections.
*/
export function handleCaptureSelection(
  selectionText: string,
  sourceUrl: string,
): void {
  capture(selectionText, sourceUrl).catch((error) => {
    console.error("[AIW] Capture failed:", error);
  });
}
