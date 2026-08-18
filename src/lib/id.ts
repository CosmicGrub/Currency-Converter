// ---------------------------------------------------------------------------
// Local, non-cryptographic id generation for user-created records (basket
// presets, rate alerts) that only need to be unique within this browser's
// own localStorage -- never sent anywhere, never need to be globally unique.
// ---------------------------------------------------------------------------

/** A reasonably-unique id: crypto.randomUUID() where available (all
 *  current browsers, Node 19+), falling back to a timestamp + random
 *  suffix in older/non-standard environments. */
export function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
