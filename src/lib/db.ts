import { get, set, del, createStore } from "idb-keyval";
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

/** Reads `name`, trying IndexedDB first, then localStorage, then the
 *  in-memory cache -- returns `fallback` if nothing is found anywhere. */
export async function dbGet<T>(name: string, fallback: T): Promise<T> {
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
  if (idbAvailable !== false) {
    try {
      await del(name, getHistoryStore());
    } catch {
      markIdbUnavailable();
    }
  }
}
