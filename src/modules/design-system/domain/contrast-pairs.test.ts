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
});
