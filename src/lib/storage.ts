// ---------------------------------------------------------------------------
// Small localStorage wrapper -- namespaced, JSON-aware, never throws (private
// browsing / storage-disabled environments just behave as if nothing is saved).
// ---------------------------------------------------------------------------
const NAMESPACE = "exchangeboard";

const key = (name: string) => `${NAMESPACE}:${name}`;

export function loadJSON<T>(name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(name));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(name: string, value: T): void {
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
  } catch {
    // storage unavailable/full -- silently no-op, app still works in-memory
  }
}
