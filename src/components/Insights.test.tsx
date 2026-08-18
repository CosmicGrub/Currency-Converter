import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Insights from "./Insights.js";

function mockHistoryResponse(rates: number[]) {
  const body: Record<string, Record<string, number>> = {};
  rates.forEach((rate, i) => {
    body[`2026-07-${String(i + 1).padStart(2, "0")}`] = { EUR: rate };
  });
  return { ok: true, json: () => Promise.resolve({ rates: body }) };
}

describe("Insights", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing for a same-currency pair", () => {
    render(<Insights base="USD" target="USD" />);
    expect(screen.queryByText(/trend insight/i)).not.toBeInTheDocument();
  });

  it("shows a trend insight once enough history resolves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(mockHistoryResponse([1, 1.1, 1.2, 1.3, 1.4, 1.5])))
    );

    render(<Insights base="USD" target="EUR" />);

    expect(screen.getByText(/building trend insight/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/trend insight/i)).toBeInTheDocument());
    expect(screen.getByText(/rising/i)).toBeInTheDocument();
    expect(screen.getByText(/not a financial forecast/i)).toBeInTheDocument();
  });

  it("renders nothing when there's not enough history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
    );

    // A different pair than the previous test -- lib/db.ts's in-memory
    // cache tier persists across tests within a file (only localStorage
    // gets reset in beforeEach), so reusing USD/EUR here would silently
    // hit the previous test's successful cache entry instead of this
    // test's failing fetch.
    render(<Insights base="GBP" target="JPY" />);

    await waitFor(() => expect(screen.queryByText(/building trend insight/i)).not.toBeInTheDocument());
    expect(screen.queryByText(/trend insight/i)).not.toBeInTheDocument();
  });
});
