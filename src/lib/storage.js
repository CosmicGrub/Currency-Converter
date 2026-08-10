// ---------------------------------------------------------------------------
// Small localStorage wrapper -- namespaced, JSON-aware, never throws (private
// browsing / storage-disabled environments just behave as if nothing is saved).
// ---------------------------------------------------------------------------
const NAMESPACE = "exchangeboard";

const key = (name) => `${NAMESPACE}:${name}`;

export function loadJSON(name, fallback) {
  try {
    const raw = localStorage.getItem(key(name));
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(name, value) {
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
  } catch {
    // storage unavailable/full -- silently no-op, app still works in-memory
  }
}
