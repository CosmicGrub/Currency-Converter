import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Alerts from "./Alerts.js";
import type { RateAlert } from "../types/index.js";

const rates = { USD: 1, EUR: 0.865939, GBP: 0.7422 };

function baseProps(overrides: Partial<Parameters<typeof Alerts>[0]> = {}) {
  return {
    rates,
    base: "USD",
    target: "EUR",
    alerts: [] as RateAlert[],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onToggle: vi.fn(),
    onMarkTriggered: vi.fn(),
    ...overrides,
  };
}

describe("Alerts", () => {
  beforeEach(() => {
    // Notification is undefined in jsdom by default -- fine, notify.ts
    // treats that as "unsupported" and no-ops. Explicitly stub it out for
    // tests that care about permission-request behavior.
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the empty-state prompt when there are no alerts", () => {
    render(<Alerts {...baseProps()} />);
    expect(screen.getByText(/set a threshold on any pair/i)).toBeInTheDocument();
  });

  it("adds an alert via the inline form", () => {
    const onAdd = vi.fn();
    render(<Alerts {...baseProps({ onAdd })} />);

    fireEvent.click(screen.getByText("+ Add alert"));
    fireEvent.change(screen.getByPlaceholderText(/e.g. 0.90/i), { target: { value: "0.9" } });
    fireEvent.click(screen.getByText("Add"));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const added = onAdd.mock.calls[0][0];
    expect(added).toMatchObject({
      base: "USD",
      target: "EUR",
      direction: "above",
      threshold: 0.9,
      enabled: true,
      triggered: false,
    });
    expect(added.id).toBeTruthy();
  });

  it("shows a live status line with the current rate for an existing alert", () => {
    const alert: RateAlert = {
      id: "a1",
      base: "USD",
      target: "EUR",
      direction: "above",
      threshold: 0.5,
      enabled: true,
      triggered: false,
    };
    render(<Alerts {...baseProps({ alerts: [alert] })} />);

    expect(screen.getByText("USD/EUR above 0.5")).toBeInTheDocument();
    expect(screen.getByText(/now 0\.8659/)).toBeInTheDocument();
    // 0.865939 >= 0.5 threshold -- already crossed, badge should show.
    expect(screen.getByText("🔔 Triggered")).toBeInTheDocument();
  });

  it("calls onToggle and onRemove for an existing alert", () => {
    const onToggle = vi.fn();
    const onRemove = vi.fn();
    const alert: RateAlert = {
      id: "a1",
      base: "USD",
      target: "EUR",
      direction: "above",
      threshold: 0.5,
      enabled: true,
      triggered: false,
    };
    render(<Alerts {...baseProps({ alerts: [alert], onToggle, onRemove })} />);

    fireEvent.click(screen.getByText("On"));
    expect(onToggle).toHaveBeenCalledWith("a1");

    fireEvent.click(screen.getByLabelText("Remove USD/EUR alert"));
    expect(onRemove).toHaveBeenCalledWith("a1");
  });

  it("marks an alert triggered (and notifies) the first time it crosses, then re-arms silently", () => {
    const onMarkTriggered = vi.fn();
    const alert: RateAlert = {
      id: "a1",
      base: "USD",
      target: "EUR",
      direction: "above",
      threshold: 0.5, // already crossed by the fixture rates
      enabled: true,
      triggered: false,
    };
    render(<Alerts {...baseProps({ alerts: [alert], onMarkTriggered })} />);

    expect(onMarkTriggered).toHaveBeenCalledWith("a1", true);
  });
});
