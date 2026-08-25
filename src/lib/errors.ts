// ---------------------------------------------------------------------------
// Typed error taxonomy for the three external data sources (open.er-api.com,
// frankfurter.dev, coingecko.com). Before this, every fetch path threw a
// plain `Error` with an ad hoc string message (or, in a couple of places,
// swallowed the failure entirely via a bare `catch {}`), so nothing
// downstream could tell "the network is down" apart from "the API is up
// but changed its response shape" -- both just looked like "something
// failed." That distinction matters here specifically: a network failure
// is expected and already has a good fallback (the offline rate cache); an
// API returning a different shape than expected is a different problem
// (the app's assumptions about that API are now wrong) and deserves a
// different, more specific message if it ever needs to surface to a user
// or a bug report.
//
// A discriminated union (`kind`), not subclasses -- exhaustive `switch`
// on `.kind` gets a compile error if a new variant is added and a
// consumer forgets to handle it, which a class hierarchy alone doesn't
// give you for free.
// ---------------------------------------------------------------------------

export type DataSourceErrorKind = "network" | "http" | "shape" | "empty";

/** A source's own label, used only for the developer-facing `.message` --
 *  never shown to a user (see `.userMessage` on DataSourceError for that). */
export type DataSource = "rates" | "history" | "crypto";

export class DataSourceError extends Error {
  readonly kind: DataSourceErrorKind;
  readonly source: DataSource;
  /** The original thrown value, if this wraps one (a network failure or an
   *  unexpected exception) -- omitted for a `"shape"`/`"http"`/`"empty"`
   *  error, which are raised directly rather than wrapping something else.
   *  Not `Error.cause` (part of ES2022, past this project's ES2020
   *  target) -- a plain own property instead. */
  readonly cause?: unknown;

  constructor(kind: DataSourceErrorKind, source: DataSource, message: string, cause?: unknown) {
    super(message);
    this.name = "DataSourceError";
    this.kind = kind;
    this.source = source;
    this.cause = cause;
  }

  /** A short, honest, user-facing explanation -- no stack traces, no
   *  jargon like "shape" or "schema," just what happened and (implicitly)
   *  that it isn't the user's fault. Callers needing more detail for a
   *  bug report should use `.message`/`.cause` instead. */
  get userMessage(): string {
    switch (this.kind) {
      case "network":
        return "Couldn't reach the rates service.";
      case "http":
        return "The rates service returned an error.";
      case "shape":
        return "The rates service sent back data in an unexpected format.";
      case "empty":
        return "The rates service didn't return any usable data.";
    }
  }
}

/** Wraps an arbitrary caught value (from a failed `fetch()`, typically) as
 *  a `DataSourceError` with `kind: "network"` -- the one variant that
 *  isn't raised directly, since it always originates from something else
 *  throwing first. */
export function toNetworkError(source: DataSource, cause: unknown): DataSourceError {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new DataSourceError("network", source, `${source}: network failure (${detail})`, cause);
}
