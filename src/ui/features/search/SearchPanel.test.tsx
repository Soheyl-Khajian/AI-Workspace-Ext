// src/ui/features/search/SearchPanel.test.tsx
/** @vitest-environment jsdom */
// ------------------------------------------------------------
// SEARCH PANEL TESTS
// ------------------------------------------------------------
//
// What is pinned here:
// - the state ladder (placeholder / loading / error / empty /
//   results) as the USER sees it — text and roles, not internals
// - the two timing contracts: the 150ms quiet window and the
//   200ms debounce (draft write immediate, render debounced)
// - the null-vs-"" draft doctrine: Escape leaves "", not null
//
// Timer discipline:
// - this component interleaves timers AND promises, so every
//   advance goes through advanceTimersByTimeAsync inside act —
//   the sync advance runs timer callbacks but never drains the
//   microtask queue, so a passing sync test would depend on the
//   accidental absence of a pending promise, not on the contract
//
// Mock discipline:
// - mockReturnValue / mockRejectedValue PERSIST across tests;
//   beforeEach resets and re-primes both storage mocks so no
//   test inherits another's storage behavior
// ------------------------------------------------------------
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { Project } from "../../../models/project";
import type { Item } from "../../../models/item";
import { listAllItems, listProjects } from "../../../storage";
import {
  getSearchQueryDraft,
  resetSearchDraftState,
  setSearchQueryDraft,
} from "./searchDraftState";
import { SearchPanel } from "./SearchPanel";

// The factory deliberately provides NO default implementations:
// defaults live in ONE place (beforeEach) so no test can forget
// they exist. vi.mock is hoisted above the imports at runtime.
vi.mock("../../../storage", () => ({
  listProjects: vi.fn(),
  listAllItems: vi.fn(),
}));

const mockListProjects = vi.mocked(listProjects);
const mockListAllItems = vi.mocked(listAllItems);

// ------------------------------------------------------------
// FIXTURES
// ------------------------------------------------------------

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Alpha project",
    createdAt: 1,
    ...overrides,
  };
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "i1",
    projectId: "p1",
    type: "note",
    title: "Alpha note",
    content: "",
    createdAt: 1,
    meta: { createdFrom: "manual" },
    ...overrides,
  };
}

// Deferred-resolver pattern (see AutoBackupList.test.tsx): a
// promise whose settlement the TEST controls, so "load still in
// flight" is a fact we create, not a race we hope to win.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

