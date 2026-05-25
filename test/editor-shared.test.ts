import { describe, expect, it } from "vitest";
import {
  checkedFromEvent,
  inputStringFromEvent,
  pickerValueFromEvent,
  textInputValue,
  textValueFromEvent,
} from "../src/editor-shared";

describe("editor-shared helpers", () => {
  it("reads checked state from event source", () => {
    const event = { currentTarget: { checked: true } } as unknown as Event;
    expect(checkedFromEvent(event)).toBe(true);
  });

  it("reads string input values from target", () => {
    const event = { target: { value: "hello" } } as unknown as Event;
    expect(inputStringFromEvent(event)).toBe("hello");
  });

  it("prefers detail.value for text values", () => {
    const event = new CustomEvent("value-changed", {
      detail: { value: "from-detail" },
    });
    expect(textValueFromEvent(event)).toBe("from-detail");
  });

  it("falls back to target value for text values", () => {
    const event = { target: { value: "from-target" } } as unknown as Event;
    expect(textValueFromEvent(event)).toBe("from-target");
  });

  it("extracts picker values from detail fields", () => {
    expect(
      pickerValueFromEvent(
        new CustomEvent("value-changed", { detail: { value: "entity.from_value" } }),
      ),
    ).toBe("entity.from_value");
    expect(
      pickerValueFromEvent(
        new CustomEvent("value-changed", { detail: { device_id: "device.from_snake" } }),
      ),
    ).toBe("device.from_snake");
    expect(
      pickerValueFromEvent(
        new CustomEvent("value-changed", { detail: { deviceId: "device.from_camel" } }),
      ),
    ).toBe("device.from_camel");
  });

  it("falls back to target value for picker values", () => {
    const event = { target: { value: "entity.from_target" } } as unknown as Event;
    expect(pickerValueFromEvent(event)).toBe("entity.from_target");
  });

  it("normalizes text input values", () => {
    expect(textInputValue("custom-name")).toBe("custom-name");
    expect(textInputValue(12)).toBe("");
  });
});
