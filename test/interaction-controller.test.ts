import { describe, expect, it, vi } from "vitest";
import { EntityActionController } from "../src/interaction-controller";

describe("EntityActionController", () => {
  it("dispatches a delayed tap when double tap is enabled", async () => {
    vi.useFakeTimers();
    const controller = new EntityActionController();
    const dispatch = vi.fn();

    controller.handleClick(clickEvent(), {
      entityId: "sensor.water",
      hasDoubleTap: true,
      hasHold: false,
      dispatch,
    });
    await vi.advanceTimersByTimeAsync(300);

    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith("sensor.water", "tap");
    controller.clear();
    vi.useRealTimers();
  });

  it("detects double tap from two click events without native dblclick", async () => {
    vi.useFakeTimers();
    const controller = new EntityActionController();
    const dispatch = vi.fn();
    const options = {
      entityId: "sensor.water",
      hasDoubleTap: true,
      hasHold: false,
      dispatch,
    };

    controller.handleClick(clickEvent(), options);
    controller.handleClick(clickEvent(), options);
    await vi.advanceTimersByTimeAsync(300);

    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith("sensor.water", "double_tap");
    controller.clear();
    vi.useRealTimers();
  });

  it("does not suppress a later tap after a hold without follow-up click", async () => {
    vi.useFakeTimers();
    const controller = new EntityActionController();
    const dispatch = vi.fn();
    const options = {
      entityId: "sensor.water",
      hasDoubleTap: false,
      hasHold: true,
      dispatch,
    };

    controller.handlePointerDown(pointerEvent(), options);
    await vi.advanceTimersByTimeAsync(550);
    expect(dispatch).not.toHaveBeenCalled();
    controller.handlePointerEnd();
    await vi.advanceTimersByTimeAsync(400);
    controller.handleClick(clickEvent(), options);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(1, "sensor.water", "hold");
    expect(dispatch).toHaveBeenNthCalledWith(2, "sensor.water", "tap");
    controller.clear();
    vi.useRealTimers();
  });

  it("cancels a ready hold when the pointer leaves before release", async () => {
    vi.useFakeTimers();
    const controller = new EntityActionController();
    const dispatch = vi.fn();
    const options = {
      entityId: "sensor.water",
      hasDoubleTap: false,
      hasHold: true,
      dispatch,
    };

    controller.handlePointerDown(pointerEvent(), options);
    await vi.advanceTimersByTimeAsync(550);
    controller.handlePointerEnd(false);
    await vi.advanceTimersByTimeAsync(400);

    expect(dispatch).not.toHaveBeenCalled();
    controller.clear();
    vi.useRealTimers();
  });
});

function clickEvent(): MouseEvent {
  return new MouseEvent("click", { bubbles: true, composed: true });
}

function pointerEvent(): PointerEvent {
  return new MouseEvent("pointerdown", {
    bubbles: true,
    button: 0,
    composed: true,
  }) as PointerEvent;
}
