// src/ui/features/items/ItemsPanel.tsx
// ------------------------------------------------------------
// ITEMS PANEL (REACT)
// ------------------------------------------------------------
//
// Responsibility:
//
// - render the items floating panel as a master-detail split:
//   list column (rows + create form) beside the keyed detail
//   column
// - own the panel's event wiring (React onClick/onChange replace
//   the retired itemsHandlers delegation table)
// - navigate back to the projects panel (back button, breadcrumb)
//
// STATE SPLIT (a contract, not a convenience):
//
// - module state (items, loading/error, selection, menu, scroll,
//   session ids) is READ DIRECTLY on every render and never
//   mirrored: anything a controller or another module can write
//   would go stale in a mirror (moveItem drops selectedItemId,
//   reloadAfterImport resets everything)
// - ONLY the four text inputs hold local React state: hydrated
//   from the drafts, written through on every keystroke, and
//   re-synced from the modules after every await
//
// IMPORTANT:
//
// - projects/projectName arrive as PROPS computed by renderUi:
//   this feature must never import sibling projectsState
// - the scope decision (placeholder vs split, breadcrumb label)
//   keys off selectedProjectId — the same fact the items query
//   uses — NEVER off the derived projectName label
// - all business logic stays in itemsController; this component
//   only validates, dispatches, and re-syncs
// ------------------------------------------------------------

import type { MouseEvent, ReactNode } from "react";
import type { Item, ItemType } from "../../../models/item";
import type { Project } from "../../../models/project";
import type { ItemMenuPage } from "./itemsMenuState";
import type { ItemsController } from "./itemsController";

import { useEffect, useRef, useState } from "react";
import { FloatingPanelShell } from "../../shared/FloatingPanelShell";
import { PanelState } from "../../shared/PanelState";
import { openPanel } from "../../core/floatingUiState";
import {
  getSelectedItemId,
  getSelectedProjectId,
  setSelectedItemId,
} from "../../core/sessionState";
import {
  getItems,
  getItemsError,
  getItemsListScrollTop,
  isItemsLoading,
  isItemsLoadingIndicatorVisible,
  setItemsListScrollTop,
} from "./itemsState";
import {
  getCreateItemContentDraft,
  getCreateItemTitleDraft,
  getItemDetailContentDraft,
  getItemDetailTitleDraft,
  setCreateItemContentDraft,
  setCreateItemTitleDraft,
  setItemDetailContentDraft,
  setItemDetailTitleDraft,
} from "./itemsDraftState";
import {
  closeItemMenu,
  getOpenItemMenu,
  openItemMenu,
  showItemMenuMovePicker,
} from "./itemsMenuState";
import { getSelectedItemsCount, isItemSelected } from "./itemSelectionState";

// ------------------------------------------------------------
// TYPE GLYPHS
//
// One glyph per item type. Record<ItemType, string> keeps this
// map TOTAL: adding a fifth item type refuses to compile until
// the new type gets a glyph.
// ------------------------------------------------------------

const ITEM_TYPE_GLYPHS: Record<ItemType, string> = {
  note: "✎",
  snippet: "❝",
  task: "✓",
  link: "↗",
};

// ------------------------------------------------------------
// PROPS
// ------------------------------------------------------------

type ItemsPanelProps = {
  itemsController: ItemsController;
  // Move-picker targets; a prop so this feature never imports
  // sibling projectsState (sibling decoupling rule).
  projects: Project[];
  // Label for the scoped breadcrumb; only meaningful while a
  // project is selected (see the scope note in the header).
  projectName: string | null;
  notify: (message: string) => void;
  resolveProjectName: (projectId: string) => string;
  hasActiveInlineEdit: () => boolean;
  requestRender: () => void;
};

type ItemRowProps = {
  item: Item;
  selected: boolean;
  checkboxChecked: boolean;
  // null = this row's menu is closed; otherwise the open page
  menuPage: ItemMenuPage | null;
  moveTargets: Project[];
  itemsController: ItemsController;
  resolveProjectName: (projectId: string) => string;
  hasActiveInlineEdit: () => boolean;
  requestRender: () => void;
};

