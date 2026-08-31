import { spawnSync } from "node:child_process";

// Next 16 builds with Turbopack by default, and Turbopack's build tracer links
// externalised server packages — @prisma/client among them — into `.next/`.
// Creating a symlink on Windows needs SeCreateSymbolicLinkPrivilege, which a
// non-elevated account only has with Developer Mode enabled; without it the
// build dies with `os error 1314` after compiling cleanly.
//
// CI and the deployment image build on Linux with Turbopack, and that is the
// shipping configuration. A plain Windows workstation falls back to webpack so
// that `pnpm verify:phase-0` still runs end to end locally. Enable Developer
// Mode, or set SHUAMO_BUNDLER=turbopack, to build the way CI does.
const override = process.env.SHUAMO_BUNDLER;
const bundler =
  override ?? (process.platform === "win32" ? "webpack" : "turbopack");

if (bundler !== "webpack" && bundler !== "turbopack") {
  console.error(
    `SHUAMO_BUNDLER must be "turbopack" or "webpack"; received "${bundler}"`,
  );
  process.exit(1);
}

const result = spawnSync(
  "next",
  ["build", bundler === "webpack" ? "--webpack" : "--turbopack"],
  { stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
