// src/ui/features/projects/ProjectsPanel.tsx
// ------------------------------------------------------------
// PROJECTS PANEL (REACT)
// ------------------------------------------------------------
//
// Responsibility:
// - the React-owned projects panel: state ladder, project rows
//   (select / deselect / row menu / inline rename), create form —
//   the successor of renderProjectsPanel + createProjectRow +
//   projectsHandlers
//
// IMPORTANT:
// - projects DATA is shared feature state (items context, capture
//   sync, resolveProjectName), so this panel renders FROM
//   projectsState and never loads storage itself — unlike search,
//   whose snapshot nobody else read
// - menu and rename MODE state stay in projectsMenuState /
//   projectsRenameState: the composition-root glue
//   (hasOpenRowMenu, hasActiveInlineEdit, import resets) reads
//   them, and useState would be invisible to it. Mutations here
//   call requestRender (= renderUi) to become visible — the same
//   contract the vanilla handlers had
// - TEXT drafts are local state with write-through to the draft
//   modules (the SearchPanel pattern): keystrokes re-render only
//   this component; the modules stay current for import resets
//   and cross-mount survival
// - interactive children stopPropagation: in React, composition
//   replaces the delegation-era exclusion lists — each control
//   owns its click, so any click that reaches the panel element
//   is a "somewhere else" click (in-panel menu dismissal, with
//   no click-eating veil)
// ------------------------------------------------------------
import type { ReactNode } from "react";
import type { Project } from "../../../models/project";
import type { ProjectsController } from "./projectsController";
import { useEffect, useRef, useState } from "react";
import { FloatingPanelShell } from "../../shared/FloatingPanelShell";
import { PanelState } from "../../shared/PanelState";
import { getSelectedProjectId } from "../../core/sessionState";
import {
  getProjects,
  getProjectsError,
  isProjectsLoading,
} from "./projectsState";
import {
  getCreateProjectNameDraft,
  setCreateProjectNameDraft,
} from "./projectsDraftState";
import {
  getEditingProjectId,
  getRenameDraft,
  setRenameDraft,
  startRenameEditing,
  stopRenameEditing,
} from "./projectsRenameState";
import {
  closeProjectMenu,
  getOpenProjectMenuId,
  openProjectMenu,
} from "./projectsMenuState";

type ProjectsPanelProps = {
  projectsController: ProjectsController;
  notify: (message: string) => void;
  requestRender: () => void;
};

// ------------------------------------------------------------
// INLINE RENAME INPUT
//
// Mounted only while its row is in edit mode, so "mount" and
// "edit start" are the same moment: focus + select-all happen in
// the mount effect. React reconciles (never wipe-rebuilds) this
// input across background re-renders, so the vanilla KNOWN LIMIT
// — focusout fired by a re-render destroying the input mid-edit —
// has no React equivalent and its workaround dies here.
// ------------------------------------------------------------

type ProjectRenameInputProps = {
  project: Project;
  projectsController: ProjectsController;
  requestRender: () => void;
};

function ProjectRenameInput({
  project,
  projectsController,
  requestRender,
}: ProjectRenameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => getRenameDraft() ?? project.name);
  // Select-all only when this edit has no draft yet — i.e. the
  // edit is genuinely starting, not re-mounting over typed text
  // after a panel switch (draft ?? doctrine, same as vanilla).
  const selectAllOnMount = useRef(getRenameDraft() === null);

  useEffect(() => {
    const inputEl = inputRef.current;
    if (inputEl === null) return;
    // Effects run after commit, so the input is attached — the
    // React answer to "focus() on a detached element is a
    // silent no-op".
    inputEl.focus();
    if (selectAllOnMount.current) {
      inputEl.select();
    }
  }, []);

  /*
  Shared by Enter and blur. The editing-state guard survives from
  vanilla for one remaining reason: after a successful commit
  unmounts this input, the browser may still fire a blur for it —
  editing is already null then, and this does nothing.
*/
  async function commitOrCancel(): Promise<void> {
    if (getEditingProjectId() === null) return;

    // Resolve the current name from state at commit time (no
    // closure over render-time data, no staleness).
    const currentName =
      getProjects().find((candidate) => candidate.id === project.id)?.name ??
      "";

    const trimmedValue = text.trim();

    if (trimmedValue.length > 0 && trimmedValue !== currentName) {
      // Controller stops editing on success; keeps it on failure.
      await projectsController.renameProject(project.id, trimmedValue);
      return;
    }

    // Empty or unchanged → cancel, no storage write.
    stopRenameEditing();
    requestRender();
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className="aiw-project-rename-input"
      value={text}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        setText(event.target.value);
        setRenameDraft(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          void commitOrCancel();
        }
        if (event.key === "Escape") {
          stopRenameEditing();
          requestRender();
        }
      }}
      onBlur={() => void commitOrCancel()}
    />
  );
}

// ------------------------------------------------------------
// PROJECT ROW
// ------------------------------------------------------------

type ProjectRowProps = {
  project: Project;
  selected: boolean;
  editing: boolean;
  menuOpen: boolean;
  projectsController: ProjectsController;
  requestRender: () => void;
};

