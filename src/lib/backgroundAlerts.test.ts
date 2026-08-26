import { describe, expect, it } from "vitest";
import {
  isNativeBackgroundAlertsCapable,
  requestBackgroundAlertsPermission,
  syncBackgroundAlerts,
} from "./backgroundAlerts.js";
import type { RateAlert } from "../types/index.js";

const sampleAlert: RateAlert = {
  id: "a1",
  base: "USD",
  target: "EUR",
  direction: "above",
  threshold: 0.9,
  enabled: true,
  triggered: false,
};

describe("browser/jsdom fallback (no native Capacitor bridge present)", () => {
  it("isNativeBackgroundAlertsCapable is false outside a native Android shell", () => {
    expect(isNativeBackgroundAlertsCapable()).toBe(false);
  });

  it("syncBackgroundAlerts resolves without throwing and without calling the native bridge", async () => {
    await expect(syncBackgroundAlerts([sampleAlert])).resolves.toBeUndefined();
  });

  it("syncBackgroundAlerts is a no-op for an empty alert list too", async () => {
    await expect(syncBackgroundAlerts([])).resolves.toBeUndefined();
  });

  it("requestBackgroundAlertsPermission resolves true (nothing to gate outside native Android)", async () => {
    await expect(requestBackgroundAlertsPermission()).resolves.toBe(true);
  });
});
