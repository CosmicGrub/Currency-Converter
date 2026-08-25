// ---------------------------------------------------------------------------
// ESLint config for ExchangeBoard. Legacy (.eslintrc) format, not flat
// config -- this project pins eslint@^8.57.0 and fairly old plugin
// versions (eslint-plugin-react-hooks@^4.6.2 in particular), and the
// legacy format is the one guaranteed-stable config shape across all of
// them; flat config support varies by plugin version.
//
// @typescript-eslint/parser + @typescript-eslint/eslint-plugin (^8.68.0,
// the current stable release) don't run at all against this project's
// TypeScript 7.0.2 -- not just an unbumped peer range (checked its
// canary release too, not just latest), but an actual runtime version
// check: TS 7's native/Go port doesn't ship the classic JS-callable
// compiler API these tools need, and typescript-eslint refuses to load
// rather than guess. See scripts/link-eslint-typescript-compat.mjs for
// the real fix: `typescript-eslint-compat` (an npm alias for
// typescript@6.0.3, the last classic-API release) lives alongside this
// project's real typescript@^7.0.2 with zero conflict, and a postinstall
// step symlinks it into every @typescript-eslint package (+ ts-api-utils)
// that does its own `require("typescript")`, so ESLint tooling resolves
// a supported version while `tsc`/`vite` elsewhere keep using TS 7
// untouched. `npm install`/`npm ci` need `--legacy-peer-deps` for this
// project now -- npm's strict peer resolver won't accept the TS
// 6-vs-7 split even with an explicit `overrides` entry (verified
// empirically: --force, --install-strategy=nested, and $-alias override
// references were all tried and either hard-failed or silently
// re-deduped everything onto the root's TS 7 copy).
// ---------------------------------------------------------------------------

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "detect" },
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  plugins: ["@typescript-eslint", "react", "react-hooks", "react-refresh"],
  ignorePatterns: [
    "dist",
    "dev-dist",
    "node_modules",
    "android", // Java/Kotlin, not JS/TS -- outside ESLint's domain entirely
    "releases",
    "coverage",
  ],
  rules: {
    // React 18's automatic JSX runtime (see vite.config.ts's @vitejs/plugin-react)
    // means no file needs `import React` just to use JSX -- both of these
    // rules assume the older classic runtime and would otherwise flag
    // every single component file in src/components/ for nothing.
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",
    // TypeScript interfaces/types already cover this project's prop
    // validation -- PropTypes is a plain-JS-era pattern this project
    // doesn't use anywhere.
    "react/prop-types": "off",
    // A leading underscore is this project's existing convention for an
    // intentionally-unused parameter (see e.g. catch-block bindings) --
    // matches, doesn't silence unused-vars entirely.
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    // Allow a component file to also export a small constant alongside
    // the component itself (e.g. a default-props object or a named
    // sub-component) without react-refresh treating that as breaking
    // fast refresh -- the common, low-risk case this rule's own docs
    // call out as safe to allow.
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
  },
  overrides: [
    {
      // bin/exchangeboard.js (the standalone CLI) and scripts/*.mjs (CI
      // tooling) are plain Node scripts -- no React, no JSX, no browser
      // globals. The react/react-hooks rules are harmless no-ops on files
      // with no JSX, but disabling them here is more honest about what
      // these files actually are.
      files: ["bin/**/*.js", "scripts/**/*.mjs"],
      env: { node: true, browser: false },
      rules: {
        "react/react-in-jsx-scope": "off",
        "react/jsx-uses-react": "off",
      },
    },
    {
      // Test files commonly need `any` for loosely-typed mocks (e.g.
      // casting a mocked `fetch` -- see src/App.test.tsx) -- downgraded
      // to a warning here rather than disabled outright, so a genuinely
      // avoidable `any` still gets flagged for a human to look at.
      files: ["**/*.test.ts", "**/*.test.tsx", "src/test/**/*.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "warn",
      },
    },
  ],
};
