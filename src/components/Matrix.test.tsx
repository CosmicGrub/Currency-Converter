import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Matrix from "./Matrix.js";

const rates = { USD: 1, EUR: 0.865939, GBP: 0.7422 };

describe("Matrix", () => {
  it("shows a prompt instead of a table when fewer than 2 favorites are set", () => {
    render(<Matrix rates={rates} favorites={["USD"]} />);
    expect(screen.getByText(/star at least 2 currencies/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders an N x N table for the favorites list", () => {
    render(<Matrix rates={rates} favorites={["USD", "EUR", "GBP"]} />);
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    // 3 row headers + 3 column headers, each currency code appears twice.
    expect(screen.getAllByText("EUR").length).toBe(2);
    // 1 USD = rates.EUR units of EUR.
    expect(screen.getByText((0.865939).toFixed(4))).toBeInTheDocument();
  });

  it("shows an em dash for a currency not in the loaded rate table", () => {
    render(<Matrix rates={rates} favorites={["USD", "ZZZ"]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
