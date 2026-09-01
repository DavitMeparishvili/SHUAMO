# Phase 0 — Engineering Foundation Implementation Plan

> **Historical plan:** Phase 0 was implemented before the single-link
> attribution correction. Split-only money primitives and test examples in this
> completed plan are superseded by
> `2026-09-01-single-link-attribution-correction-implementation.md`, Tasks 6–8.
> Do not recreate them.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployable empty SHUAMO with enforced architecture boundaries, exact-decimal money primitives, and three working test loops.

**Architecture:** Next.js 16 App Router over a vertical-slice module tree under `src/modules/*`. Domain code is framework-free and I/O-free; Prisma exists only behind `src/infrastructure/db` and module `infrastructure/` folders. Nothing in this phase knows what a click or a commission is — it builds the floor the rest of the program stands on.

**Tech Stack:** Node.js 24 LTS · pnpm · Next.js 16 · React 19 · TypeScript strict · PostgreSQL 17 · Prisma 7 (`@prisma/adapter-pg`) · Zod 4 · Tailwind CSS 4 · Vitest 4 · Playwright · decimal.js · Docker Compose.

**Spec:** `docs/superpowers/specs/2026-08-28-shuamo-r1-design.md` (§4.5 money is numeric; §11 deployment) and `docs/superpowers/plans/2026-08-29-shuamo-delivery-roadmap.md`.

## Global Constraints

Inherited verbatim from the roadmap's Global Constraints section. The ones this phase actually exercises:

- Money is `numeric(12,2)` in PostgreSQL and an exact decimal in TypeScript. **Never a JavaScript `number` for money, at any layer, including test fixtures.** Rates are `numeric(9,4)`.
- Time is `timestamptz`, stored and compared in UTC.
- `domain/` folders import no framework, no ORM, no provider SDK, and perform no I/O.
- Cross-module imports go through the target module's `index.ts`.
- Local development and test use separate databases `shuamo_dev` and `shuamo_test`. Integration teardown refuses a database whose name does not end `_test`.
- Secrets have no fallback values anywhere in the build.
- Locales are `ka` and `en`, both complete.
- WCAG 2.2 AA.
- Each task ends in a commit.

---

## Planned file structure

```
.nvmrc                                   node 24 pin
package.json                             pinned deps, verify chain
tsconfig.json                            strict, @/* path alias
eslint.config.mjs  .prettierrc.json  .prettierignore
next.config.ts                           standalone output
postcss.config.mjs                       tailwind 4
compose.yaml                             postgres-dev + postgres-test
prisma.config.ts                         prisma 7 config
prisma/schema.prisma                     phase-0 schema: health_probe only
prisma/migrations/                       committed, forward-only
scripts/verify-module-boundaries.mjs     AST boundary check
scripts/run-prisma-test.mjs              migrate the test database
src/config/env.ts                        Zod server env contract
src/config/env.test.ts
src/config/test-database-url.ts          the _test guard
src/config/test-database-url.test.ts
src/infrastructure/db/client.ts          the only PrismaClient in the app
src/infrastructure/db/readiness.ts       readiness probe query
src/infrastructure/db/readiness.integration.test.ts
src/modules/shared/domain/money.ts       exact decimal money
src/modules/shared/domain/money.test.ts
src/modules/shared/domain/rate.ts        PERCENT fraction / FIXED per unit
src/modules/shared/domain/rate.test.ts
src/modules/shared/domain/clock.ts       Clock port
src/modules/shared/domain/id-generator.ts
src/modules/shared/domain/result.ts      Result<T, E>
src/modules/shared/testing/fake-clock.ts
src/modules/shared/testing/fixed-id-generator.ts
src/modules/shared/index.ts              the module's public surface
src/modules/localization/config.ts       locale list + validation
src/modules/localization/config.test.ts
src/modules/localization/get-messages.ts
src/modules/localization/messages.test.ts
src/modules/localization/messages/en.json
src/modules/localization/messages/ka.json
app/layout.tsx                           html shell, fonts
app/[locale]/layout.tsx                  landmarks, lang attribute
app/[locale]/page.tsx                    placeholder landing
app/[locale]/error.tsx  app/[locale]/not-found.tsx
app/globals.css
app/api/health/live/route.ts             no dependencies
app/api/health/ready/route.ts            depends on PostgreSQL
src/test/integration/setup.ts            guarded truncation
src/test/e2e/foundation.spec.ts          untagged, runs in every phase
vitest.config.ts  vitest.integration.config.ts  playwright.config.ts
.github/workflows/ci.yml
docs/development.md
```

Each module directory that exists after this phase contains only `domain/`, `testing/`, and `index.ts`. The `application/`, `ports/`, `infrastructure/`, `http/`, and `ui/` folders are created by the phase that first needs them, so an empty folder never implies a missing implementation.

---

### Task 1: Pin the toolchain and scaffold the application

**Files:**

