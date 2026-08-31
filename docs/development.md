# Development

Everything a fresh clone needs, in order, plus the record of where the Phase 0
implementation departed from its plan.

## Prerequisites

| Tool    | Version                            | Note                                                 |
| ------- | ---------------------------------- | ---------------------------------------------------- |
| Node.js | 24.x (pinned in `.nvmrc`)          | `nvm use` / `fnm use` reads the file                 |
| pnpm    | 11.21.0 (pinned in `package.json`) | activated through corepack, never installed globally |
| Docker  | with Compose v2                    | runs both PostgreSQL 17 instances                    |
| Git     | any recent version                 |                                                      |

## Clean start

```bash
node --version          # must report v24.x
corepack enable
corepack prepare pnpm@11.21.0 --activate

pnpm install            # postinstall runs `prisma generate`

cp .env.example .env
# Replace AUTH_SECRET and FINGERPRINT_SECRET with 40+ characters each.
# There is no fallback anywhere in the build; a missing secret fails the boot.
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"

pnpm db:up              # postgres-dev on 5432, postgres-test on 5433
pnpm db:migrate         # applies migrations to shuamo_dev
pnpm db:migrate:test    # applies migrations to shuamo_test

pnpm dev                # http://localhost:3000/ka
```

`/` is not a route. The locale segment owns every page, so start at `/ka` or
`/en`; anything else is a translated 404.

`pnpm install` needs the `allowBuilds` block in `pnpm-workspace.yaml`. pnpm 11
refuses to run a dependency's install scripts without it, and the Prisma engines,
esbuild, sharp, and unrs-resolver all need theirs.

## Environment variables

`.env` is git-ignored; `.env.example` is the committed template. Every key is
required and validated by `src/config/env.ts` at first use:

| Key                  | Rule                                         |
| -------------------- | -------------------------------------------- |
| `DATABASE_URL`       | `postgresql://` or `postgres://`             |
| `DATABASE_URL_TEST`  | same, and the database name must end `_test` |
| `APP_URL`            | absolute URL                                 |
| `AUTH_SECRET`        | at least 40 characters                       |
| `FINGERPRINT_SECRET` | at least 40 characters                       |
| `NODE_ENV`           | `development` \| `test` \| `production`      |

`parseServerEnv` reports every violation in one error rather than the first, so
a fresh clone learns about all its missing keys in a single run.

## Databases

Two instances, never one:

- `postgres-dev` — port 5432, database `shuamo_dev`, on a named Docker volume, so
  `pnpm db:down` keeps your working data.
- `postgres-test` — port 5433, database `shuamo_test`, on `tmpfs`, so a crashed
  run cannot leave state behind.

Integration teardown truncates every table in `public`. `requireTestDatabaseUrl`
refuses any database whose name does not end `_test`, which is what stops that
statement from ever reaching `shuamo_dev`. Prove it whenever you touch it:

```bash
DATABASE_URL_TEST=postgresql://u:p@localhost:5432/shuamo_dev pnpm test:integration
# Refusing to run integration tests against "shuamo_dev": the database name must end _test
```

Migrations are forward-only and committed. Read the generated SQL before it goes
anywhere near a shared database — `pnpm db:migrate --name <name>` writes it, and
money columns must land as `numeric(12,2)` and timestamps as `timestamptz(6)`.

## Test layers

Three disjoint file sets, three commands:

| Command                 | Files                          | Needs                        |
| ----------------------- | ------------------------------ | ---------------------------- |
| `pnpm test:unit`        | `src/**/*.test.ts(x)`          | nothing                      |
| `pnpm test:integration` | `src/**/*.integration.test.ts` | `postgres-test`, migrated    |
| `pnpm test:e2e`         | `src/test/e2e/*.spec.ts`       | a built app + `postgres-dev` |

Browsers install once per machine:

```bash
pnpm exec playwright install chromium      # add --with-deps on Linux
```

## The gate

```bash
pnpm verify:phase-0
```

which is `format:check → lint → verify:boundaries → typecheck → test:unit →
test:integration → build → test:e2e`. The chain grows one link per phase; later
phases add their own `verify:phase-N` and keep every earlier stage.

`pnpm verify:boundaries` parses every source file with the TypeScript AST and
enforces three rules:

