import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("fingerprint containment", () => {
  it("never references fpHash outside the tracking module", () => {
    const offenders = globSync("src/modules/**/*.ts")
      .filter(
        (file) => !file.replaceAll("\\", "/").includes("src/modules/tracking/"),
      )
      .filter((file) => /fp_?[Hh]ash/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("has no application logging call on the redirect path", () => {
    const productionFiles = [
      ...globSync("src/modules/tracking/**/*.ts"),
      ...globSync("app/r/**/*.ts"),
    ].filter((file) => !file.endsWith(".test.ts"));
    const loggingFiles = productionFiles.filter((file) =>
      /\b(?:console|logger)\s*\./.test(readFileSync(file, "utf8")),
    );

    // With no logger on this path, raw request IP and User-Agent cannot enter
    // an application log line. Response-trace and stored-column tests cover
    // the other two observable surfaces.
    expect(loggingFiles).toEqual([]);
  });
});