- Create: `.nvmrc`, `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `postcss.config.mjs`
- Create: `app/layout.tsx`, `app/globals.css`

**Interfaces:**

- Consumes: nothing
- Produces: the `@/*` path alias resolving to the repository root; `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`

- [ ] **Step 1: Record the runtime and initialise the package**

```bash
node --version                    # must report v24.x
echo "24" > .nvmrc
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

- [ ] **Step 2: Scaffold Next.js into the existing checkout**

The repository already contains `docs/`, `CLAUDE.md`, and `AGENTS.md`. Scaffold in place, keeping them:

```bash
pnpm create next-app@16 . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm
```

Answer "yes" to proceeding in a non-empty directory. If the generator refuses, scaffold into `.scaffold/` and move `app/`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `package.json`, and `tsconfig.json` up one level.

- [ ] **Step 3: Pin every dependency to an exact version**

Ranges are forbidden — a lockfile is not a substitute for a pin when a subagent may regenerate it. Edit `package.json` so no version string carries `^` or `~`:

```json
{
  "name": "shuamo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.21.0",
  "engines": { "node": ">=24 <25" },
  "dependencies": {
    "@prisma/adapter-pg": "7.9.1",
    "@prisma/client": "7.9.1",
    "decimal.js": "10.6.0",
    "next": "16.1.0",
    "pg": "8.23.0",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@playwright/test": "1.62.1",
    "@tailwindcss/postcss": "4.3.3",
    "@types/node": "24.10.1",
    "@types/pg": "8.21.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "@vitest/coverage-v8": "4.1.10",
    "eslint": "9.39.5",
    "eslint-config-next": "16.1.0",
    "prettier": "3.9.6",
    "prisma": "7.9.1",
    "tailwindcss": "4.3.3",
    "tsx": "4.23.12",
    "typescript": "5.9.3",
    "vitest": "4.1.10"
  }
}
```

If a pinned version does not resolve, take the closest published version of the same major and record the substitution in `docs/development.md`. Do not widen to a range.

- [ ] **Step 4: Tighten TypeScript**

`tsconfig.json` — the four options beyond `strict` that this codebase depends on:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "target": "ES2023",
    "lib": ["dom", "dom.iterable", "ES2023"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`noUncheckedIndexedAccess` is load-bearing: the calculator in Phase 5 indexes into a creator array whose length is `1..3`, and this option is what forces the undefined case to be handled instead of assumed.

- [ ] **Step 5: Configure the scripts**

Add to `package.json`. The verify chain grows one line per phase; this is its first link:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "format:check": "prettier --check .",
    "verify:boundaries": "node scripts/verify-module-boundaries.mjs",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "db:up": "docker compose up -d --wait postgres-dev postgres-test",
    "db:down": "docker compose down",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:migrate:test": "tsx scripts/run-prisma-test.mjs",
    "verify:phase-0": "pnpm format:check && pnpm lint && pnpm verify:boundaries && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm build && pnpm test:e2e --grep-invert \"@phase-\""
  }
}
```

- [ ] **Step 6: Set standalone output**

`next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 7: Verify the scaffold**

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all four succeed. `pnpm build` prints `.next/standalone` in its output.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 with a pinned toolchain"
```

---

### Task 2: Make the environment contract fail loudly

**Files:**

- Create: `src/config/env.ts`, `src/config/env.test.ts`
- Create: `.env.example`
- Modify: `.gitignore` (ensure `.env` is ignored, `.env.example` is not)

**Interfaces:**

- Consumes: nothing
- Produces:
  - `type ServerEnv = { DATABASE_URL: string; DATABASE_URL_TEST: string; APP_URL: string; AUTH_SECRET: string; FINGERPRINT_SECRET: string; NODE_ENV: "development" | "test" | "production" }`
  - `parseServerEnv(source: Record<string, string | undefined>): ServerEnv` — throws `EnvironmentError` listing every missing or invalid key at once
  - `serverEnv(): ServerEnv` — memoised `parseServerEnv(process.env)`

- [ ] **Step 1: Write the failing test**

`src/config/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

const valid = {
  DATABASE_URL: "postgresql://shuamo:pw@localhost:5432/shuamo_dev",
  DATABASE_URL_TEST: "postgresql://shuamo:pw@localhost:5433/shuamo_test",
  APP_URL: "https://xu.ge",
  AUTH_SECRET: "0123456789012345678901234567890123456789",
  FINGERPRINT_SECRET: "9876543210987654321098765432109876543210",
  NODE_ENV: "test",
};

describe("parseServerEnv", () => {
  it("accepts a complete environment", () => {
    expect(parseServerEnv(valid).APP_URL).toBe("https://xu.ge");
  });

  it("reports every missing key in one error, not just the first", () => {
    const call = () =>
      parseServerEnv({ NODE_ENV: "test" } as Record<string, string>);

    expect(call).toThrowError(/DATABASE_URL/);
    expect(call).toThrowError(/AUTH_SECRET/);
    expect(call).toThrowError(/FINGERPRINT_SECRET/);
  });

  it("rejects a short secret rather than padding it", () => {
    expect(() => parseServerEnv({ ...valid, AUTH_SECRET: "tooshort" }))
      .toThrowError(/AUTH_SECRET/);
  });

  it("rejects a non-postgres database url", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "mysql://x/y" }))
      .toThrowError(/DATABASE_URL/);
  });

  it("supplies no default for any secret", () => {
    for (const key of ["AUTH_SECRET", "FINGERPRINT_SECRET", "DATABASE_URL"]) {
      const incomplete = { ...valid };
      delete (incomplete as Record<string, unknown>)[key];
      expect(() => parseServerEnv(incomplete)).toThrowError(
        new RegExp(key),
      );
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm vitest run src/config/env.test.ts
```

Expected: FAIL — `Failed to resolve import "./env"`.

- [ ] **Step 3: Implement the contract**

`src/config/env.ts`:

```ts
import { z } from "zod";

const postgresUrl = z
  .string()
  .refine((value) => value.startsWith("postgresql://") || value.startsWith("postgres://"), {
    message: "must be a postgresql:// connection string",
  });

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  DATABASE_URL_TEST: postgresUrl,
  APP_URL: z.string().url(),
  // 40 characters is not arbitrary: it is the shortest length at which a
  // hex-encoded secret carries 160 bits, and a shorter value here would
  // silently weaken the fingerprint salt in §6.1.
  AUTH_SECRET: z.string().min(40),
  FINGERPRINT_SECRET: z.string().min(40),
  NODE_ENV: z.enum(["development", "test", "production"]),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvironmentError extends Error {
  constructor(issues: readonly string[]) {
    super(`Invalid server environment:\n  ${issues.join("\n  ")}`);
    this.name = "EnvironmentError";
  }
}

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const parsed = serverEnvSchema.safeParse(source);

  if (!parsed.success) {
    throw new EnvironmentError(
      parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
  }

  return parsed.data;
}

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
```

There is no `?? "default"` anywhere in this file, and there never will be. A build that cannot see its secrets must fail, not start with a placeholder.

- [ ] **Step 4: Write `.env.example`**

```bash
DATABASE_URL=postgresql://shuamo_local:shuamo_local_only@localhost:5432/shuamo_dev
DATABASE_URL_TEST=postgresql://shuamo_test:shuamo_test_local_only@localhost:5433/shuamo_test
APP_URL=http://localhost:3000
AUTH_SECRET=replace-with-40-plus-characters-of-random-hex
FINGERPRINT_SECRET=replace-with-40-plus-characters-of-random-hex
NODE_ENV=development
```

- [ ] **Step 5: Run the tests**

```bash
pnpm vitest run src/config/env.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/config .env.example .gitignore
git commit -m "feat: validate the server environment with no secret defaults"
```

---

### Task 3: Bring up PostgreSQL and prove migrations

**Files:**

- Create: `compose.yaml`, `prisma.config.ts`, `prisma/schema.prisma`, `scripts/run-prisma-test.mjs`
- Create: `src/config/test-database-url.ts`, `src/config/test-database-url.test.ts`
- Create: `src/infrastructure/db/client.ts`, `src/infrastructure/db/readiness.ts`, `src/infrastructure/db/readiness.integration.test.ts`
- Create: `app/api/health/live/route.ts`, `app/api/health/ready/route.ts`

**Interfaces:**

- Consumes: `serverEnv()` from Task 2
- Produces:
  - `prisma` — the single `PrismaClient` instance, importable only from `infrastructure/`
  - `checkDatabaseReadiness(): Promise<{ ok: true } | { ok: false; reason: string }>`
  - `requireTestDatabaseUrl(source): string` — throws unless the database name ends `_test`

- [ ] **Step 1: Define the two database services**

`compose.yaml`. `postgres-test` is on `tmpfs` so a crashed run cannot leave state behind:

```yaml
services:
  postgres-dev:
    image: postgres:17
    environment:
      POSTGRES_DB: shuamo_dev
      POSTGRES_USER: shuamo_local
      POSTGRES_PASSWORD: shuamo_local_only
    ports:
      - "5432:5432"
    volumes:
      - shuamo_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shuamo_local -d shuamo_dev"]
      interval: 2s
      timeout: 3s
      retries: 20

  postgres-test:
    image: postgres:17
    environment:
      POSTGRES_DB: shuamo_test
      POSTGRES_USER: shuamo_test
      POSTGRES_PASSWORD: shuamo_test_local_only
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shuamo_test -d shuamo_test"]
      interval: 2s
      timeout: 3s
      retries: 20

volumes:
  shuamo_dev_data:
```

```bash
pnpm db:up
docker compose ps       # both services healthy
```

- [ ] **Step 2: Write the failing test-database guard test**

`src/config/test-database-url.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { requireTestDatabaseUrl } from "./test-database-url";

describe("requireTestDatabaseUrl", () => {
  it("accepts a database whose name ends _test", () => {
    expect(
      requireTestDatabaseUrl({
        DATABASE_URL_TEST: "postgresql://u:p@localhost:5433/shuamo_test",
      }),
    ).toBe("postgresql://u:p@localhost:5433/shuamo_test");
  });

  it("refuses the development database", () => {
    expect(() =>
      requireTestDatabaseUrl({
        DATABASE_URL_TEST: "postgresql://u:p@localhost:5432/shuamo_dev",
      }),
    ).toThrowError(/_test/);
  });

  it("refuses a name that merely contains test", () => {
    expect(() =>
      requireTestDatabaseUrl({
        DATABASE_URL_TEST: "postgresql://u:p@localhost:5432/test_shuamo",
      }),
    ).toThrowError(/_test/);
  });

  it("refuses an absent value", () => {
    expect(() => requireTestDatabaseUrl({})).toThrowError(/DATABASE_URL_TEST/);
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

```bash
pnpm vitest run src/config/test-database-url.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement the guard**

`src/config/test-database-url.ts`:

```ts
// Integration teardown truncates every table. This is the only thing standing
// between that statement and a developer's working data.
export function requireTestDatabaseUrl(
  source: Record<string, string | undefined>,
): string {
  const url = source.DATABASE_URL_TEST;

  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL_TEST is required to run integration tests");
  }

  const databaseName = new URL(url).pathname.replace(/^\//, "");

  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to run integration tests against "${databaseName}": the database name must end _test`,
    );
  }

  return url;
}
```

- [ ] **Step 5: Configure Prisma and the phase-0 schema**

`prisma.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
});
```

`prisma/schema.prisma` — one table, whose only job is to prove that a migration applies and a row round-trips:

```prisma
generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

/// Exists so Phase 0 can prove migration and round-trip without inventing a
/// domain table. Later phases keep it: /api/health/ready reads it.
model HealthProbe {
  id        String   @id @default(uuid()) @db.Uuid
  observedAt DateTime @default(now()) @map("observed_at") @db.Timestamptz(6)

  @@map("health_probe")
}
```

- [ ] **Step 6: Write the failing readiness integration test**

`src/infrastructure/db/readiness.integration.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "./client";
import { checkDatabaseReadiness } from "./readiness";

describe("database readiness", () => {
  it("reports ok against a migrated database", async () => {
    await expect(checkDatabaseReadiness()).resolves.toEqual({ ok: true });
  });

  it("round-trips a row with a timestamptz default", async () => {
    const created = await prisma.healthProbe.create({ data: {} });
    const read = await prisma.healthProbe.findUniqueOrThrow({
      where: { id: created.id },
    });

    expect(read.observedAt).toBeInstanceOf(Date);
    expect(read.observedAt.getTime()).toBe(created.observedAt.getTime());
  });
});
```

- [ ] **Step 7: Implement the client and the probe**

`src/infrastructure/db/client.ts`:

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/src/generated/prisma/client";
import { serverEnv } from "@/src/config/env";

// One client per process. Next's dev server re-evaluates modules on every
// change, which without this global would open a new pool each time.
const globalForPrisma = globalThis as unknown as {
  shuamoPrisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const env = serverEnv();
  const connectionString =
    env.NODE_ENV === "test" ? env.DATABASE_URL_TEST : env.DATABASE_URL;

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma: PrismaClient = globalForPrisma.shuamoPrisma ?? createClient();

if (serverEnv().NODE_ENV !== "production") {
  globalForPrisma.shuamoPrisma = prisma;
}
```

`src/infrastructure/db/readiness.ts`:

```ts
import { prisma } from "./client";

export type Readiness = { ok: true } | { ok: false; reason: string };

export async function checkDatabaseReadiness(): Promise<Readiness> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      // The message is deliberately not echoed: a connection string with
      // credentials in it must never reach an unauthenticated endpoint.
      reason: error instanceof Error ? "database_unavailable" : "unknown",
    };
  }
}
```

- [ ] **Step 8: Add the two health routes**

`app/api/health/live/route.ts` — deliberately free of every dependency, because an uptime ping that fails when PostgreSQL blips tells you nothing new:

```ts
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({ status: "ok" });
}
```

`app/api/health/ready/route.ts`:

```ts
import { checkDatabaseReadiness } from "@/src/infrastructure/db/readiness";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const readiness = await checkDatabaseReadiness();

  if (!readiness.ok) {
    return Response.json(
      { status: "unavailable", reason: readiness.reason },
      { status: 503 },
    );
  }

  return Response.json({ status: "ok" });
}
```

- [ ] **Step 9: Write the test-database migration runner**

`scripts/run-prisma-test.mjs`:

```js
import { execFileSync } from "node:child_process";
import "dotenv/config";
import { requireTestDatabaseUrl } from "../src/config/test-database-url.ts";

const databaseUrl = requireTestDatabaseUrl(process.env);

execFileSync("pnpm", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
  shell: process.platform === "win32",
});
```

- [ ] **Step 10: Generate the migration and diff it**

```bash
pnpm db:migrate --name phase_0_health_probe
pnpm db:migrate:test
cat prisma/migrations/*_phase_0_health_probe/migration.sql
```

Read the generated SQL. `health_probe.observed_at` must be `timestamptz(6)`, not `timestamp`. If it is not, fix the schema and regenerate — do not hand-edit the migration. This diff-before-apply habit is the one that matters when the R1 Appendix A tables arrive.

- [ ] **Step 11: Run the integration test**

```bash
pnpm test:integration
```

Expected: PASS, 2 tests.

- [ ] **Step 12: Commit**

```bash
git add compose.yaml prisma prisma.config.ts scripts src/config src/infrastructure app/api
git commit -m "feat: run PostgreSQL 17 with migrations and a guarded test database"
```

---

### Task 4: Build exact-decimal money and rate primitives

**Files:**

- Create: `src/modules/shared/domain/money.ts`, `src/modules/shared/domain/money.test.ts`
- Create: `src/modules/shared/domain/rate.ts`, `src/modules/shared/domain/rate.test.ts`
- Create: `src/modules/shared/domain/clock.ts`, `src/modules/shared/domain/id-generator.ts`, `src/modules/shared/domain/result.ts`
- Create: `src/modules/shared/testing/fake-clock.ts`, `src/modules/shared/testing/fixed-id-generator.ts`
- Create: `src/modules/shared/index.ts`

**Interfaces:**

- Consumes: `decimal.js` only — the single package `domain/` is permitted to import
- Produces, and every later phase depends on these exact names:
  - `Money.of(value: string): Money` · `Money.ZERO` · `plus` · `minus` · `times(count: number)` · `timesRate(rate: Rate)` · `dividedByInteger(n: number)` · `roundToTetri()` · `floorToTetri()` · `negated()` · `compare(other): -1 | 0 | 1` · `equals(other)` · `isNegative()` · `isZero()` · `toString()` · `toStorageString()`
  - `Rate.percent(fraction: string): Rate` · `Rate.fixed(perUnit: string): Rate` · `rate.kind: "PERCENT" | "FIXED"` · `rate.commissionFor(net: Money, qty: number): Money`
  - `interface Clock { now(): Date }` · `interface IdGenerator { uuid(): string; clickId(): string }`
  - `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`
  - `FakeClock(startingAt: Date)` with `advanceBy(ms)` · `FixedIdGenerator(seed: string)`

- [ ] **Step 1: Write the failing money tests**

`src/modules/shared/domain/money.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Money } from "./money";

describe("Money", () => {
  it("parses and renders exactly two decimal places", () => {
    expect(Money.of("250").toStorageString()).toBe("250.00");
    expect(Money.of("250.5").toStorageString()).toBe("250.50");
    expect(Money.of("0").toStorageString()).toBe("0.00");
  });

  it("does not suffer binary floating point error", () => {
    expect(Money.of("0.1").plus(Money.of("0.2")).toStorageString()).toBe("0.30");
  });

  it("keeps full precision through an unrounded multiplication", () => {
    // 190.68 x 0.12 = 22.8816 — the intermediate must not be truncated
    // before §6.3 rounds it.
    expect(Money.of("190.68").timesRateFraction("0.12").toString()).toBe("22.8816");
  });

  it("rounds half up to the tetri", () => {
    expect(Money.of("22.885").roundToTetri().toStorageString()).toBe("22.89");
    expect(Money.of("22.884").roundToTetri().toStorageString()).toBe("22.88");
  });

  it("floors toward zero for share splitting", () => {
    // 22.88 / 2 = 11.44 exactly; 10.00 / 3 = 3.3333... floors to 3.33
    expect(Money.of("10.00").dividedByInteger(3).floorToTetri().toStorageString())
      .toBe("3.33");
  });

  it("refuses to store a value that is not exact at two decimal places", () => {
    expect(() => Money.of("22.8816").toStorageString()).toThrowError(/tetri/);
  });

  it("compares without coercing to a number", () => {
    expect(Money.of("11.44").compare(Money.of("11.45"))).toBe(-1);
    expect(Money.of("11.44").equals(Money.of("11.440"))).toBe(true);
  });

  it("carries a sign for reversals", () => {
    expect(Money.of("11.44").negated().toStorageString()).toBe("-11.44");
    expect(Money.of("-11.44").isNegative()).toBe(true);
  });

  it("rejects a JavaScript number at the constructor", () => {
    // @ts-expect-error a number must never reach Money
    expect(() => Money.of(250.5)).toThrowError(/string/);
  });

  it("is associative over addition for random tetri amounts", () => {
    for (let i = 0; i < 500; i += 1) {
      const pick = () =>
        Money.of(`${Math.floor(Math.random() * 100000)}.${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`);
      const [a, b, c] = [pick(), pick(), pick()];

      expect(a.plus(b).plus(c).toStorageString()).toBe(
        a.plus(b.plus(c)).toStorageString(),
      );
    }
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm vitest run src/modules/shared/domain/money.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Money**

`src/modules/shared/domain/money.ts`:

```ts
import Decimal from "decimal.js";

// 28 significant digits: comfortably above numeric(12,2) with room for the
// unrounded intermediates in §6.3.
Decimal.set({ precision: 28, toExpNeg: -18, toExpPos: 21 });

const TETRI = 2;

export class Money {
  static readonly ZERO = new Money(new Decimal(0));

  private constructor(private readonly value: Decimal) {}

  static of(value: string): Money {
    if (typeof value !== "string") {
      throw new TypeError("Money.of takes a string; a number cannot hold GEL exactly");
    }
    const parsed = new Decimal(value);
    if (!parsed.isFinite()) {
      throw new RangeError(`Money.of received a non-finite value: ${value}`);
    }
    return new Money(parsed);
  }

  plus(other: Money): Money {
    return new Money(this.value.plus(other.value));
  }

  minus(other: Money): Money {
    return new Money(this.value.minus(other.value));
  }

  /** Multiply by a whole count, such as a line quantity. */
  times(count: number): Money {
    if (!Number.isInteger(count)) {
      throw new TypeError("Money.times takes an integer count");
    }
    return new Money(this.value.times(count));
  }

  /** Multiply by a decimal fraction supplied as a string. Never rounds. */
  timesRateFraction(fraction: string): Money {
    return new Money(this.value.times(new Decimal(fraction)));
  }

  dividedByInteger(divisor: number): Money {
    if (!Number.isInteger(divisor) || divisor === 0) {
      throw new RangeError("Money.dividedByInteger takes a non-zero integer");
    }
    return new Money(this.value.dividedBy(divisor));
  }

  roundToTetri(): Money {
    return new Money(this.value.toDecimalPlaces(TETRI, Decimal.ROUND_HALF_UP));
  }

  /**
   * Floors toward zero. §6.3 floors each share rather than rounding, because
   * rounding half-up makes the remainder negative for the 0.05-across-3 case
   * and pays the most recent clicker less than the others.
   */
  floorToTetri(): Money {
    return new Money(this.value.toDecimalPlaces(TETRI, Decimal.ROUND_DOWN));
  }

  negated(): Money {
    return new Money(this.value.negated());
  }

  compare(other: Money): -1 | 0 | 1 {
    return this.value.comparedTo(other.value) as -1 | 0 | 1;
  }

  equals(other: Money): boolean {
    return this.value.equals(other.value);
  }

  isNegative(): boolean {
    return this.value.isNegative() && !this.value.isZero();
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  /** The exact value, however many places it carries. */
  toString(): string {
    return this.value.toString();
  }

  /** The value as it goes into numeric(12,2). Throws if it would lose a digit. */
  toStorageString(): string {
    if (this.value.decimalPlaces() > TETRI) {
      throw new RangeError(
        `${this.value.toString()} is not exact at the tetri; round or floor it first`,
      );
    }
    return this.value.toFixed(TETRI);
  }
}
```

- [ ] **Step 4: Run the money tests**

```bash
pnpm vitest run src/modules/shared/domain/money.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Write the failing rate tests**

