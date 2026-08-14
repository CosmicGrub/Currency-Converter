// ---------------------------------------------------------------------------
// Number/currency formatting helpers -- locale-aware via the browser's
// reported language (navigator.language), falling back to "en-US" in
// non-browser contexts (SSR, the CLI, tests) or if Intl rejects it.
// ---------------------------------------------------------------------------

/** The active display locale. Reads the browser's preferred language so
 *  thousands separators, decimal marks, and currency symbol placement
 *  match what the user already sees everywhere else on their device. */
export function getLocale(): string {
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return "en-US";
}

/** Formats a number as a currency string for the given ISO code, falling
 *  back to a plain locale-formatted number + code suffix if Intl doesn't
 *  recognize the currency code or the locale. */
export const fmt = (n: number, code: string, locale: string = getLocale()): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: n < 1 ? 6 : 4,
    }).format(n);
  } catch {
    try {
      return `${n.toLocaleString(locale, { maximumFractionDigits: 4 })} ${code}`;
    } catch {
      // Unrecognized locale on top of an unrecognized currency code --
      // fall all the way back to the one locale Intl always supports.
      return `${n.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${code}`;
    }
  }
};

/** Formats a raw (unit-less) number for the big result readout. */
export const rawNum = (n: number, locale: string = getLocale()): string => {
  try {
    return n.toLocaleString(locale, { maximumFractionDigits: 6 });
  } catch {
    return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }
};
