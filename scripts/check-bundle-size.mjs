#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Strict production bundle-size gate for CI. Sums the gzip size of every JS
// file Vite emits into dist/ (the app bundle + the PWA register glue --
// deliberately excludes the generated service worker itself, sw.js/
// workbox-*.js at the dist root, since those are fetched once by the
// browser's SW machinery in the background, not blocking first paint) and
// fails the build if the total exceeds BUDGET_BYTES.
//
// Run after `vite build`: `node scripts/check-bundle-size.mjs`
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIST_DIR = "dist";
const ASSETS_DIR = join(DIST_DIR, "assets");
// Gzip'd JS budget for the app's own bundle (main chunk + the small PWA
// register shim). Generous headroom over the current ~55KB gzip main
// chunk, but still a real ceiling -- CI fails loudly if a dependency
// bloats the bundle rather than the app quietly getting heavier release
// over release.
const BUDGET_BYTES = 300 * 1024; // 300 KB gzip

function collectJsFiles(dir) {
  if (!statSync(dir, { throwIfNoEntry: false })) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => join(dir, f));
}

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function main() {
  const files = collectJsFiles(ASSETS_DIR);
  if (files.length === 0) {
    console.error(`No JS assets found under ${ASSETS_DIR} -- did the build run first?`);
    process.exit(1);
  }

  let total = 0;
  console.log("Bundle size (gzip):");
  for (const file of files.sort()) {
    const raw = readFileSync(file);
    const gzipSize = gzipSync(raw).length;
    total += gzipSize;
    console.log(`  ${file.padEnd(48)} ${formatKB(gzipSize)}`);
  }
  console.log(`  ${"TOTAL".padEnd(48)} ${formatKB(total)}`);
  console.log(`  ${"BUDGET".padEnd(48)} ${formatKB(BUDGET_BYTES)}`);

  if (total > BUDGET_BYTES) {
    console.error(
      `\nBundle size budget exceeded: ${formatKB(total)} > ${formatKB(BUDGET_BYTES)}.`
    );
    process.exit(1);
  }

  console.log(`\nWithin budget (${formatKB(BUDGET_BYTES - total)} to spare).`);
}

main();
