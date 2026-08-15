// src/ui/core/ReactPanelHost.test.tsx
/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ReactPanelHost } from "./ReactPanelHost";

describe("ReactPanelHost", () => {
  // Testing Library only auto-cleans between tests when vitest
  // globals are enabled; this project imports explicitly, so
  // cleanup is explicit too.
  afterEach(cleanup);

  it("mounts and exposes the readiness probe", () => {
    const { container } = render(<ReactPanelHost activePanel={null} />);

    expect(container.querySelector('[data-aiw-react="ready"]')).not.toBeNull();
  });
});
