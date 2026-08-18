import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// @testing-library/react normally auto-registers `afterEach(cleanup)` on
// import, but only if it finds a global `afterEach` -- this project runs
// Vitest with `globals: false` (vitest.config.ts), so that auto-detection
// never fires and rendered components silently accumulate in
// `document.body` across tests within a file. Wire it explicitly instead:
// without this, two component tests in the same file that render similar
// markup (e.g. two alerts with the same "On" button text) can fail with
// "found multiple elements" for text that's only actually on screen once
// per individual test.
afterEach(() => {
  cleanup();
});