// Advance fake time AND drain the microtask queue, inside act so
// React flushes the resulting state updates. flushAsync(0) is
// "let the pending snapshot load land without moving the clock".
async function flushAsync(ms = 0): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("SearchPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Re-prime EVERY test: overrides set inside a test would
    // otherwise leak into the next one.
    mockListProjects.mockReset();
    mockListAllItems.mockReset();
    mockListProjects.mockImplementation(async () => []);
    mockListAllItems.mockImplementation(async () => []);
  });

  // Testing Library only auto-cleans between tests when vitest
  // globals are enabled; this project imports explicitly, so
  // cleanup is explicit too. The draft module is shared state
  // and must be reset by hand.
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    resetSearchDraftState();
  });

  it("shows the type-to-search placeholder when the query is empty", async () => {
    render(<SearchPanel openProject={vi.fn()} />);
    // The ladder only reaches the placeholder once the snapshot
    // has landed; before that the quiet window renders nothing.
    await flushAsync();
    expect(screen.getByText("Type to search")).not.toBeNull();
  });

  it("hydrates the input from the query draft on mount", async () => {
    setSearchQueryDraft("hello world");
    render(<SearchPanel openProject={vi.fn()} />);
    await flushAsync();
    const input = screen.getByPlaceholderText<HTMLInputElement>(
      "Search projects and items",
    );
    expect(input.value).toBe("hello world");
  });

  it("keeps the quiet window: no loading indicator before the delay elapses", async () => {
    const deferredProjects = deferred<Project[]>();
    const deferredItems = deferred<Item[]>();
    mockListProjects.mockReturnValue(deferredProjects.promise);
    mockListAllItems.mockReturnValue(deferredItems.promise);

    render(<SearchPanel openProject={vi.fn()} />);
    // One tick short of LOADING_INDICATOR_DELAY_MS (150).
    await flushAsync(149);
    expect(screen.queryByText("Loading...")).toBeNull();

    // Settle the load so nothing is left pending after the test.
    deferredProjects.resolve([]);
    deferredItems.resolve([]);
    await flushAsync();
  });

  it("shows the loading indicator when the snapshot load outlives the delay", async () => {
    const deferredProjects = deferred<Project[]>();
    const deferredItems = deferred<Item[]>();
    mockListProjects.mockReturnValue(deferredProjects.promise);
    mockListAllItems.mockReturnValue(deferredItems.promise);

    render(<SearchPanel openProject={vi.fn()} />);
    await flushAsync(150);
    expect(screen.getByText("Loading...")).not.toBeNull();

    // And the finally path: landing hides the indicator again.
    deferredProjects.resolve([]);
    deferredItems.resolve([]);
    await flushAsync();
    expect(screen.queryByText("Loading...")).toBeNull();
  });

  it("shows the error state when the snapshot load fails", async () => {
    mockListProjects.mockRejectedValue(new Error("Storage failed"));
    render(<SearchPanel openProject={vi.fn()} />);
    await flushAsync();
    expect(screen.getByText("Storage failed")).not.toBeNull();
  });

  it("writes the draft immediately but debounces the results render", async () => {
    render(<SearchPanel openProject={vi.fn()} />);
    await flushAsync();
    const input = screen.getByPlaceholderText("Search projects and items");

    fireEvent.change(input, { target: { value: "hello" } });

    // Draft write is synchronous with the keystroke...
    expect(getSearchQueryDraft()).toBe("hello");
    // ...but the results region still shows the old debounced
    // query, one tick short of SEARCH_DEBOUNCE_MS (200)...
    expect(screen.getByText("Type to search")).not.toBeNull();
    await flushAsync(199);
    expect(screen.getByText("Type to search")).not.toBeNull();
    // ...and flips exactly when the debounce fires.
    await flushAsync(1);
    expect(screen.getByText("No results")).not.toBeNull();
  });

  it("shows No results when nothing matches", async () => {
    mockListProjects.mockImplementation(async () => [
      makeProject({ name: "Alpha project" }),
    ]);
    mockListAllItems.mockImplementation(async () => [
      makeItem({ title: "Beta note" }),
    ]);
    // Presetting the draft means debouncedQuery starts as "zzz":
    // results render as soon as the snapshot lands, no debounce
    // wait needed.
    setSearchQueryDraft("zzz");
    render(<SearchPanel openProject={vi.fn()} />);
    await flushAsync();
    expect(screen.getByText("No results")).not.toBeNull();
  });

  it("renders grouped Projects and Items sections for a matching query", async () => {
    mockListProjects.mockImplementation(async () => [
      makeProject({ id: "p1", name: "Alpha project" }),
    ]);
    mockListAllItems.mockImplementation(async () => [
      makeItem({ id: "i1", projectId: "p1", title: "alpha note" }),
    ]);
    setSearchQueryDraft("alpha");
    render(<SearchPanel openProject={vi.fn()} />);
    await flushAsync();

    expect(screen.getByText("Projects")).not.toBeNull();
    expect(screen.getByText("Items")).not.toBeNull();
    expect(screen.getByText("Alpha project")).not.toBeNull();
    expect(screen.getByText("alpha note")).not.toBeNull();
    // Exactly the two result rows (the shell renders no context
    // button on the search panel).
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("calls openProject with the row's project id on click", async () => {
    const openProject = vi.fn();
    mockListProjects.mockImplementation(async () => [
      makeProject({ id: "p1", name: "Alpha project" }),
    ]);
    mockListAllItems.mockImplementation(async () => [
      makeItem({ id: "i1", projectId: "p2", title: "Alpha note" }),
    ]);
    setSearchQueryDraft("alpha");
    render(<SearchPanel openProject={openProject} />);
    await flushAsync();

    fireEvent.click(screen.getByText("Alpha project"));
    expect(openProject).toHaveBeenCalledWith("p1");

    // Item rows navigate to their OWNING project, not the item.
    fireEvent.click(screen.getByText("Alpha note"));
    expect(openProject).toHaveBeenCalledWith("p2");
  });

  it("Escape clears the query and the draft", async () => {
    setSearchQueryDraft("alpha");
    render(<SearchPanel openProject={vi.fn()} />);
    await flushAsync();
    const input = screen.getByPlaceholderText<HTMLInputElement>(
      "Search projects and items",
    );

    fireEvent.keyDown(input, { key: "Escape" });

    expect(input.value).toBe("");
    // "" and null are DIFFERENT facts: Escape is a deliberate
    // clear, so the draft must be "" — never back to null.
    expect(getSearchQueryDraft()).toBe("");
    // After the debounce, the ladder returns to the placeholder.
    await flushAsync(200);
    expect(screen.getByText("Type to search")).not.toBeNull();
  });
});
