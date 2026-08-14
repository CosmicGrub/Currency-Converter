// ---------------------------------------------------------------------------
// Number/currency formatting helpers.
// ---------------------------------------------------------------------------

/** Formats a number as a currency string for the given ISO code, falling
 *  back to a plain number + code suffix if Intl doesn't recognize it. */
export const fmt = (n: number, code: string): string => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: n < 1 ? 6 : 4,
    }).format(n);
  } catch {
    return `${n.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${code}`;
  }
};

/** Formats a raw (unit-less) number for the big result readout. */
export const rawNum = (n: number): string =>
  n.toLocaleString("en-US", { maximumFractionDigits: 6 });
