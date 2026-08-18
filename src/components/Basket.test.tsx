import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Basket from "./Basket.js";
import type { BasketPreset } from "../types/index.js";

const rates = { USD: 1, EUR: 0.865939, GBP: 0.7422 };

function baseProps(overrides: Partial<Parameters<typeof Basket>[0]> = {}) {
  return {
    rates,
    base: "USD",
    amount: "100",
    codes: [] as string[],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
}

describe("Basket presets", () => {
  it("does not show a 'Save as preset' button when onSavePreset isn't provided", () => {
    render(<Basket {...baseProps({ codes: ["EUR"] })} />);
    expect(screen.queryByText("Save as preset")).not.toBeInTheDocument();
  });

  it("saves the current basket under a chosen name", () => {
    const onSavePreset = vi.fn();
    render(<Basket {...baseProps({ codes: ["EUR", "GBP"], onSavePreset })} />);

    fireEvent.click(screen.getByText("Save as preset"));
    fireEvent.change(screen.getByPlaceholderText(/preset name/i), {
      target: { value: "Europe trip" },
    });
    fireEvent.click(screen.getByText("Save"));

    expect(onSavePreset).toHaveBeenCalledWith("Europe trip");
  });

  it("lists saved presets and loads one on click", () => {
    const onLoadPreset = vi.fn();
    const presets: BasketPreset[] = [{ id: "p1", name: "Europe trip", codes: ["EUR", "GBP"] }];
    render(<Basket {...baseProps({ presets, onLoadPreset })} />);

    fireEvent.click(screen.getByText("Europe trip"));
    expect(onLoadPreset).toHaveBeenCalledWith("p1");
  });

  it("deletes a preset via its ✕ button", () => {
    const onDeletePreset = vi.fn();
    const presets: BasketPreset[] = [{ id: "p1", name: "Europe trip", codes: ["EUR"] }];
    render(<Basket {...baseProps({ presets, onDeletePreset })} />);

    fireEvent.click(screen.getByLabelText("Delete preset Europe trip"));
    expect(onDeletePreset).toHaveBeenCalledWith("p1");
  });
});