function ProjectRow({
  project,
  selected,
  editing,
  menuOpen,
  projectsController,
  requestRender,
}: ProjectRowProps) {
  function handleMenuToggle(event: React.MouseEvent): void {
    event.stopPropagation();

    // No menus while an inline edit is active (locked v0.5 rule).
    // Same-feature knowledge, so rename state is read directly —
    // unlike core, which gets hasActiveInlineEdit injected.
    if (getEditingProjectId() !== null) return;

    // Same trigger toggles closed; another row's trigger replaces
    // (last write wins in the state module).
    if (getOpenProjectMenuId() === project.id) {
      closeProjectMenu();
    } else {
      openProjectMenu(project.id);
    }
    requestRender();
  }

  function handleRenameStart(event: React.MouseEvent): void {
    event.stopPropagation();
    // Rename lives in the menu: close it, then enter the inline edit.
    closeProjectMenu();
    startRenameEditing(project.id);
    requestRender();
  }

  async function handleDelete(event: React.MouseEvent): Promise<void> {
    event.stopPropagation();
    // Close the menu (and re-render) BEFORE the blocking confirm:
    // a cancelled confirm must not leave the menu open.
    closeProjectMenu();
    requestRender();

    if (!window.confirm("Delete this project and all its items?")) return;

    await projectsController.deleteProject(project.id);
  }

  const rowClassName = [
    "aiw-project-row",
    selected ? "aiw-project-row--selected" : "",
    // Positioning anchor + overflow release for the floating menu
    // (see panels/menus.css)
    menuOpen ? "aiw-project-row--menu-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rowClassName}
      onClick={() => projectsController.selectProject(project.id)}
    >
      {editing ? (
        <ProjectRenameInput
          project={project}
          projectsController={projectsController}
          requestRender={requestRender}
        />
      ) : (
        <span className="aiw-project-text">{project.name}</span>
      )}
      {selected && (
        <button
          type="button"
          className="aiw-project-deselect"
          onClick={(event) => {
            event.stopPropagation();
            projectsController.deselectProject();
          }}
        >
          ⏏
        </button>
      )}
      <button
        type="button"
        className="aiw-row-menu-trigger"
        onClick={handleMenuToggle}
      >
        …
      </button>
      {menuOpen && (
        // stopPropagation on the surface: clicks on menu padding
        // must not select the row or count as "somewhere else".
        <div
          className="aiw-row-menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="aiw-row-menu-item aiw-project-menu-rename"
            onClick={handleRenameStart}
          >
            Rename
          </button>
          <button
            type="button"
            className="aiw-row-menu-item aiw-row-menu-item--danger aiw-project-menu-delete"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// PANEL
// ------------------------------------------------------------

export function ProjectsPanel({
  projectsController,
  notify,
  requestRender,
}: ProjectsPanelProps) {
  const [createName, setCreateName] = useState(
    () => getCreateProjectNameDraft() ?? "",
  );

  const loading = isProjectsLoading();
  const error = getProjectsError();
  const projects = getProjects();
  const selectedProjectId = getSelectedProjectId();
  const editingProjectId = getEditingProjectId();
  const openMenuProjectId = getOpenProjectMenuId();

  async function submitCreate(): Promise<void> {
    const trimmedNewProjectName = createName.trim();
    if (trimmedNewProjectName.length === 0) {
      notify("Project name can't be empty");
      return;
    }

    await projectsController.create(trimmedNewProjectName);

    // The controller owns the draft at workflow boundaries:
    // success cleared the module (null → ""), failure left it
    // untouched. Local state is only the keystroke cache — re-sync
    // it so the input clears exactly when vanilla's rebuild did.
    setCreateName(getCreateProjectNameDraft() ?? "");
  }

  /*
  In-panel dismissal (no click-eating veil): every interactive
  child stops propagation, so any click that reaches the panel
  element is a "somewhere else" click — close the menu and let
  the click's own job proceed (being inner, it already ran).
  Clicks outside the floating UI stay layered in core's
  outside-click handler.
*/
  function handlePanelClick(): void {
    if (getOpenProjectMenuId() === null) return;
    closeProjectMenu();
    requestRender();
  }

  let body: ReactNode;
  if (loading) {
    body = <PanelState variant="loading" message="Loading..." />;
  } else if (error !== null) {
    body = <PanelState variant="error" message={error} />;
  } else if (projects.length === 0) {
    body = <PanelState variant="empty" message="No projects yet" />;
  } else {
    body = (
      <div className="aiw-projects-list">
        {projects.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            selected={project.id === selectedProjectId}
            editing={project.id === editingProjectId}
            menuOpen={project.id === openMenuProjectId}
            projectsController={projectsController}
            requestRender={requestRender}
          />
        ))}
      </div>
    );
  }

  return (
    <FloatingPanelShell
      title="Projects"
      onClick={handlePanelClick}
      footer={
        <div className="aiw-create-project-form">
          <input
            type="text"
            className="aiw-create-project-input"
            placeholder="New project name"
            value={createName}
            onChange={(event) => {
              setCreateName(event.target.value);
              setCreateProjectNameDraft(event.target.value);
            }}
          />
          <button
            type="button"
            className="aiw-create-project-submit"
            onClick={() => void submitCreate()}
          >
            Create
          </button>
        </div>
      }
    >
      {body}
    </FloatingPanelShell>
  );
}
