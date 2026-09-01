import { globSync, readFileSync } from "node:fs";

const sourcePatterns = [
  /\bcandidateClicks\b/,
  /\bselectCreators\b/,
  /\bdistributeShares\b/,
  /\bsplitDegraded\b/,
  /\.slice\(0,\s*3\)/,
];
const activeDocs = [
  "docs/superpowers/specs/2026-08-28-shuamo-r1-design.md",
  "docs/superpowers/plans/2026-08-29-shuamo-delivery-roadmap.md",
  "docs/superpowers/plans/2026-08-29-phase-06-conversions-api-implementation.md",
];
const docPatterns = [
  /up to 3/i,
  /at most 3/i,
  /split equally/i,
  /brand-scoped split/i,
];

const sourceFiles = globSync("src/**/*.{ts,tsx}").filter(
  (file) => !file.includes(".test."),
);
const offenders = [];
for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  if (sourcePatterns.some((pattern) => pattern.test(source))) {
    offenders.push(file);
  }
}
for (const file of activeDocs) {
  const source = readFileSync(file, "utf8");
  if (docPatterns.some((pattern) => pattern.test(source))) {
    offenders.push(file);
  }
}

if (offenders.length > 0) {
  throw new Error(
    `Stale split-attribution model remains in:\n${[...new Set(offenders)].join("\n")}`,
  );
}

console.log("Single-link attribution model is clean.");
