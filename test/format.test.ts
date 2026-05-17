import { describe, expect, it } from "vitest";
import { normalizeDisplayText, stripDeviceNamePrefix } from "../src/format";

describe("display text", () => {
  it("removes repeated UniFi Drive prefixes", () => {
    expect(stripDeviceNamePrefix("UniFi Drive: Storage usage")).toBe("Storage usage");
    expect(stripDeviceNamePrefix("UniFi Drive / UNAS - System Status")).toBe("System Status");
    expect(stripDeviceNamePrefix("Ubiquiti UniFi Drive Storage Used")).toBe("Used");
  });

  it("uses the fallback when the value is only the device prefix", () => {
    expect(normalizeDisplayText("UniFi Drive", "System status")).toBe("System status");
  });
});
