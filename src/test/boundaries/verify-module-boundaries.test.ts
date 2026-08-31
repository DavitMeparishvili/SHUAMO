import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findViolations } from "../../../scripts/verify-module-boundaries.mjs";

// Each fixture is a miniature repository the checker is pointed at directly.
// They exist because every one of these holes was open at some point: a checker
// that passes when the rule is broken is worse than no checker.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

const violationsIn = (name: string): string[] => findViolations(fixture(name));

describe("verify-module-boundaries", () => {
  it("passes every sanctioned import", () => {
    // A domain file reaching the shared index, a domain test reaching the
    // shared testing index, node builtins and vitest in a test, decimal.js in
    // production domain code, Prisma inside infrastructure, and an app route
    // importing a module through its index.
    expect(violationsIn("sanctioned")).toEqual([]);
  });

  it("catches a dynamic import written with a template literal", () => {
    const violations = violationsIn("template-literal-import");

    expect(violations).toHaveLength(3);
    expect(violations.join("\n")).toMatch(
      /domain may not import "@\/src\/infrastructure\/db\/client"/,
    );
    expect(violations.join("\n")).toMatch(
      /domain may not import "@prisma\/client"/,
    );
    expect(violations.join("\n")).toMatch(
      /only infrastructure\/ may import Prisma/,
    );
  });

  it("refuses a dynamic import whose specifier is computed", () => {
    expect(violationsIn("computed-import").join("\n")).toMatch(
      /computed specifier cannot be checked/,
    );
  });

  it("catches import-equals-require", () => {
    expect(violationsIn("import-equals").join("\n")).toMatch(
      /only infrastructure\/ may import Prisma \("@prisma\/client"\)/,
    );
  });

  it("does not exempt a directory merely named generated", () => {
    expect(violationsIn("nested-generated").join("\n")).toMatch(
      /only infrastructure\/ may import Prisma/,
    );
  });

  it("catches a domain file reaching past another module's index", () => {
    const violations = violationsIn("deep-cross-module").join("\n");

    expect(violations).toMatch(/domain may not import/);
    expect(violations).toMatch(/reaches inside module "shared"; use its index/);
  });

  it("catches a consumer outside src/modules reaching past an index", () => {
    expect(violationsIn("consumer-deep-import").join("\n")).toMatch(
      /reaches inside module "localization"; use its index/,
    );
  });

  it("keeps test doubles out of production code", () => {
    expect(violationsIn("testing-outside-test").join("\n")).toMatch(
      /pulls test doubles into production code/,
    );
  });

  it("reports the repository itself as clean", () => {
    const root = fileURLToPath(new URL("../../..", import.meta.url));
    expect(findViolations(root)).toEqual([]);
  });
});
