// src/ui/features/search/SearchPanel.tsx
// ------------------------------------------------------------
// SEARCH PANEL (REACT)
// ------------------------------------------------------------
//
// Responsibility:
// - the React-owned search panel: pinned query input + results
//   region (loading / error / placeholder / empty / results)
// - owns the snapshot load (on mount) and the debounced query —
//   the successor of searchState + searchController
//
// IMPORTANT:
// - the query draft lives in searchDraftState, NOT here: it must
//   survive unmount (panel close), and component state cannot
// - the input is controlled by `query`; the results ladder reads
//   ONLY `debouncedQuery` — vanilla showed results when the
//   debounced render fired, and this preserves that timing
// - the snapshot is a CACHE of storage, not the truth: every
//   mount (= panel open) refreshes it; keystrokes never touch
//   the database
// ------------------------------------------------------------

import type { Project } from "../../../models/project";
import type { Item } from "../../../models/item";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";

import { getSearchQueryDraft, setSearchQueryDraft } from "./searchDraftState";
import { FloatingPanelShell } from "../../shared/FloatingPanelShell";
import { PanelState } from "../../shared/PanelState";
import { listAllItems, listProjects } from "../../../storage";
import { toErrorMessage } from "../../shared/toErrorMessage";
import { filterWorkspace } from "./searchFilter";

type Props = { openProject: (projectId: string) => void };

/*
  Waits below ~100-200ms read as "instant" — an indicator shown
  inside that window is perceived as flicker, not feedback.
*/
const LOADING_INDICATOR_DELAY_MS = 150;

/*
  Below ~150ms barely debounces (most inter-keystroke gaps are
  longer); above ~300ms local search starts to feel laggy.
*/
const SEARCH_DEBOUNCE_MS = 200;

export function SearchPanel({ openProject }: Props) {
  const [query, setQuery] = useState(() => getSearchQueryDraft() ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(
    () => getSearchQueryDraft() ?? "",
  );
  const [snapshot, setSnapshot] = useState<{
    projects: Project[];
    items: Item[];
  } | null>(null);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Countdown, racing the load below.
    const indicatorTimer = window.setTimeout(() => {
      setShowLoadingIndicator(true);
    }, LOADING_INDICATOR_DELAY_MS);

    // The load starts NOW — not when the countdown fires.
    void (async () => {
      try {
        const [projects, items] = await Promise.all([
          listProjects(),
          listAllItems(),
        ]);
        if (cancelled) return;
        setSnapshot({ projects, items });
        setError(null);
      } catch (caught) {
        if (cancelled) return;
        setError(toErrorMessage(caught, "Couldn't load search data."));
      } finally {
        // Fast loads land here BEFORE 150ms: killing the countdown
        // is what makes the quiet window quiet.
        window.clearTimeout(indicatorTimer);
        if (!cancelled) setShowLoadingIndicator(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(indicatorTimer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedQuery(query),
      SEARCH_DEBOUNCE_MS,
    );

    return () => window.clearTimeout(timer);
  }, [query]);

  let results: ReactNode = null; // null = the quiet window renders nothing
  if (error !== null) {
    results = <PanelState variant="error" message={error} />;
  } else if (snapshot === null) {
    if (showLoadingIndicator) {
      results = <PanelState variant="loading" message="Loading..." />;
    }
  } else if (debouncedQuery.trim() === "") {
    results = <PanelState variant="placeholder" message="Type to search" />;
  } else {
    const { projects, items } = filterWorkspace(
      debouncedQuery,
      snapshot.projects,
      snapshot.items,
    );

    if (projects.length === 0 && items.length === 0) {
      results = <PanelState variant="empty" message="No results" />;
    } else {
      results = (
        <>
          {projects.length > 0 && (
            <>
              <h3 className="aiw-search-section-heading">Projects</h3>
              {projects.map((project) => (
                <button
                  className="aiw-search-result-row"
                  type="button"
                  key={project.id}
                  onClick={() => openProject(project.id)}
                >
                  <span className="aiw-search-result-text">{project.name}</span>
                </button>
              ))}
            </>
          )}

          {items.length > 0 && (
            <>
              <h3 className="aiw-search-section-heading">Items</h3>

              {items.map((item) => (
                <button
                  type="button"
                  className="aiw-search-result-row"
                  key={item.id}
                  onClick={() => openProject(item.projectId)}
                >
                  <span
                    className={
                      item.title.length > 0
                        ? "aiw-search-result-text"
                        : "aiw-search-result-text aiw-search-result-text--untitled"
                    }
                  >
                    {item.title || "Untitled"}
                  </span>
                </button>
              ))}
            </>
          )}
        </>
      );
    }
  }

  return (
    <FloatingPanelShell
      title="Search"
      pinned={
        <div className="aiw-search-bar">
          <input
            type="text"
            className="aiw-search-input"
            placeholder="Search projects and items"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchQueryDraft(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query !== "") {
                setQuery("");
                setSearchQueryDraft("");
              }
            }}
          />
        </div>
      }
    >
      <div className="aiw-search-results">{results}</div>
    </FloatingPanelShell>
  );
}
