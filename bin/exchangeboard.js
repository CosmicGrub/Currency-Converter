#!/usr/bin/env node
// ---------------------------------------------------------------------------
// ExchangeBoard CLI -- terminal currency conversion using the same live
// data source and base-agnostic math as the web app (src/lib/convert.ts:
// rateBetween/convertAmount). The conversion formula is duplicated here
// (not imported) on purpose: this file must run as plain Node ESM with zero
// build step and zero dependencies for `npx exchangeboard ...` to work, so
// it can't import the TypeScript sources directly. If you change the
// formula in src/lib/convert.ts, mirror the change here.
//
//   npx exchangeboard convert 100 USD EUR
//   npx exchangeboard rates USD
//   npx exchangeboard rates USD --json
//   npx exchangeboard convert 100 USD EUR --refresh   # bypass the cache
// ---------------------------------------------------------------------------
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const RATES_ENDPOINT = "https://open.er-api.com/v6/latest/USD";
const CACHE_DIR = join(homedir(), ".exchangeboard");
const CACHE_FILE = join(CACHE_DIR, "rates-cache.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour -- avoids hammering the API on repeated CLI runs

// -- Conversion math (mirrors src/lib/convert.ts) ---------------------------

/** 1 unit of `base` in units of `target`, or null if either rate is missing. */
function rateBetween(ratesUSD, base, target) {
  if (!ratesUSD) return null;
  const baseRate = ratesUSD[base];
  const targetRate = ratesUSD[target];
  if (typeof baseRate !== "number" || !isFinite(baseRate) || baseRate === 0) return null;
  if (typeof targetRate !== "number" || !isFinite(targetRate)) return null;
  return targetRate / baseRate;
}

/** Converts `amount` units of `base` into `target`, or null if inputs are incomplete. */
function convertAmount(amount, ratesUSD, base, target) {
  const rate = rateBetween(ratesUSD, base, target);
  if (rate === null || typeof amount !== "number" || !isFinite(amount)) return null;
  return amount * rate;
}

// -- Local file cache ---------------------------------------------------------

function readCacheFile() {
  if (!existsSync(CACHE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeCacheFile(entry) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(entry, null, 2));
  } catch {
    // Cache is a best-effort speedup, not a requirement -- ignore write failures
    // (read-only filesystem, permissions, etc.) and keep working from the network.
  }
}

/** Loads the USD-indexed rate table, preferring a fresh local cache (< 1h
 *  old) over the network, and falling back to a stale cache if the network
 *  fails entirely. Returns { rates, asOf, fromCache, stale }. */
async function loadRates({ forceRefresh = false } = {}) {
  const cached = readCacheFile();
  const cacheIsFresh =
    cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS;

  if (!forceRefresh && cacheIsFresh) {
    return { rates: cached.rates, asOf: cached.asOf, fromCache: true, stale: false };
  }

  try {
    const res = await fetch(RATES_ENDPOINT);
    const data = await res.json();
    if (data.result !== "success") throw new Error("bad response from rates API");
    const entry = {
      rates: data.rates,
      asOf: data.time_last_update_utc,
      fetchedAt: new Date().toISOString(),
    };
    writeCacheFile(entry);
    return { rates: entry.rates, asOf: entry.asOf, fromCache: false, stale: false };
  } catch (err) {
    if (cached) {
      return { rates: cached.rates, asOf: cached.asOf, fromCache: true, stale: true };
    }
    throw new Error(`Couldn't reach the rates service and no local cache exists: ${err.message}`);
  }
}

// -- CLI ----------------------------------------------------------------------

function usage() {
  return `ExchangeBoard CLI -- terminal currency conversion, live rates.

Usage:
  exchangeboard convert <amount> <from> <to> [--json] [--refresh]
  exchangeboard rates <base> [--json] [--refresh]
  exchangeboard help

Examples:
  npx exchangeboard convert 100 USD EUR
  npx exchangeboard rates USD
  npx exchangeboard convert 50 GBP JPY --refresh

Rates are fetched from open.er-api.com and cached locally at
~/.exchangeboard/rates-cache.json for up to 1 hour; pass --refresh to
force a fresh fetch.`;
}

function parseArgs(argv) {
  const flags = new Set();
  const positional = [];
  for (const arg of argv) {
    if (arg.startsWith("--")) flags.add(arg.slice(2));
    else positional.push(arg);
  }
  return { positional, flags };
}

async function runConvert(positional, flags) {
  const [amountStr, base, target] = positional;
  if (!amountStr || !base || !target) {
    throw new Error("Usage: exchangeboard convert <amount> <from> <to>");
  }
  const amount = parseFloat(amountStr);
  if (!isFinite(amount)) throw new Error(`"${amountStr}" isn't a valid amount.`);

  const baseCode = base.toUpperCase();
  const targetCode = target.toUpperCase();
  const { rates, asOf, fromCache, stale } = await loadRates({ forceRefresh: flags.has("refresh") });
  const converted = convertAmount(amount, rates, baseCode, targetCode);
  const rate = rateBetween(rates, baseCode, targetCode);

  if (converted === null || rate === null) {
    throw new Error(`Couldn't resolve a rate for ${baseCode} -> ${targetCode}. Check the currency codes.`);
  }

  if (flags.has("json")) {
    console.log(JSON.stringify({ amount, base: baseCode, target: targetCode, rate, converted, asOf, fromCache, stale }));
    return;
  }

  console.log(`${amount} ${baseCode} = ${converted.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${targetCode}`);
  console.log(`1 ${baseCode} = ${rate.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${targetCode}`);
  console.log(stale ? `(offline -- cached rates as of ${asOf})` : `(rates as of ${asOf}${fromCache ? ", cached" : ""})`);
}

async function runRates(positional, flags) {
  const [base = "USD"] = positional;
  const baseCode = base.toUpperCase();
  const { rates, asOf, fromCache, stale } = await loadRates({ forceRefresh: flags.has("refresh") });

  if (!rates[baseCode]) throw new Error(`Unknown currency code "${baseCode}".`);

  const table = Object.keys(rates)
    .filter((c) => c !== baseCode)
    .sort()
    .reduce((acc, c) => {
      acc[c] = rateBetween(rates, baseCode, c);
      return acc;
    }, {});

  if (flags.has("json")) {
    console.log(JSON.stringify({ base: baseCode, rates: table, asOf, fromCache, stale }));
    return;
  }

  console.log(`Rates for 1 ${baseCode} (${stale ? "offline, cached" : fromCache ? "cached" : "live"} as of ${asOf}):`);
  for (const [code, rate] of Object.entries(table)) {
    console.log(`  ${code.padEnd(4)} ${rate.toLocaleString("en-US", { maximumFractionDigits: 6 })}`);
  }
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const { positional, flags } = parseArgs(rest);

  if (!cmd || cmd === "help" || flags.has("help")) {
    console.log(usage());
    return;
  }

  if (cmd === "convert") return runConvert(positional, flags);
  if (cmd === "rates") return runRates(positional, flags);

  throw new Error(`Unknown command "${cmd}".\n\n${usage()}`);
}

main().catch((err) => {
  console.error(`exchangeboard: ${err.message}`);
  process.exitCode = 1;
});
