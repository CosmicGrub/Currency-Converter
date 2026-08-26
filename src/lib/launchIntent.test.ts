import { describe, expect, it } from "vitest";
import { parseConvertIntent } from "./launchIntent.js";

describe("parseConvertIntent", () => {
  it("parses a well-formed custom-scheme convert URL, upper-casing codes", () => {
    expect(parseConvertIntent("com.cosmicgrub.exchangeboard://convert?base=usd&target=eur")).toEqual({
      base: "USD",
      target: "EUR",
    });
  });

  it("also accepts a /convert path form (in case a host-based scheme is ever used)", () => {
    expect(parseConvertIntent("https://example.com/convert?base=USD&target=GBP")).toEqual({
      base: "USD",
      target: "GBP",
    });
  });

  it("returns null for null/undefined input", () => {
    expect(parseConvertIntent(null)).toBeNull();
    expect(parseConvertIntent(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseConvertIntent("")).toBeNull();
  });

  it("returns null for a URL that isn't a convert intent (e.g. a plain launch URL)", () => {
    expect(parseConvertIntent("com.cosmicgrub.exchangeboard://somethingElse")).toBeNull();
  });

  it("returns null when base or target is missing", () => {
    expect(parseConvertIntent("com.cosmicgrub.exchangeboard://convert?base=USD")).toBeNull();
    expect(parseConvertIntent("com.cosmicgrub.exchangeboard://convert?target=EUR")).toBeNull();
  });

  it("returns null for a malformed URL instead of throwing", () => {
    expect(parseConvertIntent("not a url at all")).toBeNull();
  });
});
