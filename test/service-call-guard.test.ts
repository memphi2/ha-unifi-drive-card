import { describe, expect, it, vi } from "vitest";
import {
  ServiceCallGuard,
  serviceActionKey,
} from "../src/service-call-guard";

describe("ServiceCallGuard", () => {
  it("blocks duplicate calls for the same action key while one is pending", async () => {
    const onChange = vi.fn();
    const guard = new ServiceCallGuard(onChange);
    const duplicateAction = vi.fn(async () => undefined);
    let release!: () => void;

    const first = guard.run("switch.eco:turn_off", () =>
      new Promise((resolve) => {
        release = () => resolve(undefined);
      }),
    );
    const duplicate = guard.run("switch.eco:turn_off", duplicateAction);

    await duplicate;

    expect(duplicateAction).not.toHaveBeenCalled();
    expect(guard.isBusy("switch.eco:turn_off")).toBe(true);
    expect(guard.isEntityBusy("switch.eco")).toBe(true);

    release();
    await first;

    expect(guard.isBusy("switch.eco:turn_off")).toBe(false);
    expect(guard.isEntityBusy("switch.eco")).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("allows different action keys to run concurrently", async () => {
    const guard = new ServiceCallGuard();
    const turnOff = vi.fn(async () => undefined);
    const turnOn = vi.fn(async () => undefined);

    await Promise.all([
      guard.run("switch.eco:turn_off", turnOff),
      guard.run("switch.eco:turn_on", turnOn),
    ]);

    expect(turnOff).toHaveBeenCalledOnce();
    expect(turnOn).toHaveBeenCalledOnce();
  });

  it("builds stable service action keys", () => {
    expect(serviceActionKey("switch.eco", "turn_off")).toBe("switch.eco:turn_off");
  });
});
