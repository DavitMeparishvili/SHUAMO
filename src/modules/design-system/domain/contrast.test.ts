import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 2);
  });

  it("returns 1 for a colour against itself", () => {
    expect(contrastRatio("#4436F5", "#4436F5")).toBeCloseTo(1, 4);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#4436F5", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#4436F5"),
      6,
    );
  });

  it("matches the published ratio for a known pair", () => {
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });

  it("rejects formats outside #RRGGBB", () => {
    expect(() => contrastRatio("white", "#000000")).toThrow(TypeError);
  });
});