1. a `domain/` file imports only its own `domain/` folder plus `decimal.js`
   (and `vitest` plus node builtins in a test);
2. only `infrastructure/`, `scripts/`, and `prisma/` may import Prisma;
3. one module reaches another only through its `index.ts`.

Break one deliberately before trusting it. All three were proved to exit 1 during
Phase 0.

## Deviations from the Phase 0 plan

Recorded because the plan is the contract and these are the places the code does
not match it.

### Dependency versions

**No substitutions.** Every version pinned in the plan resolved on npm and is
installed exactly as written. One package was **added**:

- `dotenv@17.2.4` (devDependency) — `prisma.config.ts`, `playwright.config.ts`,
  `src/test/integration/setup.ts`, and `scripts/run-prisma-test.ts` all
  `import "dotenv/config"`, but the plan's dependency list omitted it.

### Toolchain

- **Scaffold hand-written.** `pnpm create next-app` is interactive and refuses a
  non-empty directory non-interactively. Every file the plan lists was written by
  hand instead; the file list, not the generator, is the source of truth.
- **`pnpm-workspace.yaml` added.** pnpm 11 reads build-script approvals from
  `allowBuilds` there, not from `pnpm.onlyBuiltDependencies` in `package.json`.
- **`tsconfig.json` — `jsx` is `react-jsx`, not `preserve`,** and `include` gains
  `.next/dev/types/**/*.ts`. Next 16 rewrites both on first build and describes
  them as mandatory.
- **`postinstall: prisma generate` lands in Task 3, not Task 1.** At Task 1 there
  is no schema, so the hook would have failed the first install.
- **`.prettierignore` and the eslint `ignores` list cover the agent-tooling
  directories** (`.claude`, `.agents`, `.codex`, `.impeccable`, `.superpowers`)
  and the pre-existing prose under `docs/`. They are not application source and
  `--max-warnings=0` reports 300+ warnings from them otherwise.

### Windows: no symlink privilege

This workstation cannot create symlinks (`EPERM` / `os error 1314`); that needs
Developer Mode or an elevated shell. Two consequences, both Windows-only:

- **`output: "standalone"` is conditional** in `next.config.ts`. Its dependency
  tracer links the server bundle into `.next/standalone`. Linux — CI and the
  deployment image, where standalone output is required — is unaffected.
  `SHUAMO_STANDALONE=1` forces it on.
- **`pnpm dev` and `pnpm build` go through `scripts/run-next.mjs`,** which selects
  webpack on Windows and Turbopack everywhere else. Turbopack links externalised
  server packages (`@prisma/client`, `pg`) into `.next/`, so without the fallback
  `next build` dies after compiling and `next dev` serves a 500 from any route
  that touches the database. `SHUAMO_BUNDLER=turbopack|webpack` overrides it.

**Consequence to know about:** the local gate builds with webpack while CI builds
with Turbopack, so a Turbopack-only build failure would not be caught by a
Windows workstation. Both paths were run during Phase 0 — see the Linux run
below — but only the webpack one runs on every local `pnpm verify:phase-0` here.

### Prisma 7

- **`datasource db` in `prisma/schema.prisma` carries no `url`.** Prisma 7.9
  rejects it outright: `The datasource property 'url' is no longer supported in
schema files.` The connection string moved to `prisma.config.ts`, which reads
  `process.env.DATABASE_URL` and attaches `datasource.url` **only when it is
  set**. `prisma generate` runs from the postinstall hook, before a fresh clone
  has written `.env`, and resolving the variable eagerly there fails the very
  first `pnpm install` — the clean-clone run below is what caught it. Migration
  commands still refuse to run without it (`The datasource.url property is
required…`), so there is no default value anywhere.
- **`previewFeatures = ["driverAdapters"]` dropped.** Deprecated in Prisma 7 —
  driver adapters work without it.
- **`src/generated/` is git-ignored,** regenerated by `postinstall`, and excluded
  from prettier, eslint, and the boundary walker. The generated client imports
  `@prisma/client` on nearly every file, which boundary rule 2 would otherwise
  report once per line.

### Scripts

