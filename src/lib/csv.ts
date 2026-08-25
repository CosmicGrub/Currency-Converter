// ---------------------------------------------------------------------------
// CSV export -- generic, dependency-free. Two layers so the escaping logic
// (the part worth unit-testing precisely) is decoupled from the browser
// download mechanism (Blob/URL, not meaningfully testable under jsdom).
// ---------------------------------------------------------------------------

/** Escapes a single CSV field per RFC 4180: wrap in quotes if the value
 *  contains a comma, quote, or newline; double up any embedded quotes. */
function escapeCsvField(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Turns an array of same-shaped row objects into an RFC 4180 CSV string
 *  (CRLF line endings, header row from the first row's keys). Returns just
 *  the header line for an empty array rather than an empty string, so a
 *  downloaded file is never completely blank. */
export function toCSV<T extends Record<string, string | number>>(
  rows: T[],
  columns?: (keyof T)[]
): string {
  const cols = columns ?? (rows[0] ? (Object.keys(rows[0]) as (keyof T)[]) : []);
  const lines = [cols.map((c) => escapeCsvField(String(c))).join(",")];
  for (const row of rows) {
    lines.push(cols.map((c) => escapeCsvField(row[c] ?? "")).join(","));
  }
  return lines.join("\r\n");
}

/** Triggers a browser download of `content` as a file named `filename`.
 *  No-op if URL.createObjectURL isn't available (e.g. under jsdom in
 *  tests) rather than throwing, so callers don't need to feature-detect. */
export function downloadCSV(filename: string, content: string): void {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
