import { spawnSync } from "node:child_process";

// Next 16 runs Turbopack by default, and Turbopack links externalised server
// packages — @prisma/client and pg among them — into `.next/`. Creating a
// symlink on Windows needs SeCreateSymbolicLinkPrivilege, which a non-elevated
// account only holds with Developer Mode enabled; without it `next build` dies
// with `os error 1314` and `next dev` serves a 500 from any route that touches
// the database.
//
// CI and the deployment image run on Linux with Turbopack, and that is the
// shipping configuration. A plain Windows workstation falls back to webpack so
// the local gate still runs end to end. Enable Developer Mode, or set
// SHUAMO_BUNDLER=turbopack, to run the way CI does.
const command = process.argv[2];

if (command !== "dev" && command !== "build") {
  console.error(`run-next expects "dev" or "build"; received "${command}"`);
  process.exit(1);
}

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
  [command, `--${bundler}`, ...process.argv.slice(3)],
  { stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
