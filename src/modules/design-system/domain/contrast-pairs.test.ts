import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { COLORS, CONTRAST_PAIRS } from "./tokens";

describe("declared contrast pairs", () => {
  it.each(CONTRAST_PAIRS)(
    "$name meets $minimum:1",
    ({ foreground, background, minimum }) => {
      const ratio = contrastRatio(COLORS[foreground], COLORS[background]);
      expect(ratio).toBeGreaterThanOrEqual(minimum);
    },
  );

  it("holds text states to 4.5:1 and destination boundaries to 3:1", () => {
    for (const pair of CONTRAST_PAIRS) {
      if (pair.name.includes("border")) {
        expect(pair.minimum, pair.name).toBe(3);
      } else if (pair.name.includes("button")) {
        expect(pair.minimum, pair.name).toBe(4.5);
      }
    }
  });
});