`src/modules/shared/domain/rate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Money } from "./money";
import { Rate } from "./rate";

describe("Rate", () => {
  it("treats PERCENT as a fraction, never a whole number of percent", () => {
    expect(() => Rate.percent("12.5")).toThrowError(/fraction/);
    expect(Rate.percent("0.125").kind).toBe("PERCENT");
  });

  it("computes a percent commission from the net, unrounded", () => {
    expect(
      Rate.percent("0.12").commissionFor(Money.of("190.68"), 1).toString(),
    ).toBe("22.8816");
  });

  it("multiplies a FIXED rate by the quantity", () => {
    expect(
      Rate.fixed("5.00").commissionFor(Money.of("999.99"), 3).toStorageString(),
    ).toBe("15.00");
  });

  it("ignores the net entirely for a FIXED rate", () => {
    expect(
      Rate.fixed("5.00").commissionFor(Money.of("0.01"), 1).toStorageString(),
    ).toBe("5.00");
  });

  it("rejects a negative rate of either kind", () => {
    expect(() => Rate.percent("-0.1")).toThrowError(/negative/);
    expect(() => Rate.fixed("-1.00")).toThrowError(/negative/);
  });
});
```

- [ ] **Step 6: Run and confirm failure, then implement Rate**

```bash
pnpm vitest run src/modules/shared/domain/rate.test.ts   # FAIL: module not found
```

