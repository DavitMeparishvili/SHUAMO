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
# Replace AUTH_SECRET and FINGERPRINT_SECRET with 40+ characters each. The
# template's placeholder is long enough to pass the length rule and is refused
# by name, so a copied .env fails the boot rather than running on a secret that
# is published in this repository.
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
| `AUTH_SECRET`        | 40+ chars, and not a known placeholder       |
| `FINGERPRINT_SECRET` | 40+ chars, and not a known placeholder       |
| `NODE_ENV`           | `development` \| `test` \| `production`      |

`parseServerEnv` reports every violation in one error rather than the first, so
a fresh clone learns about all its missing keys in a single run.

`NODE_ENV` is required but is **not** in `.env`. The runtime owns it: `next dev`
sets `development`, `next build` and `next start` set `production`, and vitest
sets `test`. Pinning it in `.env` put `next start` on a non-standard `NODE_ENV`,
which meant the browser suite exercised the production artifact in development
mode — and would have pointed a production server at the development database.

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

| Command                 | Files                          | Needs                                |
| ----------------------- | ------------------------------ | ------------------------------------ |
| `pnpm test:unit`        | `src/**/*.test.ts(x)`          | nothing                              |
| `pnpm test:integration` | `src/**/*.integration.test.ts` | `postgres-test`, migrated            |
| `pnpm test:e2e`         | `src/test/e2e/*.spec.ts`       | `pnpm build` first, + `postgres-dev` |

The browser layer runs against `pnpm start`, never `pnpm dev`. `verify:phase-0`
builds immediately before it, and testing the artifact that was just built is the
only version of this that says anything about a deployment — so `pnpm test:e2e`
on its own needs a `pnpm build` first.

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

1. a `domain/` file imports its own `domain/` folder, the `shared` module's
   public index, and `decimal.js` — plus `vitest`, node builtins, and
   `shared/testing` in a test, and nothing else;
2. only `infrastructure/`, `scripts/`, and `prisma/` may import Prisma;
3. **every** consumer — `app/`, `src/config/`, `src/infrastructure/`, another
   module — reaches a module only through its public surface: `<module>` or
   `<module>/testing`, the latter from test files only.

A module's public surface is `index.ts` plus, optionally, `testing/index.ts`.
`shared` has both: `@/src/modules/shared` for `Money`, `Rate`, `Clock`,
`IdGenerator`, `Result`; `@/src/modules/shared/testing` for `FakeClock` and
`FixedIdGenerator`. Production code importing the testing entry is a violation,
which is why the two surfaces are separate files.

Do not trust this checker because it prints a clean line — trust it because
`src/test/boundaries/verify-module-boundaries.test.ts` points it at a directory
of deliberately broken fixtures and asserts it complains about each one, and at
this repository and asserts it does not. Add a fixture whenever you add a rule.

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

## Hardening after the Phase 0 review

An independent review of the finished phase found defects the gate had not been
asked to catch. Each fix below carries a regression test that fails without it.

### The boundary checker had three ways through it

- **Template-literal dynamic imports were invisible.** The AST walk tested for
  `ts.isStringLiteral`, and a backtick specifier is a
  `NoSubstitutionTemplateLiteral` — a different node. ``await
import(`@prisma/client`)`` inside a `domain/` file reported clean. It now uses
  `ts.isStringLiteralLike`, handles `import x = require(…)`, and **reports** a
  dynamic import whose specifier is computed rather than skipping it: an
  unanalysable specifier is a hole through all three rules, not an exemption.
- **Any directory named `generated` was exempt,** because the walk matched bare
  entry names. `src/modules/shared/domain/generated/` was therefore free to
  import Prisma. Skips are now matched on the repository-relative path.
- **Rule 3 only constrained files already inside `src/modules/`,** so `app/`,
  `src/config/`, `src/infrastructure/` and `scripts/` could deep-import past any
  index. This was live: all five `app/` route files reached into
  `localization/config` and `localization/get-messages`, which is why
  `src/modules/localization/index.ts` had no importers at all. Rule 3 now applies
  to every consumer, and those five call sites go through the index.
- **Rule 3 counted path segments,** so the explicit `@/src/modules/shared/index`
  spelling was rejected while the bare form passed.

### Rule 1 had made the shared primitives unreachable

Tightening rule 1 so a `domain/` file may only reach its own `domain/` folder
correctly closed the plan's false negative, but it also closed the _only legal
path to `Money`_. Nothing passed: not the public index, not a deep path, not
`FakeClock` from a domain test. Phase 5's commission calculator is domain code in
a non-`shared` module and must use `Money`, so Phase 1 would have hit a wall and
the pressure would have been to weaken the gate rather than fix it.

