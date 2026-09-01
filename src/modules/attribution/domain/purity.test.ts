import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const forbidden = [
  /@prisma|PrismaClient/,
  /\bfetch\s*\(/,
  /Date\.now\s*\(/,
  /new Date\s*\(\s*\)/,
  /node:crypto/,
  /Math\.random\s*\(/,
  /fp_?[Hh]ash/,
  /visitor(?:Id|Cookie)/i,
  /creditable/,
];

describe("attribution domain purity", () => {
  it("ATTR-010 contains no I/O, ambient time, randomness, or visitor attribution inputs", () => {
    const productionFiles = globSync(
      "src/modules/attribution/domain/*.{ts,tsx}",
    ).filter((file) => !file.includes(".test."));
    const offenders = productionFiles.filter((file) => {
      const source = readFileSync(file, "utf8");
      return forbidden.some((pattern) => pattern.test(source));
    });

    expect(offenders).toEqual([]);
  });
});