`src/modules/shared/domain/rate.ts`:

```ts
import { Money } from "./money";

export type RateKind = "PERCENT" | "FIXED";

export class Rate {
  private constructor(
    readonly kind: RateKind,
    private readonly value: string,
  ) {}

  /** A fraction: 0.125 is twelve and a half percent. Never 12.5. */
  static percent(fraction: string): Rate {
    const asMoney = Money.of(fraction);
    if (asMoney.isNegative()) {
      throw new RangeError("a commission rate may not be negative");
    }
    if (asMoney.compare(Money.of("1")) === 1) {
      throw new RangeError(
        `PERCENT is a fraction and may not exceed 1; received ${fraction}`,
      );
    }
    return new Rate("PERCENT", fraction);
  }

  /** An absolute GEL amount per unit. */
  static fixed(perUnit: string): Rate {
    if (Money.of(perUnit).isNegative()) {
      throw new RangeError("a commission rate may not be negative");
    }
    return new Rate("FIXED", perUnit);
  }

  get storedValue(): string {
    return this.value;
  }

  /** Unrounded. §6.3 rounds the result to the tetri, not this function. */
  commissionFor(net: Money, qty: number): Money {
    return this.kind === "PERCENT"
      ? net.timesRateFraction(this.value)
      : Money.of(this.value).times(qty);
  }
}
```

