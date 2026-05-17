import { nothing } from "lit";
import { describe, expect, it } from "vitest";
import { isVisibleRenderable } from "../src/rendering";
import type { Renderable } from "../src/types";

describe("isVisibleRenderable", () => {
  it("filters Lit nothing explicitly", () => {
    expect(isVisibleRenderable(nothing)).toBe(false);
    expect(([nothing] as Renderable[]).filter(isVisibleRenderable)).toHaveLength(0);
  });
});