- **`scripts/run-prisma-test.mjs` → `scripts/run-prisma-test.ts`.** A `.mjs` file
  cannot import the `.ts` guard under plain `node`, and the guard is the point of
  the script. It runs under `tsx`, which `db:migrate:test` already used.
- **It calls `execSync("pnpm prisma migrate deploy")`** rather than `execFileSync`
  with `shell: true`; Node 24 emits `DEP0190` for the latter. The connection
  string is passed through the environment, never interpolated into the command.

### Boundary check

- **Rule 1 is stricter than the plan's text.** As written it only inspected
  imports it could not resolve internally, so the plan's own proof —
  appending `import { prisma } from "@/src/infrastructure/db/client";` to a
  domain file — would have passed. A `domain/` file may now import only from its
  own module's `domain/` folder. Both the plan's proof and a bare
  `@prisma/client` import now exit 1.
- **The walker skips** `generated`, `docs`, and the agent-tooling directories.

### Application shell

- **`app/not-found.tsx` added.** `app/layout.tsx` returns `children` bare so the
  locale segment can own `<html lang>`; anything rendered outside that segment
  therefore has to supply its own document. Without this file an unmatched route
  produces a body fragment with no `<html>` element.
- **`export const dynamicParams = false`** in `app/[locale]/layout.tsx`. With
  `notFound()` alone, `/de` returned 404 but rendered the framework's bare error
  shell. Closing the parameter list 404s before the layout runs, which puts the
  translated `app/not-found.tsx` document on the response. The `notFound()` guard
  stays.
- **`app/page.tsx` existed only during Task 1,** to give `next build` a route
  before the locale segment existed. Task 7 deleted it; the plan's file structure
  has no root page.
- **`src/modules/localization/index.ts` added.** Every module directory carries a
  public surface; the plan listed one for `shared` and forgot it for
  `localization`.
- **`src/test/integration/setup.ts` uses `Object.assign(process.env, …)`** to set
  `NODE_ENV`. `@types/node` declares it read-only, so direct assignment does not
  typecheck.

### Tests

- **`z.string().url()` → `z.url()`.** The former is deprecated in Zod 4.
- **`messages.test.ts` carries `UNTRANSLATED_BY_DESIGN = new Set(["app.name"])`,**
  exempting the product name from the Georgian-script assertion, plus one extra
  test asserting that every exempted key still exists — a stale exemption would
  otherwise silently weaken the check.
- **`Money.timesRate(rate: Rate)` does not exist.** The plan's interface list
  names it, but its own code and tests use `timesRateFraction(fraction: string)`,
  and `Rate.commissionFor` calls that. A `Money` method taking a `Rate` would make
  `money.ts` and `rate.ts` mutually dependent.
- **Config files landed one task early:** `vitest.integration.config.ts` and
  `src/test/integration/setup.ts` in Task 3, `vitest.config.ts` in Task 4. The
  plan created all of them in Task 6, which left Task 3 Step 11 and Task 4 Step 8
  unable to run their own verification.

### CI

- **`NODE_ENV` is not set at the job level.** The plan pinned it to `test`, which
  would have put `next build` and `next start` on a non-standard `NODE_ENV`.
  Vitest sets it to `test` itself, and Next sets `production` for build and start.

## Clean-clone verification

Phase 0 was verified twice from scratch. Anything you need that is not written
above is a bug in this document.

**Windows, from a fresh clone.** `git clone`, `pnpm install --frozen-lockfile`,
`cp .env.example .env` with real secrets, `pnpm db:migrate`,
`pnpm db:migrate:test`, then `pnpm verify:phase-0` — green, all eight stages. The
clone reused the containers already listening on 5432/5433; from a machine with
nothing running, `pnpm db:up` comes first. This run is what caught the
`prisma generate` / `.env` ordering bug recorded above.

**Linux, the path CI takes.** `git archive HEAD` unpacked into a `node:24`
container on the Compose network, `pnpm install --frozen-lockfile`,
`pnpm db:migrate:test`, then `format:check`, `lint`, `verify:boundaries`,
`typecheck`, `test:unit` (32), `test:integration` (2), `build`. The build ran on
**Turbopack** and emitted `.next/standalone/server.js`, which confirms both
platform conditionals resolve the way CI needs them to. `test:e2e` was not part
of this run — the container has no browsers.