- [ ] **Step 7: Add the remaining primitives**

`src/modules/shared/domain/clock.ts`:

```ts
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
```

`src/modules/shared/domain/id-generator.ts`:

```ts
export interface IdGenerator {
  uuid(): string;
  /** The ck_… token echoed in ?xu= (§4.1). */
  clickId(): string;
}
```

`src/modules/shared/domain/result.ts`:

```ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

`src/modules/shared/testing/fake-clock.ts`:

```ts
import type { Clock } from "../domain/clock";

export class FakeClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current);
  }

  advanceBy(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }

  set(next: Date): void {
    this.current = next;
  }
}
```

`src/modules/shared/testing/fixed-id-generator.ts`:

```ts
import type { IdGenerator } from "../domain/id-generator";

/** Deterministic ids so a fixture assertion may name an exact value. */
export class FixedIdGenerator implements IdGenerator {
  private counter = 0;

  constructor(private readonly seed: string) {}

  uuid(): string {
    this.counter += 1;
    return `00000000-0000-4000-8000-${String(this.counter).padStart(12, "0")}`;
  }

  clickId(): string {
    this.counter += 1;
    return `ck_${this.seed}${String(this.counter).padStart(4, "0")}`;
  }
}
```

`src/modules/shared/index.ts` — the module's public surface; other modules import from here and never deeper:

```ts
export { Money } from "./domain/money";
export { Rate, type RateKind } from "./domain/rate";
export { systemClock, type Clock } from "./domain/clock";
export type { IdGenerator } from "./domain/id-generator";
export { ok, err, type Result } from "./domain/result";
```

- [ ] **Step 8: Run the full unit suite**

```bash
pnpm test:unit
```

Expected: PASS — money, rate, env, and the test-database guard.

- [ ] **Step 9: Commit**

```bash
git add src/modules/shared
git commit -m "feat: add exact-decimal Money, Rate, and the shared domain ports"
```

---

### Task 5: Enforce the module boundaries in code

**Files:**

- Create: `scripts/verify-module-boundaries.mjs`
- Create: `src/modules/.gitkeep` structure as described in "Planned file structure"

**Interfaces:**

- Consumes: `typescript` (already a dev dependency) for AST parsing
- Produces: `pnpm verify:boundaries`, exiting non-zero with a file-and-specifier list on any violation

- [ ] **Step 1: Write the check**

`scripts/verify-module-boundaries.mjs`. It walks every source file, reads its import specifiers with the TypeScript parser rather than a regular expression, and applies three rules:

```js
import { readdirSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx"]);

// The only third-party packages a domain/ folder may import. decimal.js is
// arithmetic, not I/O; vitest only appears in domain tests.
const DOMAIN_SAFE_PACKAGES = ["decimal.js"];
const DOMAIN_TEST_PACKAGES = ["vitest"];

const nodeBuiltins = new Set(builtinModules.map((m) => m.replace(/^node:/, "")));

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (sourceExtensions.has(extname(path))) yield path;
  }
}

