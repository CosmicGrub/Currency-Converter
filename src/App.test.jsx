import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

const mockRatesResponse = {
  result: "success",
  base_code: "USD",
  time_last_update_utc: "Sun, 09 Aug 2026 00:00:00 +0000",
  rates: { USD: 1, EUR: 0.865939, GBP: 0.7422, JPY: 157.9261, CAD: 1.3956, AUD: 1.4182, INR: 95.2492, CNY: 6.7651, MXN: 17.1538 },
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      if (String(url).includes("open.er-api.com")) {
        return Promise.resolve({ json: () => Promise.resolve(mockRatesResponse) });
      }
      // Historical chart source — not under test here; keep it a graceful no-op.
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the heading and the live USD -> EUR conversion once rates load", async () => {
    render(<App />);

    expect(screen.getByText("Global Currency Converter")).toBeInTheDocument();
    expect(screen.getByText("Fetching live exchange rates…")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/USD EQUALS/)).toBeInTheDocument());
    expect(screen.getAllByText(/0\.865939/).length).toBeGreaterThan(0);
  });

  it("falls back to an error state when the fetch fails and no cache exists", async () => {
    fetch.mockImplementation(() => Promise.reject(new Error("network down")));

    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByText("Couldn't reach the rates service, and no cached rates are available.")
      ).toBeInTheDocument()
    );
  });
});
