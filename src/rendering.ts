import { nothing } from "lit";
import type { Renderable } from "./types";

export function isVisibleRenderable(value: Renderable): boolean {
  return value !== nothing && value !== null && value !== undefined && value !== "";
}