function importsOf(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const specifiers = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

function normalise(path) {
  return relative(root, path).split(sep).join("/");
}

function resolveInternal(file, specifier) {
  if (specifier.startsWith(".")) return normalise(resolve(dirname(file), specifier));
  if (specifier.startsWith("@/")) return specifier.slice(2);
  if (specifier.startsWith("src/")) return specifier;
  return undefined;
}

const violations = [];
const isTest = (file) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);

for (const file of walk(root)) {
  const relativeFile = normalise(file);
  const inDomain = /(^|\/)src\/modules\/[^/]+\/domain\//.test(relativeFile);
  const moduleName = relativeFile.match(/^src\/modules\/([^/]+)\//)?.[1];

  for (const specifier of importsOf(file)) {
    const internal = resolveInternal(file, specifier);

    // Rule 1: domain/ imports nothing but relative files and safe packages.
    if (inDomain && internal === undefined) {
      const allowed = [
        ...DOMAIN_SAFE_PACKAGES,
        ...(isTest(relativeFile) ? DOMAIN_TEST_PACKAGES : []),
      ];
      const permitted =
        allowed.some((p) => specifier === p || specifier.startsWith(`${p}/`)) ||
        (isTest(relativeFile) && nodeBuiltins.has(specifier.replace(/^node:/, "")));
      if (!permitted) {
        violations.push(`${relativeFile}: domain may not import "${specifier}"`);
      }
    }

    // Rule 2: Prisma lives behind infrastructure/, nowhere else.
    const touchesPrisma =
      specifier.startsWith("@prisma/") ||
      specifier === "prisma" ||
      internal?.includes("src/generated/prisma");
    const inInfrastructure =
      relativeFile.startsWith("src/infrastructure/") ||
      /(^|\/)src\/modules\/[^/]+\/infrastructure\//.test(relativeFile) ||
      relativeFile.startsWith("scripts/") ||
      relativeFile.startsWith("prisma/");
    if (touchesPrisma && !inInfrastructure) {
      violations.push(`${relativeFile}: only infrastructure/ may import Prisma ("${specifier}")`);
    }

    // Rule 3: a module reaches another module only through its index.
    if (moduleName && internal?.startsWith("src/modules/")) {
      const targetModule = internal.split("/")[2];
      const reachesInside = internal.split("/").length > 3;
      if (targetModule && targetModule !== moduleName && reachesInside) {
        violations.push(
          `${relativeFile}: import "${specifier}" reaches inside module "${targetModule}"; use its index`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`Module boundary violations (${violations.length}):`);
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log("Module boundaries are clean.");
```

- [ ] **Step 2: Prove the check catches each rule**

Temporarily break each rule, one at a time, and confirm the script fails:

```bash
# Rule 1
echo 'import { prisma } from "@/src/infrastructure/db/client";' >> src/modules/shared/domain/money.ts
pnpm verify:boundaries    # expect: exit 1, "domain may not import"
git checkout src/modules/shared/domain/money.ts

# Rule 3
mkdir -p src/modules/localization
echo 'import { Money } from "@/src/modules/shared/domain/money";' > src/modules/localization/probe.ts
pnpm verify:boundaries    # expect: exit 1, "reaches inside module"
rm src/modules/localization/probe.ts
```

Both must fail with the specific message. A check that passes when the rule is broken is worse than no check.

- [ ] **Step 3: Run it clean**

```bash
pnpm verify:boundaries
```

Expected: `Module boundaries are clean.`

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-module-boundaries.mjs
git commit -m "feat: enforce domain purity and module boundaries with an AST check"
```

---

### Task 6: Separate the three test layers

**Files:**

- Create: `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts`
- Create: `src/test/integration/setup.ts`, `src/test/e2e/foundation.spec.ts`

**Interfaces:**

- Consumes: `requireTestDatabaseUrl` from Task 3
- Produces: `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, each with a disjoint file set

- [ ] **Step 1: Configure the unit project**

`vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
    exclude: ["**/*.integration.test.ts"],
  },
});
```

- [ ] **Step 2: Configure the integration project with a guarded setup**

`vitest.integration.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["src/test/integration/setup.ts"],
    // These tests share one database. Running files in parallel would let one
    // file's truncation delete another file's fixture mid-assertion.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
```

`src/test/integration/setup.ts`:

```ts
import "dotenv/config";
import { afterEach, beforeAll } from "vitest";
import { requireTestDatabaseUrl } from "@/src/config/test-database-url";

// Read before anything imports the Prisma client, so the client is built
// against the test database and the guard has already refused a wrong one.
const testDatabaseUrl = requireTestDatabaseUrl(process.env);
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testDatabaseUrl;

const { prisma } = await import("@/src/infrastructure/db/client");

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

afterEach(async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const list = tables.map((row) => `"public"."${row.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
});
```

- [ ] **Step 3: Write the Phase 0 browser acceptance**

`src/test/e2e/foundation.spec.ts` — untagged on purpose, so it runs inside every later phase's gate:

```ts
import { expect, test } from "@playwright/test";

for (const locale of ["ka", "en"] as const) {
  test(`${locale} landing renders with reachable main content`, async ({ page }) => {
    await page.goto(`/${locale}`);

    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("main")).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
  });
}

test("liveness does not depend on PostgreSQL", async ({ request }) => {
  const response = await request.get("/api/health/live");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("readiness reports the database", async ({ request }) => {
  const response = await request.get("/api/health/ready");
  expect(response.status()).toBe(200);
});

test("an unknown locale is a 404, not a crash", async ({ page }) => {
  const response = await page.goto("/de");
  expect(response?.status()).toBe(404);
});
```

- [ ] **Step 4: Configure Playwright**

`playwright.config.ts`:

```ts
import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const baseURL = process.env.APP_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./src/test/e2e",
  forbidOnly: isCi,
  workers: 1,
  reporter: isCi ? [["dot"], ["html", { open: "never" }]] : "line",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: isCi ? "pnpm start" : "pnpm dev",
    url: `${baseURL}/api/health/live`,
    reuseExistingServer: !isCi,
  },
});
```

- [ ] **Step 5: Run all three layers**

```bash
pnpm test:unit
pnpm test:integration
pnpm exec playwright install --with-deps chromium
pnpm build && pnpm test:e2e
```

Expected: unit and integration PASS; e2e fails on the locale routes, which Task 7 creates. That failure is the next task's starting point — leave it.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts vitest.integration.config.ts playwright.config.ts src/test
git commit -m "test: separate unit, integration, and browser test projects"
```

---

### Task 7: Add the locale-aware accessible shell

**Files:**

- Create: `src/modules/localization/config.ts`, `src/modules/localization/config.test.ts`
- Create: `src/modules/localization/get-messages.ts`, `src/modules/localization/messages.test.ts`
- Create: `src/modules/localization/messages/en.json`, `src/modules/localization/messages/ka.json`
- Create: `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`, `app/[locale]/error.tsx`, `app/[locale]/not-found.tsx`
- Modify: `app/layout.tsx`, `app/globals.css`

**Interfaces:**

- Consumes: nothing
- Produces:
  - `const LOCALES = ["ka", "en"] as const` · `type Locale = (typeof LOCALES)[number]`
  - `isLocale(value: string): value is Locale`
  - `getMessages(locale: Locale): Messages` — a flat record keyed by dotted path
  - `t(messages, key)` returning the string, throwing on a missing key

- [ ] **Step 1: Write the failing locale tests**

`src/modules/localization/config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LOCALES, isLocale } from "./config";

describe("locales", () => {
  it("ships exactly ka and en", () => {
    expect([...LOCALES]).toEqual(["ka", "en"]);
  });

  it("accepts a supported locale", () => {
    expect(isLocale("ka")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isLocale("ru")).toBe(false);
    expect(isLocale("EN")).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});
```

`src/modules/localization/messages.test.ts` — this is the test that keeps the "no string ships untranslated" constraint honest for the whole program:

```ts
import { describe, expect, it } from "vitest";
import en from "./messages/en.json";
import ka from "./messages/ka.json";

describe("message catalogues", () => {
  it("have identical key sets", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ka).sort());
  });

  it("have no empty values", () => {
    for (const [key, value] of [...Object.entries(en), ...Object.entries(ka)]) {
      expect(value, `${key} is empty`).not.toBe("");
    }
  });

  it("never leave a value equal to its key", () => {
    for (const [key, value] of Object.entries(ka)) {
      expect(value, `${key} is untranslated`).not.toBe(key);
    }
  });

  it("write Georgian in Georgian script", () => {
    for (const [key, value] of Object.entries(ka)) {
      expect(
        /[Ⴀ-ჿ]/.test(value as string),
        `${key} contains no Georgian characters`,
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm vitest run src/modules/localization
```

Expected: FAIL — modules and JSON files not found.

- [ ] **Step 3: Implement the locale config and catalogues**

`src/modules/localization/config.ts`:

```ts
export const LOCALES = ["ka", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ka";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
```

`src/modules/localization/messages/en.json`:

```json
{
  "app.name": "SHUAMO",
  "app.tagline": "Creator performance, measured.",
  "nav.skipToContent": "Skip to content",
  "nav.locale": "Language",
  "error.title": "Something went wrong",
  "error.retry": "Try again",
  "notFound.title": "Page not found",
  "notFound.body": "The page you asked for does not exist."
}
```

`src/modules/localization/messages/ka.json`:

```json
{
  "app.name": "SHUAMO",
  "app.tagline": "კრეატორების შედეგი, გაზომილი.",
  "nav.skipToContent": "გადასვლა შიგთავსზე",
  "nav.locale": "ენა",
  "error.title": "რაღაც ვერ შესრულდა",
  "error.retry": "ხელახლა ცდა",
  "notFound.title": "გვერდი ვერ მოიძებნა",
  "notFound.body": "მოთხოვნილი გვერდი არ არსებობს."
}
```

`app.name` is the one key that is legitimately identical across catalogues — the product name is not translated. The "value equals its key" test does not fire on it because the key is `app.name` and the value is `SHUAMO`. The Georgian-script test does fire, so add `app.name` to an explicit exemption list in that test rather than transliterating the brand:

```ts
const UNTRANSLATED_BY_DESIGN = new Set(["app.name"]);
// ...then skip those keys in the Georgian-script assertion.
```

`src/modules/localization/get-messages.ts`:

```ts
import en from "./messages/en.json";
import ka from "./messages/ka.json";
import type { Locale } from "./config";

export type Messages = Record<string, string>;

const catalogues: Record<Locale, Messages> = { ka, en };

export function getMessages(locale: Locale): Messages {
  return catalogues[locale];
}

export function t(messages: Messages, key: string): string {
  const value = messages[key];
  if (value === undefined) {
    throw new Error(`Missing translation for "${key}"`);
  }
  return value;
}
```

`t` throws rather than falling back to the key. A missing translation must break a test, not ship as English text on a Georgian page.

- [ ] **Step 4: Build the locale routes**

`app/layout.tsx` — the root layout holds no `lang`, because the locale segment owns it:

```tsx
import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
```

`app/[locale]/layout.tsx`:

```tsx
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isLocale, LOCALES } from "@/src/modules/localization/config";
import { getMessages, t } from "@/src/modules/localization/get-messages";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = getMessages(locale);

  return (
    <html lang={locale}>
      <body>
        <a href="#main">{t(messages, "nav.skipToContent")}</a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
```

`app/[locale]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { isLocale } from "@/src/modules/localization/config";
import { getMessages, t } from "@/src/modules/localization/get-messages";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = getMessages(locale);

  return (
    <>
      <h1>{t(messages, "app.name")}</h1>
      <p>{t(messages, "app.tagline")}</p>
    </>
  );
}
```

`app/[locale]/error.tsx` and `app/[locale]/not-found.tsx` render `error.title` / `notFound.title` with the same `getMessages` call. `error.tsx` carries `"use client"` and a retry button bound to the `reset` prop.

- [ ] **Step 5: Run the accessibility and locale checks**

```bash
pnpm build && pnpm test:e2e
```

Expected: PASS — both locales render, `lang` is correct, Tab reaches the skip link, `/de` is 404, both health endpoints answer.

- [ ] **Step 6: Commit**

```bash
git add src/modules/localization app
git commit -m "feat: add the locale-aware accessible application shell"
```

---

### Task 8: Wire CI and document a clean start

**Files:**

- Create: `.github/workflows/ci.yml`, `docs/development.md`

**Interfaces:**

- Consumes: every script from Tasks 1–7
- Produces: `pnpm verify:phase-0` running green in CI from a frozen install

- [ ] **Step 1: Write the workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push: { branches: [main] }
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres-test:
        image: postgres:17
        env:
          POSTGRES_DB: shuamo_test
          POSTGRES_USER: shuamo_test
          POSTGRES_PASSWORD: shuamo_test_local_only
        ports: ["5433:5432"]
        options: >-
          --health-cmd "pg_isready -U shuamo_test -d shuamo_test"
          --health-interval 2s --health-timeout 3s --health-retries 20
    env:
      CI: "true"
      NODE_ENV: test
      DATABASE_URL: postgresql://shuamo_test:shuamo_test_local_only@localhost:5433/shuamo_test
      DATABASE_URL_TEST: postgresql://shuamo_test:shuamo_test_local_only@localhost:5433/shuamo_test
      APP_URL: http://localhost:3000
      AUTH_SECRET: ci-only-auth-secret-000000000000000000000000
      FINGERPRINT_SECRET: ci-only-fingerprint-secret-00000000000000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc }
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate:test
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm verify:phase-0
```

- [ ] **Step 2: Document the clean start**

`docs/development.md` gives the exact commands a fresh clone runs, in order: install Node 24, `corepack enable`, `pnpm install`, `cp .env.example .env` and fill the two secrets, `pnpm db:up`, `pnpm db:migrate`, `pnpm db:migrate:test`, `pnpm dev`. It also records the layered test commands, the `verify:phase-N` chain, and any dependency version substituted in Task 1 Step 3.

- [ ] **Step 3: Perform a clean verification**

From a scratch clone, to prove no step depends on state already on the machine:

```bash
git clone . /tmp/shuamo-clean && cd /tmp/shuamo-clean
pnpm install --frozen-lockfile
cp .env.example .env    # fill the secrets
pnpm db:up && pnpm db:migrate && pnpm db:migrate:test
pnpm verify:phase-0
```

Expected: green. If any step needed a command that is not in `docs/development.md`, add it there and repeat from a fresh clone.

- [ ] **Step 4: Commit**

```bash
git add .github docs/development.md
git commit -m "ci: run the phase-0 gate from a frozen install"
```

---

## Phase 0 completion checklist

- [ ] `pnpm verify:phase-0` passes from a frozen install on a clean clone.
- [ ] A migration applies to an empty PostgreSQL 17 database, and its SQL was read before it was applied.
- [ ] `docker compose ps` shows healthy `postgres-dev` and `postgres-test`; `docker compose down` preserves only the development volume.
- [x] `pnpm test:integration` refuses to run when `DATABASE_URL_TEST` points at `shuamo_dev`, proved by running it once with the wrong value.
- [x] `pnpm verify:boundaries` fails when a Prisma import is added to a `domain/` file, proved by adding one and reverting it.
- [x] `Money` has no code path that produces or accepts a JavaScript `number` for an amount.
- [x] `Money.of("0.1").plus(Money.of("0.2")).toStorageString()` is `"0.30"`.
- [ ] `/api/health/live` answers with PostgreSQL stopped; `/api/health/ready` returns 503 with it stopped and 200 with it running.
- [x] `/ka` and `/en` render with a reachable skip link on desktop and mobile; `/de` is 404.
- [x] The `ka` and `en` catalogues have identical key sets and every Georgian value is in Georgian script.
- [x] `src/config/env.ts` contains no default value for any secret, checked by reading the file.
- [ ] `docs/development.md` reproduces the whole setup from a fresh clone with no undocumented step.
