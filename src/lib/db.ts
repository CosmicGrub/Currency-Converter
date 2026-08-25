import { get, set, del, clear, createStore } from "idb-keyval";
import { loadJSON, saveJSON, removeJSON } from "./storage.js";

// ---------------------------------------------------------------------------
// Durable key/value storage with a three-tier fallback chain:
//   1. IndexedDB (via idb-keyval)  -- large capacity, async, survives
//      private-mode quirks better than localStorage on most browsers.
//   2. localStorage (via ./storage.js) -- the pre-existing, always-available
//      namespaced JSON store. Every value written here also mirrors to
//      localStorage so existing `exchangeboard:*` keys and any code reading
//      them directly keep working unchanged (zero breaking changes).
//   3. In-memory Map -- last resort when both browser storages are
//      unavailable/throw (e.g. locked-down embedded webviews).
//
// Historical time-series datasets are kept in a dedicated IndexedDB object
// store, "history_cache", separate from the default idb-keyval store so a
// large history payload never crowds out the small, latency-sensitive
// ratesCache/prefs keys.
// ---------------------------------------------------------------------------

const memoryCache = new Map<string, unknown>();

let historyStore: ReturnType<typeof createStore> | null = null;
function getHistoryStore() {
  if (!historyStore) {
    historyStore = createStore("exchangeboard-db", "history_cache");
  }
  return historyStore;
}

let idbAvailable: boolean | null = null;

/** Cheap feature probe -- some environments (private-mode Safari/iOS in
 *  certain configurations, locked-down webviews) expose `indexedDB` but
 *  throw the moment it's used, so we track availability from real failures
 *  rather than trusting `typeof indexedDB`. */
function markIdbUnavailable() {
  idbAvailable = false;
}

// ---------------------------------------------------------------------------
// Schema versioning for the IndexedDB "history_cache" store. Scoped to
// IndexedDB only -- not localStorage/memory -- because those two are
// best-effort fallback for when IndexedDB is entirely unavailable, not the
// primary store, and every reader of this module already validates what it
// gets back regardless (e.g. fetchHistory's `typeof point.rate ===
// "number"` filter). Bump SCHEMA_VERSION in the same change that reshapes
// what gets stored under a dbSet() key (e.g. HistoryPoint gaining or
// losing a field) -- without this, an old-shaped cached record would
// silently read back as if it matched the new shape, pushing the burden
// of defensive parsing onto every single caller instead of handling it
// once, here, at the storage layer.
// ---------------------------------------------------------------------------

export const SCHEMA_VERSION = 1;
const VERSION_KEY = "__schema_version__";

/** Pure decision logic, exported separately from the actual wipe so it's
 *  unit-testable without a real (or faked) IndexedDB: `undefined` covers
 *  every session before this feature existed (nothing versioned yet, not
 *  actually a version mismatch to worry about wiping over) exactly the
 *  same way an outright version bump does (a real future schema change). */
export function schemaVersionMismatch(stored: number | undefined, current: number = SCHEMA_VERSION): boolean {
  return stored !== current;
}

let schemaReady: Promise<void> | null = null;

/** Runs once per session (memoized), before the first real IndexedDB
 *  read/write: wipes the history_cache store if its stamped version
 *  doesn't match this build's SCHEMA_VERSION, then re-stamps it. Failure
 *  here (IndexedDB unavailable at all) degrades exactly like every other
 *  IndexedDB operation in this module -- mark it unavailable and let the
 *  localStorage/memory tiers below carry on. */
function ensureSchemaVersion(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      try {
        const stored = await get<number>(VERSION_KEY, getHistoryStore());
        if (schemaVersionMismatch(stored)) {
          await clear(getHistoryStore());
          await set(VERSION_KEY, SCHEMA_VERSION, getHistoryStore());
        }
        idbAvailable = true;
      } catch {
        markIdbUnavailable();
      }
    })();
  }
  return schemaReady;
}

/** Reads `name`, trying IndexedDB first, then localStorage, then the
 *  in-memory cache -- returns `fallback` if nothing is found anywhere. */
export async function dbGet<T>(name: string, fallback: T): Promise<T> {
  await ensureSchemaVersion();
  if (idbAvailable !== false) {
    try {
      const fromIdb = await get<T>(name, getHistoryStore());
      if (fromIdb !== undefined) return fromIdb;
      idbAvailable = true;
    } catch {
      markIdbUnavailable();
    }
  }
  if (memoryCache.has(name)) return memoryCache.get(name) as T;
  return loadJSON<T>(name, fallback);
}

/** Writes `value` under `name` to every available tier -- IndexedDB (best
 *  effort), localStorage (always, so existing readers keep working), and
 *  the in-memory cache (always, as the final safety net). */
export async function dbSet<T>(name: string, value: T): Promise<void> {
  memoryCache.set(name, value);
  saveJSON(name, value);
  await ensureSchemaVersion();
  if (idbAvailable !== false) {
    try {
      await set(name, value, getHistoryStore());
      idbAvailable = true;
    } catch {
      markIdbUnavailable();
    }
  }
}

/** Removes `name` from every tier. */
export async function dbDel(name: string): Promise<void> {
  memoryCache.delete(name);
  removeJSON(name);
  await ensureSchemaVersion();
  if (idbAvailable !== false) {
    try {
      await del(name, getHistoryStore());
    } catch {
      markIdbUnavailable();
    }
  }
}