Rule 1 now names `@/src/modules/shared` as a legal import from any `domain/`
folder, still refusing deep paths into it. `FakeClock` and `FixedIdGenerator`
were exported from nowhere at all; they now have their own public surface at
`src/modules/shared/testing/index.ts`, importable only from a test file.

### Money and Rate accepted values that were not money

- **`Money.of` took the whole JavaScript numeric-literal grammar.** `"0x1F"`
  became `31.00`, `"0b1010"` became `10.00`, `"1_000"` became `1000.00`, `"1e2"`
  became `100.00`. The only check was `typeof === "string"`, and `new Decimal()`
  parses all of it — so a malformed amount from a webhook, a CSV import, or an
  admin form became a plausible GEL figure instead of an error. Both `Money` and
  `Rate` now go through `parseDecimalText`, which accepts a plain decimal string
  and nothing else.
- **`timesRateFraction` had none of those guards,** so a JavaScript `number` cast
  to `string` reached money arithmetic — forbidden by the Global Constraints "at
  any layer" — and `"Infinity"` propagated until storage.
- **`toStorageString()` checked scale but not precision,** so
  `Money.of("99999999999999.99")` passed a guard that claims to enforce
  `numeric(12,2)` and was rejected by PostgreSQL with `22003` at insert instead.
  It now enforces ten integer digits.
- **`Rate` had no `numeric(9,4)` guard.** `Rate.percent("0.1234567")` stored
  unchanged, PostgreSQL rounded it to `0.1235`, and a commission recomputed from
  the stored rate then disagreed with the ledger by a tetri. Rate now enforces
  four decimal places and five integer digits.
- **The money property test could not fail.** Operands of five digits at two
  decimal places are exact in any representation, so it would have passed against
  a `number`-backed implementation. It is replaced by the §6.3 split invariant
  over _unrounded_ intermediates: floored shares plus remainder reconstruct the
  commission exactly, the remainder is never negative, and it is never a whole
  tetri per creator.

### Secrets and titles

- **`.env.example`'s placeholder is 45 characters and satisfied `min(40)`,** so
  `cp .env.example .env` booted a working application on a secret published in
  this repository. `parseServerEnv` now refuses the known placeholder strings —
  the template's and the two the CI workflow used to carry — unless
  `NODE_ENV=test`. CI generates its secrets per run with `openssl rand` instead
  of naming them in the workflow.
- **No page had a `<title>`,** failing WCAG 2.2 §2.4.2 (Level A, and so inside
  AA) and setting that precedent for every page after it. `app/[locale]/layout.tsx`
  now emits localised `title` and `description`, and the browser suite asserts
  both locales' titles.

### Known limitation: locale-scoped 404s

`app/[locale]/not-found.tsx` reads its locale from the router, the way
`error.tsx` does, so it is correct whenever it renders. **It never renders.**

Every `notFound()` in this application resolves to the root `app/not-found.tsx`,
which was confirmed by probing: a nested `not-found.tsx` at `app/[locale]/` is
not reached, and neither is one co-located in the throwing segment, with
`dynamicParams` either `true` or `false`. The cause is the document topology —
`app/layout.tsx` is a pass-through so that `app/[locale]/layout.tsx` can own
`<html lang>`, which forces the root not-found to carry `<html>` itself. A
`notFound()` thrown _below_ the locale layout then composes that document inside
the locale layout's own `<html>`, nests two documents, and collapses to Next's
bare `<html id="__next_error__">` shell.

Consequences today: an unmatched path such as `/en/no-such-page` answers 404 with
a valid document, but in the default locale — Georgian copy inside
`<html lang="ka">`. An attempt to fix it with a `[...rest]` catch-all made it
strictly worse (the error shell), and was reverted. The browser suite asserts the
404 is a real document and not the error shell, which is the part that would be a
regression.

**Phase 1 must resolve this** before it adds the first route under `[locale]`
that calls `notFound()`. The likely fix is to move the document into the root
layout and set `lang` from a header written by middleware, which costs the static
prerender of `/ka` and `/en` — a Phase 1 decision, not a Phase 0 patch.

### Deferred

The review recorded four further LOW findings (15–18) as acceptable to defer.
They were not restated in the hand-off to this implementation, so they are
tracked in the review record rather than reproduced here; they should be pulled
into the Phase 1 backlog verbatim from it.

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
