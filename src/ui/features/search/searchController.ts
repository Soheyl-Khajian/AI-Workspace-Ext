// src/ui/features/search/searchController.ts
// ------------------------------------------------------------
// SEARCH CONTROLLER (FEATURE ORCHESTRATOR)
// ------------------------------------------------------------
//
// Responsibility:
//
// - orchestrate the search snapshot loading workflow
//   (panel open → load all projects + all items into searchState)
// - trigger UI refresh cycles after state changes
//
// IMPORTANT ARCHITECTURE RULES:
//
// - NO DOM access
// - NO rendering logic
// - NO IndexedDB implementation logic
// - NO repository implementation details
//
// Data flow:
//
// panel open
//        ↓
// searchController.load()
//        ↓
// storage (listProjects + listAllItems, in parallel)
//        ↓
// searchState snapshot
//        ↓
// renderer re-reads state; keystrokes filter the snapshot
// in memory and never reach this controller
// ------------------------------------------------------------

import {
  setSearchError,
  setSearchLoading,
  setSearchLoadingIndicatorVisible,
  setSearchSnapshot,
} from "./searchState";
import { listAllItems, listProjects } from "../../../storage";
import { toErrorMessage } from "../../shared/toErrorMessage";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

/*
  Waits below ~100-200ms read as "instant" — an indicator shown
  inside that window is perceived as flicker, not feedback.
*/
const LOADING_INDICATOR_DELAY_MS = 150;

// ------------------------------------------------------------
// DEPENDENCIES
// ------------------------------------------------------------

type SearchControllerDependencies = {
  onStateChange: () => void;
};

// ------------------------------------------------------------
// PUBLIC CONTROLLER API
// ------------------------------------------------------------

export type SearchController = {
  load: () => Promise<void>;
};

// ------------------------------------------------------------
// CONTROLLER FACTORY
// ------------------------------------------------------------

export function createSearchController(
  dependencies: SearchControllerDependencies,
): SearchController {
  const { onStateChange } = dependencies;

  // ----------------------------------------------------------
  // LOAD SNAPSHOT WORKFLOW
  // ----------------------------------------------------------

  async function load(): Promise<void> {
    setSearchLoading(true);

    onStateChange();

    /*
      Delayed indicator: reveal "Loading..." only if the load is
      still running after the delay. Fast IndexedDB reads finish
      first and cancel the timer, so no loading frame ever renders.
    */
    const indicatorTimer = window.setTimeout(() => {
      setSearchLoadingIndicatorVisible(true);
      onStateChange();
    }, LOADING_INDICATOR_DELAY_MS);

    try {
      /*
        The two reads are independent, so run them in parallel.
        Promise.all is fail-fast: if EITHER read rejects, the
        combined promise rejects immediately with that error and
        we land in catch — a partial snapshot is impossible. The
        other read keeps running but its result is discarded
        (promises are not cancellable).
      */
      const [projects, items] = await Promise.all([
        listProjects(),
        listAllItems(),
      ]);

      setSearchSnapshot(projects, items);
      setSearchError(null);
    } catch (error) {
      setSearchError(toErrorMessage(error, "Couldn't load search data."));
    } finally {
      /*
        Cancel + hide unconditionally so the indicator can never
        outlive its load; finally guarantees the cleanup and the
        final render on both success and failure paths.
      */
      window.clearTimeout(indicatorTimer);
      setSearchLoadingIndicatorVisible(false);
      setSearchLoading(false);

      onStateChange();
    }
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  return {
    load,
  };
}
