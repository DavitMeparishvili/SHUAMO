import { describe, expect, it } from "vitest";
import { COLORS, CONTRAST_PAIRS, RADIUS, TYPE_SCALE } from "./tokens";

describe("tokens", () => {
  it("declares every colour as a parseable value", () => {
    for (const [name, value] of Object.entries(COLORS)) {
      expect(value, name).toMatch(/^(#[0-9A-Fa-f]{6}|rgb\(.+\))$/);
    }
  });

  it("sets tabular numerals on every mono style", () => {
    for (const [name, style] of Object.entries(TYPE_SCALE)) {
      if (!style.fontFamily.startsWith("Geist Mono")) continue;
      expect(
        "fontVariantNumeric" in style ? style.fontVariantNumeric : undefined,
        name,
      ).toBe("tabular-nums");
    }
  });

  it("names Noto Sans Georgian in every text stack", () => {
    for (const [name, style] of Object.entries(TYPE_SCALE)) {
      if (style.fontFamily.startsWith("Geist Mono")) continue;
      expect(style.fontFamily, name).toContain("Noto Sans Georgian");
    }
  });

  it("covers every interactive surface with a contrast pair", () => {
    const named = CONTRAST_PAIRS.map((pair) => pair.name);
    for (const required of [
      "signal button rest",
      "signal button hover",
      "signal button active",
      "outline button rest",
      "body text on paper",
      "muted text on paper",
      "accrued pill",
      "settled pill",
      "reversed pill",
      "utility strip",
    ]) {
      expect(named).toContain(required);
    }
  });

  it("keeps the radius ramp to five steps", () => {
    expect(Object.keys(RADIUS)).toEqual(["xs", "sm", "md", "lg", "pill"]);
  });
});