type ItemDetailRegionProps = {
  item: Item;
  itemsController: ItemsController;
  notify: (message: string) => void;
};

// ------------------------------------------------------------
// PANEL
// ------------------------------------------------------------

export function ItemsPanel({
  itemsController,
  projects,
  projectName,
  notify,
  resolveProjectName,
  hasActiveInlineEdit,
  requestRender,
}: ItemsPanelProps) {
  // ----------------------------------------------------------
  // MODULE-STATE SNAPSHOT (read every render, never mirrored)
  // ----------------------------------------------------------

  const selectedProjectId = getSelectedProjectId();
  const selectedItemId = getSelectedItemId();
  const items = getItems();
  const loading = isItemsLoading();
  const loadingIndicatorVisible = isItemsLoadingIndicatorVisible();
  const error = getItemsError();
  const openMenu = getOpenItemMenu();

  // ----------------------------------------------------------
  // CREATE-FORM DRAFT MIRRORS (local echo, write-through)
  // ----------------------------------------------------------

  const [createTitle, setCreateTitle] = useState(
    () => getCreateItemTitleDraft() ?? "",
  );
  const [createContent, setCreateContent] = useState(
    () => getCreateItemContentDraft() ?? "",
  );

  // ----------------------------------------------------------
  // SCROLL DOCTRINE
  //
  // No deps array — DELIBERATE: runs after every commit,
  // mirroring vanilla's restore-after-every-render. onScroll
  // writes module state without re-rendering, so the restore can
  // never fight the user's hand. The ref is null while the
  // unscoped placeholder is showing; the guard covers it.
  // ----------------------------------------------------------

  const listScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listScrollRef.current;
    if (el !== null) el.scrollTop = getItemsListScrollTop();
  });

  // ----------------------------------------------------------
  // HEADER NAVIGATION
  // ----------------------------------------------------------

  function handleBackClick(): void {
    closeItemMenu();
    openPanel("projects");
    // Back leaves the item context entirely; the breadcrumb hop
    // below deliberately keeps the selection.
    setSelectedItemId(null);
    requestRender();
  }

  function handleBreadcrumbClick(): void {
    closeItemMenu();
    openPanel("projects");
    requestRender();
  }

  function handlePanelClick(): void {
    // Panel-wide menu dismissal: any click no child stopped
    // closes the open row menu (the shell forwards, nothing more).
    if (getOpenItemMenu() === null) return;
    closeItemMenu();
    requestRender();
  }

  async function handleBuildContext(): Promise<void> {
    if (selectedProjectId === null) return;
    await itemsController.copyContextPack(
      resolveProjectName(selectedProjectId),
    );
  }

  // ----------------------------------------------------------
  // CREATE FORM
  // ----------------------------------------------------------

  function handleCreateTitleChange(value: string): void {
    setCreateTitle(value);
    setCreateItemTitleDraft(value);
  }

  function handleCreateContentChange(value: string): void {
    setCreateContent(value);
    setCreateItemContentDraft(value);
  }

  async function handleCreateSubmit(): Promise<void> {
    if (selectedProjectId === null) return;

    const trimmedTitle = createTitle.trim();
    if (trimmedTitle.length === 0 && createContent.trim().length === 0) {
      notify("Add a title or some content");
      return;
    }

    await itemsController.create(
      selectedProjectId,
      trimmedTitle,
      createContent,
    );

    // Re-sync from the module: create clears the drafts on
    // success ONLY, so a failed create leaves the user's text
    // exactly where it was.
    setCreateTitle(getCreateItemTitleDraft() ?? "");
    setCreateContent(getCreateItemContentDraft() ?? "");
  }

  // ----------------------------------------------------------
  // BODY
  // ----------------------------------------------------------

  let body: ReactNode;

  if (selectedProjectId === null) {
    // No selected project: no valid items query scope, no
    // meaningful split — a plain single-region placeholder.
    body = (
      <PanelState
        variant="placeholder"
        message="Select a project to view items"
      />
    );
  } else {
    // Move targets for the picker page: every project except the
    // one the listed items already live in.
    const moveTargets = projects.filter(
      (project) => project.id !== selectedProjectId,
    );

    // A missing match (nothing selected, or the selection was
    // deleted/moved away) renders the detail column's empty state.
    const detailItem = items.find(
      (candidate) => candidate.id === selectedItemId,
    );

    // List ladder. Quiet window first: loading, but the indicator
    // delay hasn't elapsed — render an intentionally empty region
    // so fast loads replace content with content, no flicker.
    let listRegion: ReactNode;
    if (loading) {
      listRegion = loadingIndicatorVisible ? (
        <PanelState variant="loading" message="Loading items..." />
      ) : null;
    } else if (error !== null) {
      listRegion = <PanelState variant="error" message={error} />;
    } else if (items.length === 0) {
      listRegion = <PanelState variant="empty" message="No items yet" />;
    } else {
      listRegion = (
        <div className="aiw-items-list">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              selected={item.id === selectedItemId}
              checkboxChecked={isItemSelected(item.id)}
              menuPage={
                openMenu !== null && openMenu.itemId === item.id
                  ? openMenu.page
                  : null
              }
              moveTargets={moveTargets}
              itemsController={itemsController}
              resolveProjectName={resolveProjectName}
              hasActiveInlineEdit={hasActiveInlineEdit}
              requestRender={requestRender}
            />
          ))}
        </div>
      );
    }

    body = (
      <div className="aiw-items-layout">
        <div className="aiw-items-list-col">
          <div
            className="aiw-items-list-scroll"
            ref={listScrollRef}
            onScroll={(event) => {
              setItemsListScrollTop(event.currentTarget.scrollTop);
            }}
          >
            {listRegion}
          </div>

          {/* Create form: pinned below the scroll region as the
              list column's footer (NOT the shell footer — the
              split body owns its own columns). */}
          <div className="aiw-create-item-form">
            <input
              className="aiw-create-item-title"
              type="text"
              placeholder="Title"
              value={createTitle}
              onChange={(event) => handleCreateTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                void handleCreateSubmit();
              }}
            />
            <textarea
              className="aiw-create-item-content"
              placeholder="Content"
              value={createContent}
              onChange={(event) =>
                handleCreateContentChange(event.target.value)
              }
            />
            <button
              type="button"
              className="aiw-create-item-submit"
              onClick={handleCreateSubmit}
            >
              Add
            </button>
          </div>
        </div>

        {/* key: switching items REBUILDS the detail component, so
            its draft-hydrating initializers re-run for the new
            item and unsaved local typing can never leak across. */}
        <div className="aiw-item-detail-col">
          {detailItem !== undefined ? (
            <ItemDetailRegion
              key={detailItem.id}
              item={detailItem}
              itemsController={itemsController}
              notify={notify}
            />
          ) : (
            <PanelState variant="placeholder" message="Select an item" />
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // SHELL
  //
  // Scope drives everything here: selectedProjectId is the fact,
  // projectName is only its label. Deriving muted from the label
  // would let a stale projectName unmute an unscoped panel.
  // ----------------------------------------------------------

  return (
    <FloatingPanelShell
      title="Items"
      context={
        selectedProjectId !== null
          ? { label: projectName ?? "Untitled project", muted: false }
          : { label: "Select a project", muted: true }
      }
      onBackClick={handleBackClick}
      onContextClick={handleBreadcrumbClick}
      headerActions={
        selectedProjectId !== null ? (
          <div className="aiw-build-context-bar">
            <button
              type="button"
              className="aiw-build-context"
              onClick={handleBuildContext}
            >
              Build context ({getSelectedItemsCount()})
            </button>
          </div>
        ) : undefined
      }
      bodyClassName={
        selectedProjectId !== null
          ? "aiw-floating-panel__body--split"
          : undefined
      }
      onClick={handlePanelClick}
    >
      {body}
    </FloatingPanelShell>
  );
}

// ------------------------------------------------------------
// ITEM ROW
// ------------------------------------------------------------

function ItemRow({
  item,
  selected,
  checkboxChecked,
  menuPage,
  moveTargets,
  itemsController,
  resolveProjectName,
  hasActiveInlineEdit,
  requestRender,
}: ItemRowProps) {
  // Whitespace-only titles are untitled (vanilla createItemRow
  // trimmed; a truthiness check would let "   " pass as a title).
  const hasTitle = item.title.trim().length > 0;

  function handleMenuTriggerClick(event: MouseEvent): void {
    event.stopPropagation();
    // Same guard the vanilla delegation table had: no menus while
    // an inline edit is open elsewhere.
    if (hasActiveInlineEdit()) return;

    // Same trigger toggles closed; another row's trigger replaces
    // (last write wins, and openItemMenu always lands on root).
    if (getOpenItemMenu()?.itemId === item.id) {
      closeItemMenu();
    } else {
      openItemMenu(item.id);
    }
    requestRender();
  }

  function handleShowMovePicker(): void {
    // In-place morph: same menu surface, picker page.
    showItemMenuMovePicker();
    requestRender();
  }

  async function handleMoveTarget(target: Project): Promise<void> {
    // Close-then-dispatch: the menu leaves the DOM NOW. The
    // controller's own re-render arrives whenever the async move
    // lands, and must not be the thing that closes the menu.
    closeItemMenu();
    requestRender();
    await itemsController.moveItem(
      item.id,
      target.id,
      resolveProjectName(target.id),
    );
  }

  async function handleDelete(): Promise<void> {
    const selectedProjectId = getSelectedProjectId();
    if (selectedProjectId === null) return;

    // Close and repaint BEFORE the blocking confirm so the menu
    // isn't frozen open behind the native dialog.
    closeItemMenu();
    requestRender();

    if (!window.confirm("Delete this item?")) return;
    await itemsController.deleteItem(item.id, selectedProjectId);
  }

  return (
    <div
      className={`aiw-item-row${selected ? " aiw-item-row--selected" : ""}${
        menuPage !== null ? " aiw-item-row--menu-open" : ""
      }`}
      onClick={() => itemsController.selectItem(item.id)}
    >
      {/* stopPropagation contract: toggling batch selection must
          not also select the row. */}
      <input
        type="checkbox"
        className="aiw-item-select"
        checked={checkboxChecked}
        onChange={() => itemsController.toggleSelection(item.id)}
        onClick={(event) => event.stopPropagation()}
      />

      {/* Type indicator: projected from item.type alone; the
          title attribute doubles as a zero-listener tooltip. */}
      <span
        className={`aiw-item-type aiw-item-type--${item.type}`}
        title={item.type}
      >
        {ITEM_TYPE_GLYPHS[item.type]}
      </span>

      <span
        className={
          hasTitle ? "aiw-item-text" : "aiw-item-text aiw-item-text--untitled"
        }
      >
        {hasTitle ? item.title : "Untitled"}
      </span>

      <button
        type="button"
        className="aiw-row-menu-trigger"
        onClick={handleMenuTriggerClick}
      >
        …
      </button>

      {/* Row menu: PROJECTED from itemsMenuState, never toggled in
          the DOM. Menu items carry the shared aiw-row-menu-item
          class (styling) PLUS their behavior-hook class. */}
      {menuPage === "root" && (
        <div
          className="aiw-row-menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="aiw-row-menu-item aiw-item-menu-move"
            onClick={handleShowMovePicker}
          >
            Move to…
          </button>
          <button
            type="button"
            className="aiw-row-menu-item aiw-row-menu-item--danger aiw-item-menu-delete"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}

      {menuPage === "movePicker" && (
        <div
          className="aiw-row-menu aiw-row-menu--picker"
          onClick={(event) => event.stopPropagation()}
        >
          {moveTargets.length === 0 && (
            <div className="aiw-row-menu-empty">No other projects</div>
          )}
          {moveTargets.map((target) => (
            <button
              type="button"
              key={target.id}
              className="aiw-row-menu-item aiw-item-menu-move-target"
              onClick={() => handleMoveTarget(target)}
            >
              {target.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// ITEM DETAIL REGION
// ------------------------------------------------------------

function ItemDetailRegion({
  item,
  itemsController,
  notify,
}: ItemDetailRegionProps) {
  // Keyed-remount contract: the parent renders this component
  // with key={item.id}, so these initializers re-run per item.
  // Draft wins over the stored value; ?? keeps a deliberately
  // cleared ("") draft from resurrecting the old text.
  const [detailTitle, setDetailTitle] = useState(
    () => getItemDetailTitleDraft(item.id) ?? item.title,
  );
  const [detailContent, setDetailContent] = useState(
    () => getItemDetailContentDraft(item.id) ?? item.content,
  );

  function handleTitleChange(value: string): void {
    setDetailTitle(value);
    setItemDetailTitleDraft(item.id, value);
  }

  function handleContentChange(value: string): void {
    setDetailContent(value);
    setItemDetailContentDraft(item.id, value);
  }

  async function handleSave(): Promise<void> {
    const trimmedTitle = detailTitle.trim();
    if (trimmedTitle.length === 0 && detailContent.trim().length === 0) {
      notify("Add a title or some content");
      return;
    }

    await itemsController.updateItem(item.id, trimmedTitle, detailContent);

    // The item PROP is stale here: the controller reloaded items
    // before resolving, but this component re-renders on the NEXT
    // pass. Read the fresh stored values from the module directly.
    const fresh = getItems().find((candidate) => candidate.id === item.id);
    setDetailTitle(getItemDetailTitleDraft(item.id) ?? fresh?.title ?? "");
    setDetailContent(
      getItemDetailContentDraft(item.id) ?? fresh?.content ?? "",
    );
  }

  // ----------------------------------------------------------
  // PROVENANCE
  //
  // Built only from STORED facts, never drafts: an unsaved edit
  // must not change where these anchors go. Truthiness guards
  // (not undefined-checks) because legacy captures hold "" in
  // sourceUrl. The strip renders only when non-empty so plain
  // notes never show an empty padded block — and the FORM is its
  // SIBLING in the detail column, never its child, or the strip's
  // flex-shrink: 0 box strangles the elastic textarea.
  // ----------------------------------------------------------

  const sourceUrl = item.meta.sourceUrl;
  const linkTarget = item.type === "link" ? item.content.trim() : "";
  const hasProvenance = Boolean(sourceUrl) || linkTarget !== "";

  return (
    <>
      {hasProvenance && (
        <div className="aiw-item-detail-source">
          {sourceUrl && (
            <div className="aiw-item-detail-source-line">
              From{" "}
              <a
                className="aiw-item-detail-source-link"
                href={sourceUrl}
                target="_blank"
                // noopener: sever window.opener so the opened page
                // can never navigate this tab (reverse tabnabbing).
                rel="noopener noreferrer"
              >
                {/* || not ??: an empty-string title must fall back
                    to the URL. */}
                {item.meta.sourceTitle || sourceUrl}
              </a>
            </div>
          )}
          {linkTarget !== "" && (
            <div className="aiw-item-detail-source-line">
              <a
                className="aiw-item-detail-source-link"
                href={linkTarget}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open link
              </a>
            </div>
          )}
        </div>
      )}

      {/* Fills the column: the title keeps its content height, the
          content textarea absorbs the free space, and the save
          button pins to the bottom (panels/items.css). */}
      <div className="aiw-item-detail-form">
        <input
          type="text"
          className="aiw-item-detail-title"
          value={detailTitle}
          onChange={(event) => handleTitleChange(event.target.value)}
        />
        <textarea
          className="aiw-item-detail-content"
          value={detailContent}
          onChange={(event) => handleContentChange(event.target.value)}
        />
        <button
          type="button"
          className="aiw-item-detail-save"
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </>
  );
}
