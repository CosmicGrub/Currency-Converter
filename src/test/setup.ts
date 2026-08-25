import "@testing-library/jest-dom/vitest";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";

// Registers the `toHaveNoViolations()` matcher (from jest-axe, which despite
// the name has no runtime dependency on the Jest test runner itself -- just
// axe-core plus a Jest-API-compatible custom matcher, and Vitest's `expect`
// is that same API) globally, the same way `@testing-library/jest-dom/vitest`
// above already registers `.toBeInTheDocument()` etc. -- see component *.test.tsx
// files for `axe(container)` usage.
expect.extend(toHaveNoViolations);

// @testing-library/react normally auto-registers `afterEach(cleanup)` on
// import, but only if it finds a global `afterEach` -- this project runs
// Vitest with `globals: false` (vitest.config.ts), so that auto-detection
// never fires and rendered components silently accumulate in
// `document.body` across tests within a file. Wire it explicitly instead:
// without this, two component tests in the same file that render similar
// markup can fail with "found multiple elements" for text that's only
// actually on screen once per individual test. (Same fix independently
// applied on the feature/rate-alerts-basket-presets branch -- this branch
// forked from main before that landed, so it needs it too.)
afterEach(() => {
  cleanup();
});
