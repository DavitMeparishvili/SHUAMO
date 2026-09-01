import { describe, expect, it } from "vitest";
import { DEDUP_WINDOW_MS, decideCreditability } from "./creditability";

const now = new Date("2026-08-12T12:00:00Z");
const ago = (milliseconds: number) => new Date(now.getTime() - milliseconds);

describe("decideCreditability", () => {
  it("credits a first click", () => {
    expect(decideCreditability({ priorClickAt: undefined, now })).toBe(true);
  });

  it("does not credit a repeat inside the 30-minute window", () => {
    expect(
      decideCreditability({ priorClickAt: ago(29 * 60_000 + 59_000), now }),
    ).toBe(false);
  });

  it("credits at and beyond the boundary", () => {
    expect(
      decideCreditability({ priorClickAt: ago(DEDUP_WINDOW_MS), now }),
    ).toBe(true);
    expect(
      decideCreditability({ priorClickAt: ago(DEDUP_WINDOW_MS + 1), now }),
    ).toBe(true);
  });

  it("defines the window as exactly thirty minutes", () => {
    expect(DEDUP_WINDOW_MS).toBe(1_800_000);
  });
});
