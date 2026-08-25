#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Runs as a postinstall step (see package.json). typescript-eslint@8.68.0's
// own runtime version check refuses to load at all against TypeScript 7.x
// (the native/Go port) -- it only supports the classic TS 4.8.4-6.0.x API
// surface, and as of this writing hasn't been updated for TS 7 even in its
// canary release (confirmed by checking, not assuming). This project's
// actual build (tsc --noEmit, vite build) needs TypeScript 7 and stays on
// it untouched -- only the ESLint tooling needs a different version.
//
// devDependencies carries `typescript-eslint-compat: npm:typescript@6.0.3`
// (an npm alias -- installs TS 6.0.3's real code under a differently-named
// folder, so it coexists with the root's own typescript@^7.0.2 devDependency
// with zero conflict). What's still needed: every @typescript-eslint
// package (+ ts-api-utils, a transitive dependency) that does its own
// top-level `require("typescript")` needs to resolve to that instead of the
// root's TS 7 install. npm's `overrides` field can't force this split for a
// *peer* dependency against the root project's own same-named direct
// dependency (verified empirically across several attempts --
// --legacy-peer-deps, --force, --install-strategy=nested, and $-alias
// override references all either hard-failed or silently collapsed back to
// deduping everyone onto the root's TS 7 copy) -- so this script does it
// directly: a `node_modules/<pkg>/node_modules/typescript` symlink per
// package, which Node's own module resolution (child node_modules wins over
// an ancestor's) picks up ahead of the root install, with zero effect on
// how any other part of this project resolves `typescript`.
//
// Safe to run repeatedly (relinks unconditionally) and safe to skip if the
// compat package or a target package isn't present (e.g. a future
// dependency-tree change) -- this only ever affects linting, never the
// actual app or its build.
// ---------------------------------------------------------------------------
import { existsSync, mkdirSync, lstatSync, unlinkSync, symlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, dirname } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const COMPAT_PKG = join(ROOT, "node_modules", "typescript-eslint-compat");

const TARGET_PACKAGES = [
  "@typescript-eslint/eslint-plugin",
  "@typescript-eslint/parser",
  "@typescript-eslint/type-utils",
  "@typescript-eslint/typescript-estree",
  "ts-api-utils",
];

if (!existsSync(COMPAT_PKG)) {
  // devDependencies changed, or this is a production-only install
  // (`npm ci --omit=dev`) that skips devDependencies entirely -- either
  // way, nothing to link and nothing to warn about; `npm run lint` isn't
  // expected to work in that scenario anyway.
  process.exit(0);
}

let linked = 0;
for (const pkg of TARGET_PACKAGES) {
  const pkgDir = join(ROOT, "node_modules", pkg);
  if (!existsSync(pkgDir)) continue;

  const nestedNodeModules = join(pkgDir, "node_modules");
  const linkPath = join(nestedNodeModules, "typescript");
  mkdirSync(nestedNodeModules, { recursive: true });

  const existing = lstatSync(linkPath, { throwIfNoEntry: false });
  if (existing) unlinkSync(linkPath);

  symlinkSync(relative(nestedNodeModules, COMPAT_PKG), linkPath, "dir");
  linked++;
}

console.log(`[link-eslint-typescript-compat] linked TypeScript 6.0.3 for ${linked} package(s) (ESLint tooling only).`);
