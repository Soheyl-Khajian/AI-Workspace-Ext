// src/capture/captureHandler.ts
// ------------------------------------------------------------
// CAPTURE HANDLER
// ------------------------------------------------------------
//
// Responsibility:
// - handle incoming CAPTURE_SELECTION / CAPTURE_LINK messages
//   from the service worker
// - determine target project (selected project or auto-created Inbox)
// - mint the captured selection as a snippet item, or the captured
//   link as a link item, in storage
// - confirm capture via toast
// - sync projects runtime state after capture
//
// IMPORTANT:
// - NO DOM access
// - NO rendering logic
// - NO UI state mutation
// - NO messaging vocabulary: this layer speaks CaptureKind, not
//   message type literals. bootstrap translates messages into
//   handler calls, and each public handler owns its own kind.
//
// Data flow:
// handleCaptureSelection(selectionText, sourceUrl, sourceTitle?)
// handleCaptureLink(linkUrl, sourceUrl, sourceTitle?)
//   → resolve target project
//   → createItem (snippet | link)
//   → showToast
//   → loadProjects → dispatch aiw:projects-updated
// ------------------------------------------------------------

import type { Project } from "../models/project";
import { createItem, getOrCreateProjectByName } from "../storage";
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
// CAPTURE KIND
//
// Internal vocabulary for the two capture workflows. Deliberately
// NOT the message type literals: which item type to mint is this
// module's decision, not the transport's.
// ------------------------------------------------------------

type CaptureKind = "selection" | "link";

// ------------------------------------------------------------
// INBOX RESOLUTION
// ------------------------------------------------------------

async function findOrCreateInbox(): Promise<Project> {
  return getOrCreateProjectByName(INBOX_PROJECT_NAME);
}

// ------------------------------------------------------------
// TITLE BUILDER
// ------------------------------------------------------------

function buildTitle(capturedText: string): string {
  const trimmed = capturedText.trim();
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return trimmed.slice(0, TITLE_MAX_LENGTH) + "...";
}

// ------------------------------------------------------------
// CAPTURE WORKFLOW
//
// One shared workflow, two minting branches. capturedText is the
// item payload: the selected text for snippets, the link URL for
// links.
// ------------------------------------------------------------

async function capture(
  kind: CaptureKind,
  capturedText: string,
  sourceUrl: string,
  sourceTitle?: string,
): Promise<void> {
  // Guard: an empty payload should never reach here, but be defensive.
  if (!capturedText.trim()) return;

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

  const title = buildTitle(capturedText);

  if (kind === "link") {
    await createItem(targetProject.id, "link", title, capturedText, {
      createdFrom: "link",
      sourceUrl,
      sourceTitle,
    });
  } else {
    await createItem(targetProject.id, "snippet", title, capturedText, {
      createdFrom: "selection",
      sourceUrl,
      sourceTitle,
    });
  }

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
//
// Each handler OWNS its capture kind -- callers cannot inject the
// wrong one. Both are void functions intentionally: the message
// listener cannot await async work, so this is fire-and-forget.
// Errors are caught internally so they never become silent
// unhandled rejections.
// ------------------------------------------------------------

export function handleCaptureSelection(
  selectionText: string,
  sourceUrl: string,
  sourceTitle?: string,
): void {
  capture("selection", selectionText, sourceUrl, sourceTitle).catch((error) => {
    console.error("[AIW] Capture selection failed:", error);
    showToast("Couldn't save to workspace");
  });
}

export function handleCaptureLink(
  linkUrl: string,
  sourceUrl: string,
  sourceTitle?: string,
): void {
  capture("link", linkUrl, sourceUrl, sourceTitle).catch((error) => {
    console.error("[AIW] Capture link failed:", error);
    showToast("Couldn't save to workspace");
  });
}
