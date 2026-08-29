# Phase 2 — Identity, Accounts & Approvals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An approved brand user and an approved creator can sign in and reach role-appropriate, empty workspaces; a brand can generate the one API key the conversions postback will use.

**Architecture:** Better Auth owns credentials and sessions in its own tables. SHUAMO's `app_user` carries only what the product needs — locale and the admin flag — and `brand` / `creator` hang off it one-to-one. Capability resolution is a single server-side function; no route ever reads an actor id from the client. The API key is minted by a pure domain function and stored only as a hash.

**Tech Stack:** Better Auth with the Prisma adapter · Prisma 7 · Zod 4 · React 19 server components · the Phase 1 component kit.

**Spec:** `docs/superpowers/specs/2026-08-28-shuamo-r1-design.md` §2, §3.1 (brand credential), §3.4 (curated marketplace), §4.1–4.3, Appendix A.2.

## Global Constraints

Inherited from the roadmap. The ones this phase exercises:

- **Recorded deviation:** `app_user` has no `password_hash`. Better Auth's tables hold credentials and sessions. Every other column in Appendix A.2 is implemented exactly as written.
- Approvals happen by seed script and direct database access (§2). There is no admin UI until Phase 11.
- One user owns one brand. One user owns one creator. Enforced by `UNIQUE (user_id)` on both.
- The brand key plaintext is shown **once** and stored as a hash. There is no rotation with overlap and no `lastUsedAt` — those are R2 (§2).
- Locales `ka` and `en`, both complete. WCAG 2.2 AA.
- Each task ends in a commit.

---

## Planned file structure

```
prisma/schema.prisma                             + AppUser, Brand, Creator, ApprovalStatus,
                                                   and the Better Auth models
src/modules/identity/domain/api-key.ts           pure mint + verify
src/modules/identity/domain/api-key.test.ts
src/modules/identity/domain/approval.ts          ApprovalStatus + the capability rules
src/modules/identity/domain/approval.test.ts
src/modules/identity/domain/viewer.ts            the Viewer union Phase 1 stubbed
src/modules/identity/ports/account-repository.ts
src/modules/identity/ports/random-source.ts
src/modules/identity/application/resolve-viewer.ts        + test
src/modules/identity/application/generate-brand-key.ts    + test
src/modules/identity/application/authenticate-brand-key.ts + test
src/modules/identity/infrastructure/prisma-account-repository.ts
src/modules/identity/infrastructure/auth.ts      the Better Auth instance
src/modules/identity/infrastructure/*.integration.test.ts
src/modules/identity/http/require-viewer.ts      + test
src/modules/identity/ui/sign-in-form.tsx
src/modules/identity/ui/workspace-shell.tsx
src/modules/identity/index.ts
app/api/auth/[...all]/route.ts
app/[locale]/sign-in/page.tsx
app/[locale]/sign-up/page.tsx
app/[locale]/brand/page.tsx                      empty brand workspace
app/[locale]/creator/page.tsx                    empty creator workspace
scripts/seed-phase-02.ts                         approved brand + two approved creators
scripts/approve-account.ts                       the §2 admin path
scripts/regenerate-brand-key.ts
src/test/e2e/identity.spec.ts                    @phase-2
```

---

### Task 1: Add the account tables

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_phase_2_accounts/migration.sql` (generated)
- Create: `src/modules/identity/infrastructure/accounts.integration.test.ts`

**Interfaces:**

- Consumes: the Phase 0 Prisma client
- Produces: Prisma models `AppUser`, `Brand`, `Creator`; enum `ApprovalStatus`

- [ ] **Step 1: Write the failing constraint test**

`src/modules/identity/infrastructure/accounts.integration.test.ts`. Constraints are the point of this task, so they are what the test asserts:

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";

async function createUser(email: string) {
  return prisma.appUser.create({ data: { email, locale: "ka" } });
}

describe("account tables", () => {
  it("defaults a new brand and creator to PENDING", async () => {
    const user = await createUser("brand@example.ge");
    const brand = await prisma.brand.create({
      data: {
        userId: user.id,
        name: "Aromashop",
        keyPrefix: "xu_sk_AAAAAAAA",
        keyHash: "hash",
      },
    });

    expect(brand.status).toBe("PENDING");
    expect(brand.vatRegistered).toBe(false);
  });

  it("refuses a second brand for the same user", async () => {
    const user = await createUser("brand2@example.ge");
    const data = { userId: user.id, name: "One", keyPrefix: "xu_sk_BBBBBBBB", keyHash: "h" };
    await prisma.brand.create({ data });

    await expect(
      prisma.brand.create({ ...{ data: { ...data, name: "Two", keyPrefix: "xu_sk_CCCCCCCC" } } }),
    ).rejects.toThrowError();
  });

  it("refuses a duplicate key prefix across brands", async () => {
    const first = await createUser("a@example.ge");
    const second = await createUser("b@example.ge");
    await prisma.brand.create({
      data: { userId: first.id, name: "A", keyPrefix: "xu_sk_DDDDDDDD", keyHash: "h" },
    });

    await expect(
      prisma.brand.create({
        data: { userId: second.id, name: "B", keyPrefix: "xu_sk_DDDDDDDD", keyHash: "h" },
      }),
    ).rejects.toThrowError();
  });

  it("refuses a duplicate email", async () => {
    await createUser("dupe@example.ge");
    await expect(createUser("dupe@example.ge")).rejects.toThrowError();
  });

  it("refuses a locale outside ka and en", async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO app_user (email, locale) VALUES ('ru@example.ge', 'ru')`,
    ).rejects.toThrowError();
  });

  it("keeps the payout columns nullable and unused", async () => {
    const user = await createUser("creator@example.ge");
    const creator = await prisma.creator.create({
      data: { userId: user.id, displayName: "Nino" },
    });

    expect(creator.payoutIban).toBeNull();
    expect(creator.bio).toBe("");
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm test:integration
```

Expected: FAIL — `prisma.appUser` is undefined.

- [ ] **Step 3: Write the schema**

Append to `prisma/schema.prisma`. Compare each field against Appendix A.2 as you write it:

```prisma
enum ApprovalStatus {
  PENDING
  APPROVED
  SUSPENDED
}

/// A.2 app_user, minus password_hash: Better Auth owns credentials.
model AppUser {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  locale    String   @default("ka")
  isAdmin   Boolean  @default(false) @map("is_admin")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  brand   Brand?
  creator Creator?

  @@map("app_user")
}

/// key_prefix is the bearer-token lookup key and the displayable form.
/// key_hash is what a presented token is compared against; the plaintext
/// is never stored.
model Brand {
  id            String         @id @default(uuid()) @db.Uuid
  userId        String         @unique @map("user_id") @db.Uuid
  name          String
  vatRegistered Boolean        @default(false) @map("vat_registered")
  keyPrefix     String         @unique @map("key_prefix")
  keyHash       String         @map("key_hash")
  status        ApprovalStatus @default(PENDING)
  createdAt     DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)

  user AppUser @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@map("brand")
}

/// Payout columns are collected here and unused until R2 (§8).
model Creator {
  id          String         @id @default(uuid()) @db.Uuid
  userId      String         @unique @map("user_id") @db.Uuid
  displayName String         @map("display_name")
  bio         String         @default("")
  status      ApprovalStatus @default(PENDING)
  payoutBank  String?        @map("payout_bank")
  payoutIban  String?        @map("payout_iban")
  payoutName  String?        @map("payout_name")
  createdAt   DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)

  user AppUser @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@map("creator")
}
```

- [ ] **Step 4: Generate the migration and add what Prisma cannot express**

```bash
pnpm db:migrate --name phase_2_accounts
```

Prisma has no syntax for the locale CHECK in A.2. Add it to the generated migration by hand — this is the one edit to a migration file this program permits, and it is permitted because the alternative is a constraint that only exists in a comment:

```sql
ALTER TABLE "app_user"
  ADD CONSTRAINT app_user_locale_check CHECK (locale IN ('ka','en'));
```

- [ ] **Step 5: Diff against Appendix A.2**

Read `prisma/migrations/*_phase_2_accounts/migration.sql` side by side with the spec. Check, specifically: `timestamptz(6)` not `timestamp`; `ON DELETE RESTRICT` on both foreign keys, not `CASCADE`; `UNIQUE` on `brand.user_id`, `brand.key_prefix`, `creator.user_id`, `app_user.email`; the `partnership_creator_idx` index is **not** here — it belongs to Phase 3.

- [ ] **Step 6: Run the integration tests**

```bash
pnpm db:migrate:test && pnpm test:integration
```

Expected: PASS, 6 tests.

- [ ] **Step 7: Commit**

```bash
git add prisma src/modules/identity
git commit -m "feat: add the account tables with their approval statuses"
```

---

### Task 2: Mint and verify the brand API key

**Files:**

- Create: `src/modules/identity/domain/api-key.ts`, `api-key.test.ts`
- Create: `src/modules/identity/ports/random-source.ts`

**Interfaces:**

- Consumes: an injected `RandomSource` so the domain stays I/O-free and the test is deterministic
- Produces:
  - `interface RandomSource { bytes(count: number): Uint8Array }`
  - `mintApiKey(random: RandomSource): { plaintext: string; prefix: string; hash: string }`
  - `hashApiKey(plaintext: string): string`
  - `apiKeyPrefixOf(plaintext: string): string | undefined`
  - `keysMatch(presentedHash: string, storedHash: string): boolean` — constant-time

- [ ] **Step 1: Write the failing test**

`src/modules/identity/domain/api-key.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  apiKeyPrefixOf,
  hashApiKey,
  keysMatch,
  mintApiKey,
} from "./api-key";

const fixedRandom = {
  bytes: (count: number) => new Uint8Array(count).fill(7),
};

describe("brand API key", () => {
  it("mints a token in the xu_sk_ shape", () => {
    const { plaintext } = mintApiKey(fixedRandom);
    expect(plaintext).toMatch(/^xu_sk_[0-9A-HJ-NP-TV-Z]{8}_[0-9A-HJ-NP-TV-Z]{32}$/);
  });

  it("returns a prefix that is a strict prefix of the plaintext", () => {
    const { plaintext, prefix } = mintApiKey(fixedRandom);
    expect(plaintext.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(plaintext.length);
  });

  it("never returns the plaintext inside the hash", () => {
    const { plaintext, hash } = mintApiKey(fixedRandom);
    expect(hash).not.toContain(plaintext);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashes deterministically so a presented key can be compared", () => {
    const { plaintext, hash } = mintApiKey(fixedRandom);
    expect(hashApiKey(plaintext)).toBe(hash);
  });

  it("extracts the prefix from a presented token", () => {
    const { plaintext, prefix } = mintApiKey(fixedRandom);
    expect(apiKeyPrefixOf(plaintext)).toBe(prefix);
  });

  it("returns undefined for a token that is not in the xu_sk_ shape", () => {
    expect(apiKeyPrefixOf("Bearer nonsense")).toBeUndefined();
    expect(apiKeyPrefixOf("xu_pk_AAAAAAAA_BBBB")).toBeUndefined();
  });

  it("matches equal hashes and rejects unequal ones", () => {
    const a = hashApiKey("xu_sk_AAAAAAAA_" + "B".repeat(32));
    const b = hashApiKey("xu_sk_AAAAAAAA_" + "C".repeat(32));
    expect(keysMatch(a, a)).toBe(true);
    expect(keysMatch(a, b)).toBe(false);
  });

  it("rejects a length-mismatched hash without throwing", () => {
    expect(keysMatch("short", hashApiKey("xu_sk_AAAAAAAA_" + "B".repeat(32)))).toBe(false);
  });

  it("produces a different token on every mint with real randomness", () => {
    const random = { bytes: (n: number) => crypto.getRandomValues(new Uint8Array(n)) };
    const first = mintApiKey(random).plaintext;
    const second = mintApiKey(random).plaintext;
    expect(first).not.toBe(second);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm vitest run src/modules/identity/domain/api-key.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/modules/identity/ports/random-source.ts`:

```ts
export interface RandomSource {
  bytes(count: number): Uint8Array;
}

export const webCryptoRandom: RandomSource = {
  bytes: (count) => crypto.getRandomValues(new Uint8Array(count)),
};
```

`src/modules/identity/domain/api-key.ts`. Note the hashing decision and its reasoning — it is the kind of choice that looks wrong to a reviewer who has only ever hashed passwords:

```ts
// Crockford base32 without I, L, O, U: a brand's developer will read this
// token off a screen and type it into a config file.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PREFIX_CHARS = 8;
const SECRET_CHARS = 32;
const PATTERN = /^xu_sk_([0-9A-HJ-NP-TV-Z]{8})_[0-9A-HJ-NP-TV-Z]{32}$/;

function encode(bytes: Uint8Array, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  }
  return out;
}

/**
 * SHA-256, not argon2 or bcrypt. A slow KDF exists to make a *guessable*
 * secret expensive to attack; this token is 160 bits of uniform randomness,
 * so there is nothing to guess. Meanwhile every conversion postback verifies
 * a key, and an argon2 comparison would spend most of §6.2's 200ms budget
 * doing work that buys nothing.
 */
export function hashApiKey(plaintext: string): string {
  return sha256Hex(plaintext);
}

export function mintApiKey(random: RandomSource): {
  plaintext: string;
  prefix: string;
  hash: string;
} {
  const bytes = random.bytes(PREFIX_CHARS + SECRET_CHARS);
  const prefixBody = encode(bytes, PREFIX_CHARS);
  const secret = encode(bytes.subarray(PREFIX_CHARS), SECRET_CHARS);

  const prefix = `xu_sk_${prefixBody}`;
  const plaintext = `${prefix}_${secret}`;

  return { plaintext, prefix, hash: hashApiKey(plaintext) };
}

export function apiKeyPrefixOf(presented: string): string | undefined {
  const match = PATTERN.exec(presented);
  return match?.[1] === undefined ? undefined : `xu_sk_${match[1]}`;
}

/** Constant-time comparison of two hex digests. */
export function keysMatch(presentedHash: string, storedHash: string): boolean {
  if (presentedHash.length !== storedHash.length) return false;

  let difference = 0;
  for (let i = 0; i < presentedHash.length; i += 1) {
    difference |= presentedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return difference === 0;
}
```

`sha256Hex` is a small helper in the same file using `node:crypto`'s `createHash`. `node:crypto` is a Node builtin, and the boundary check permits builtins in domain **tests** only — so put `sha256Hex` in `src/modules/identity/infrastructure/sha256.ts` and inject it, **or** add `node:crypto` to `DOMAIN_SAFE_PACKAGES` in `scripts/verify-module-boundaries.mjs` with a comment explaining that hashing is arithmetic, not I/O. Take the second option: threading a hash function through every call site to satisfy a rule about I/O when hashing does no I/O is ceremony, and the comment records why.

- [ ] **Step 4: Run the tests**

```bash
pnpm vitest run src/modules/identity/domain/api-key.test.ts
pnpm verify:boundaries
```

Expected: PASS, 9 tests, boundaries clean.

- [ ] **Step 5: Commit**

```bash
git add src/modules/identity scripts/verify-module-boundaries.mjs
git commit -m "feat: mint and verify brand API keys with a constant-time comparison"
```

---

### Task 3: Resolve capabilities from the session, never from the client

**Files:**

- Create: `src/modules/identity/domain/approval.ts`, `approval.test.ts`
- Create: `src/modules/identity/domain/viewer.ts`
- Create: `src/modules/identity/ports/account-repository.ts`
- Create: `src/modules/identity/application/resolve-viewer.ts`, `resolve-viewer.test.ts`

**Interfaces:**

- Consumes: the `Viewer` shape Phase 1's `navDestinationsFor` already expects
- Produces:
  - `type Viewer = { kind: "anonymous" } | { kind: "brand"; userId: string; brandId: string; brandName: string; isAdmin: boolean } | { kind: "creator"; userId: string; creatorId: string; displayName: string; isAdmin: boolean } | { kind: "admin"; userId: string }`
  - `type AccountRecord = { userId: string; isAdmin: boolean; brand?: { id: string; name: string; status: ApprovalStatus }; creator?: { id: string; displayName: string; status: ApprovalStatus } }`
  - `interface AccountRepository { findByUserId(userId: string): Promise<AccountRecord | undefined> }`
  - `resolveViewer(deps: { accounts: AccountRepository }): (sessionUserId: string | undefined) => Promise<Viewer>`

- [ ] **Step 1: Write the failing test**

`src/modules/identity/application/resolve-viewer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveViewer } from "./resolve-viewer";

const accounts = (record: unknown) => ({
  findByUserId: async () => record as never,
});

describe("resolveViewer", () => {
  it("resolves no session to anonymous", async () => {
    const viewer = await resolveViewer({ accounts: accounts(undefined) })(undefined);
    expect(viewer).toEqual({ kind: "anonymous" });
  });

  it("resolves an approved brand", async () => {
    const viewer = await resolveViewer({
      accounts: accounts({
        userId: "u1",
        isAdmin: false,
        brand: { id: "b1", name: "Aromashop", status: "APPROVED" },
      }),
    })("u1");

    expect(viewer).toEqual({
      kind: "brand",
      userId: "u1",
      brandId: "b1",
      brandName: "Aromashop",
      isAdmin: false,
    });
  });

  it("resolves a PENDING brand to anonymous — approval is the gate (§3.4)", async () => {
    const viewer = await resolveViewer({
      accounts: accounts({
        userId: "u2",
        isAdmin: false,
        brand: { id: "b2", name: "Not yet", status: "PENDING" },
      }),
    })("u2");

    expect(viewer.kind).toBe("anonymous");
  });

  it("resolves a SUSPENDED creator to anonymous", async () => {
    const viewer = await resolveViewer({
      accounts: accounts({
        userId: "u3",
        isAdmin: false,
        creator: { id: "c3", displayName: "Nino", status: "SUSPENDED" },
      }),
    })("u3");

    expect(viewer.kind).toBe("anonymous");
  });

  it("resolves an admin with no brand or creator", async () => {
    const viewer = await resolveViewer({
      accounts: accounts({ userId: "u4", isAdmin: true }),
    })("u4");

    expect(viewer).toEqual({ kind: "admin", userId: "u4" });
  });

  it("resolves a user with neither role to anonymous", async () => {
    const viewer = await resolveViewer({
      accounts: accounts({ userId: "u5", isAdmin: false }),
    })("u5");

    expect(viewer.kind).toBe("anonymous");
  });

  it("resolves a missing account record to anonymous", async () => {
    const viewer = await resolveViewer({ accounts: accounts(undefined) })("ghost");
    expect(viewer.kind).toBe("anonymous");
  });
});
```

A `PENDING` account resolving to `anonymous` rather than to a "pending" viewer kind is deliberate: it means every downstream route gets authorisation for free, because a pending brand is indistinguishable from a stranger to every screen except the one that says "your application is under review".

- [ ] **Step 2: Run, confirm failure, implement**

```bash
pnpm vitest run src/modules/identity/application/resolve-viewer.test.ts   # FAIL
```

`approval.ts` exports `isActive(status: ApprovalStatus): boolean` — true only for `APPROVED` — with its own table-driven test across all three statuses. `resolve-viewer.ts` composes it.

- [ ] **Step 3: Add the HTTP guards**

`src/modules/identity/http/require-viewer.ts`:

```ts
import type { Viewer } from "../domain/viewer";
import { type Result, err, ok } from "@/src/modules/shared";

export type ViewerRejection = "unauthenticated" | "wrong_capability";

export function requireBrand(
  viewer: Viewer,
): Result<Extract<Viewer, { kind: "brand" }>, ViewerRejection> {
  if (viewer.kind === "anonymous") return err("unauthenticated");
  if (viewer.kind !== "brand") return err("wrong_capability");
  return ok(viewer);
}

export function requireCreator(
  viewer: Viewer,
): Result<Extract<Viewer, { kind: "creator" }>, ViewerRejection> {
  if (viewer.kind === "anonymous") return err("unauthenticated");
  if (viewer.kind !== "creator") return err("wrong_capability");
  return ok(viewer);
}
```

`require-viewer.test.ts` runs all four viewer kinds through both guards — eight assertions, one per cell.

- [ ] **Step 4: Run the tests**

```bash
pnpm test:unit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/identity
git commit -m "feat: resolve viewer capability server-side from the session alone"
```

---

### Task 4: Wire Better Auth

**Files:**

- Modify: `prisma/schema.prisma` (Better Auth models), `src/config/env.ts` if a new variable is needed
- Create: `src/modules/identity/infrastructure/auth.ts`
- Create: `src/modules/identity/infrastructure/prisma-account-repository.ts`
- Create: `app/api/auth/[...all]/route.ts`
- Create: `app/[locale]/sign-in/page.tsx`, `app/[locale]/sign-up/page.tsx`
- Create: `src/modules/identity/ui/sign-in-form.tsx`

**Interfaces:**

- Consumes: `serverEnv()`, the Prisma client, the Phase 1 `Field` and `Button`
- Produces:
  - `auth` — the Better Auth instance
  - `currentViewer(): Promise<Viewer>` — reads the session server-side and runs `resolveViewer`

- [ ] **Step 1: Install and generate the auth schema**

```bash
pnpm add better-auth@1.6.28 @better-auth/prisma-adapter@1.6.28
```

Configure `src/modules/identity/infrastructure/auth.ts`:

```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/src/infrastructure/db/client";
import { serverEnv } from "@/src/config/env";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: serverEnv().AUTH_SECRET,
  baseURL: serverEnv().APP_URL,
  emailAndPassword: {
    enabled: true,
    // Email is R3 (§2). Until it exists there is no verification loop and no
    // reset link, and pretending otherwise would ship a dead-end screen.
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  advanced: {
    useSecureCookies: serverEnv().NODE_ENV === "production",
    defaultCookieAttributes: { sameSite: "lax", httpOnly: true },
  },
});
```

Then generate its Prisma models into `schema.prisma` per Better Auth's CLI, migrate, and read the generated SQL before applying it as always.

- [ ] **Step 2: Link a Better Auth user to `app_user`**

Better Auth's `user` table and SHUAMO's `app_user` are two rows for one person. Rather than duplicating, make `app_user.id` **equal** the Better Auth user id: register an `after` hook on sign-up that creates the matching `app_user` row inside the same transaction, with `locale` taken from the sign-up form.

Write an integration test for exactly this, because a broken link here produces an account that can sign in and has no capabilities:

```ts
it("creates a matching app_user row on sign-up, with the same id", async () => {
  const signedUp = await auth.api.signUpEmail({
    body: { email: "new@example.ge", password: "correct horse battery staple", name: "Nino" },
  });

  const appUser = await prisma.appUser.findUnique({
    where: { id: signedUp.user.id },
  });

  expect(appUser).not.toBeNull();
  expect(appUser?.email).toBe("new@example.ge");
});
```

- [ ] **Step 3: Mount the route and build the forms**

`app/api/auth/[...all]/route.ts` exports Better Auth's handler for `GET` and `POST`. `sign-in` and `sign-up` pages use the Phase 1 `Field` and `Button`, render every string from the catalogues, and put the form-level error summary above the form with links back to each field.

- [ ] **Step 4: Implement `currentViewer`**

```ts
import { headers } from "next/headers";
import { auth } from "./auth";
import { resolveViewer } from "../application/resolve-viewer";
import { prismaAccountRepository } from "./prisma-account-repository";

export async function currentViewer() {
  const session = await auth.api.getSession({ headers: await headers() });
  return resolveViewer({ accounts: prismaAccountRepository })(session?.user.id);
}
```

- [ ] **Step 5: Run the integration tests**

```bash
pnpm db:migrate:test && pnpm test:integration
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma src/modules/identity app/api/auth app/[locale]/sign-in app/[locale]/sign-up
git commit -m "feat: wire Better Auth sessions to SHUAMO accounts"
```

---

### Task 5: Generate a brand key and show it once

**Files:**

- Create: `src/modules/identity/application/generate-brand-key.ts`, `generate-brand-key.test.ts`
- Create: `src/modules/identity/application/authenticate-brand-key.ts`, `authenticate-brand-key.test.ts`
- Create: `src/modules/identity/http/brand-key-handlers.ts`, `brand-key-handlers.test.ts`
- Create: `app/api/brand/key/route.ts`
- Create: `app/[locale]/brand/settings/page.tsx`

**Interfaces:**

- Consumes: `mintApiKey`, `hashApiKey`, `apiKeyPrefixOf`, `keysMatch`, `AccountRepository`
- Produces:
  - `generateBrandKey(deps)(brandId): Promise<Result<{ plaintext: string; prefix: string }, "not_found">>` — the plaintext is returned once and never persisted
  - `authenticateBrandKey(deps)(presented: string): Promise<Result<{ brandId: string; vatRegistered: boolean }, "unknown_key" | "brand_not_approved">>` — Phase 6's conversions API depends on this exact signature

- [ ] **Step 1: Write the failing generation test**

```ts
import { describe, expect, it } from "vitest";
import { generateBrandKey } from "./generate-brand-key";

describe("generateBrandKey", () => {
  it("returns the plaintext exactly once and stores only its hash", async () => {
    let stored: { keyPrefix: string; keyHash: string } | undefined;

    const result = await generateBrandKey({
      random: { bytes: (n) => new Uint8Array(n).fill(3) },
      brands: {
        updateKey: async (_brandId, key) => {
          stored = key;
        },
        findById: async () => ({ id: "b1" }),
      },
    })("b1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(stored?.keyHash).not.toContain(result.value.plaintext);
    expect(stored?.keyPrefix).toBe(result.value.prefix);
  });

  it("replaces the previous key, so the old one stops working immediately (§9)", async () => {
    const keys: string[] = [];
    const generate = generateBrandKey({
      random: { bytes: (n) => crypto.getRandomValues(new Uint8Array(n)) },
      brands: {
        updateKey: async (_id, key) => void keys.push(key.keyHash),
        findById: async () => ({ id: "b1" }),
      },
    });

    await generate("b1");
    await generate("b1");

    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });
});
```

- [ ] **Step 2: Write the failing authentication test**

```ts
import { describe, expect, it } from "vitest";
import { mintApiKey } from "../domain/api-key";
import { authenticateBrandKey } from "./authenticate-brand-key";

const random = { bytes: (n: number) => new Uint8Array(n).fill(5) };
const minted = mintApiKey(random);

const brands = {
  findByKeyPrefix: async (prefix: string) =>
    prefix === minted.prefix
      ? { id: "b1", keyHash: minted.hash, status: "APPROVED" as const, vatRegistered: true }
      : undefined,
};

describe("authenticateBrandKey", () => {
  it("authenticates the minted key", async () => {
    const result = await authenticateBrandKey({ brands })(minted.plaintext);
    expect(result).toEqual({ ok: true, value: { brandId: "b1", vatRegistered: true } });
  });

  it("rejects a token with the right prefix and the wrong secret", async () => {
    const tampered = `${minted.prefix}_${"Z".repeat(32)}`;
    const result = await authenticateBrandKey({ brands })(tampered);
    expect(result).toEqual({ ok: false, error: "unknown_key" });
  });

  it("rejects a malformed token without touching the database", async () => {
    let queried = false;
    const result = await authenticateBrandKey({
      brands: {
        findByKeyPrefix: async () => {
          queried = true;
          return undefined;
        },
      },
    })("not-a-key");

    expect(result).toEqual({ ok: false, error: "unknown_key" });
    expect(queried).toBe(false);
  });

  it("refuses a key belonging to a brand that is not APPROVED", async () => {
    const result = await authenticateBrandKey({
      brands: {
        findByKeyPrefix: async () => ({
          id: "b2",
          keyHash: minted.hash,
          status: "SUSPENDED" as const,
          vatRegistered: false,
        }),
      },
    })(minted.plaintext);

    expect(result).toEqual({ ok: false, error: "brand_not_approved" });
  });
});
```

- [ ] **Step 3: Run, confirm failure, implement both**

Both are thin: `generateBrandKey` mints and persists the prefix and hash; `authenticateBrandKey` extracts the prefix, returns `unknown_key` early if the shape is wrong, looks up by prefix, and compares hashes with `keysMatch`.

- [ ] **Step 4: Build the settings screen**

`app/[locale]/brand/settings/page.tsx` shows the current `key_prefix` — which is all that can ever be shown again — and a "Generate a new key" action. After generation, the plaintext appears in a `CopyField` with `revealOnce`, above a `Banner` at `warning` tone stating, in both locales, that this is the only time it will be shown and that generating a new key stops the old one working immediately.

- [ ] **Step 5: Route-contract test**

`brand-key-handlers.test.ts` asserts the response body **never** contains a `keyHash`, and that a creator viewer receives 403 rather than 404 — a 404 here would leak nothing useful, but a consistent 403 for wrong-capability is what the rest of the product does.

- [ ] **Step 6: Run and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/identity app/api/brand app/[locale]/brand
git commit -m "feat: generate a brand API key and show its plaintext once"
```

---

### Task 6: Seed and approve accounts

**Files:**

- Create: `scripts/seed-phase-02.ts`, `scripts/approve-account.ts`, `scripts/regenerate-brand-key.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: `auth`, the Prisma client, `mintApiKey`
- Produces: `pnpm seed:phase-2`, `pnpm approve <email>`, `pnpm brand:key <email>`

- [ ] **Step 1: Write the deterministic seed**

`scripts/seed-phase-02.ts` creates, with **fixed ids and a fixed clock** so a Playwright assertion may name exact values:

- `brand@aromashop.ge` → brand `Aromashop`, `APPROVED`, `vatRegistered: true`, with a key whose plaintext is printed once to stdout
- `nino@creators.ge` → creator `Nino`, `APPROVED`
- `dato@creators.ge` → creator `Dato`, `APPROVED`
- `pending@creators.ge` → creator `Pending Creator`, `PENDING`
- `suspended@aromashop.ge` → brand `Suspended Shop`, `SUSPENDED`

The last two exist so the negative paths have a fixture and are not written ad hoc in each test.

The script is idempotent: run twice, the same rows, no duplicates, and it upserts rather than inserting.

- [ ] **Step 2: Write the approval script**

`scripts/approve-account.ts` takes an email and a target status, updates `brand` or `creator` accordingly, and writes an `AuditEvent`-shaped log line. This is §2's "direct database access", made repeatable so an operator does not hand-write `UPDATE` statements.

`AuditEvent` itself is a Phase 6 table; until then the script logs structured JSON to stdout.

- [ ] **Step 3: Add the scripts**

```json
{
  "seed:phase-2": "tsx scripts/seed-phase-02.ts",
  "approve": "tsx scripts/approve-account.ts",
  "brand:key": "tsx scripts/regenerate-brand-key.ts"
}
```

- [ ] **Step 4: Run it twice**

```bash
pnpm seed:phase-2 && pnpm seed:phase-2
```

Expected: identical output, no unique-constraint error.

- [ ] **Step 5: Commit**

```bash
git add scripts package.json
git commit -m "feat: seed and approve accounts by script, per §2"
```

---

### Task 7: Build the workspaces and prove the journey

**Files:**

- Create: `app/[locale]/brand/page.tsx`, `app/[locale]/creator/page.tsx`
- Create: `src/modules/identity/ui/workspace-shell.tsx`
- Create: `src/test/e2e/identity.spec.ts`
- Modify: `app/[locale]/layout.tsx` (pass the real viewer), `package.json`

**Interfaces:**

- Consumes: `currentViewer`, `requireBrand`, `requireCreator`, the Phase 1 shell
- Produces: two authenticated, empty, correctly guarded workspaces

- [ ] **Step 1: Guard the workspace routes**

Each page calls `currentViewer()`, runs the matching guard, and `redirect`s to `/{locale}/sign-in` on `unauthenticated` or to the viewer's own workspace on `wrong_capability`. The empty state is a Phase 1 `EmptyState` naming what will appear here in Phase 3 — a workspace that says nothing is worse than one that says "your products will appear here".

- [ ] **Step 2: Pass the real viewer into the shell**

`app/[locale]/layout.tsx` now calls `currentViewer()` and passes it to `AppShell`, so `navDestinationsFor` builds real navigation. Phase 1's nav-model tests already cover the capability rules; this step only supplies the input.

- [ ] **Step 3: Write the browser journey**

`src/test/e2e/identity.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

const BRAND = { email: "brand@aromashop.ge", password: "seeded-password-01" };
const CREATOR = { email: "nino@creators.ge", password: "seeded-password-01" };
const SUSPENDED = { email: "suspended@aromashop.ge", password: "seeded-password-01" };

async function signIn(page, locale: "ka" | "en", user: { email: string; password: string }) {
  await page.goto(`/${locale}/sign-in`);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password|პაროლი/i).fill(user.password);
  await page.getByRole("button", { name: /sign in|შესვლა/i }).click();
}

for (const locale of ["ka", "en"] as const) {
  test(`@phase-2 ${locale} brand reaches its own workspace`, async ({ page }) => {
    await signIn(page, locale, BRAND);
    await expect(page).toHaveURL(new RegExp(`/${locale}/brand`));
    await expect(page.getByText("Aromashop")).toBeVisible();
  });

  test(`@phase-2 ${locale} creator reaches its own workspace`, async ({ page }) => {
    await signIn(page, locale, CREATOR);
    await expect(page).toHaveURL(new RegExp(`/${locale}/creator`));
  });
}

test("@phase-2 a creator cannot reach the brand workspace", async ({ page }) => {
  await signIn(page, "en", CREATOR);
  await page.goto("/en/brand");
  await expect(page).toHaveURL(/\/en\/creator/);
});

test("@phase-2 a suspended brand cannot sign in to a workspace", async ({ page }) => {
  await signIn(page, "en", SUSPENDED);
  await expect(page).toHaveURL(/sign-in|suspended/);
  await expect(page.getByRole("main")).not.toContainText("Suspended Shop");
});

test("@phase-2 an anonymous visitor is sent to sign-in", async ({ page }) => {
  await page.goto("/ka/brand");
  await expect(page).toHaveURL(/\/ka\/sign-in/);
});

test("@phase-2 the locale switch preserves the path", async ({ page }) => {
  await signIn(page, "ka", CREATOR);
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/creator/);
});
```

- [ ] **Step 4: Wire the phase gate**

```json
{
  "verify:phase-2": "pnpm verify:phase-1 && pnpm db:migrate:test && pnpm test:integration && pnpm build && pnpm seed:phase-2 && pnpm test:e2e --grep @phase-2"
}
```

- [ ] **Step 5: Run it**

```bash
pnpm verify:phase-2
```

Expected: green.

- [ ] **Step 6: Commit**

```bash
git add app src/modules/identity src/test/e2e/identity.spec.ts package.json
git commit -m "feat: add guarded brand and creator workspaces"
```

---

## Phase 2 completion checklist

- [ ] `pnpm verify:phase-2` passes.
- [ ] A second `brand` row for one user is refused **by PostgreSQL**, not by application code — proved by an integration test that bypasses the application.
- [ ] `app_user.locale` rejects `ru` at the database.
- [ ] The brand key plaintext appears in exactly one place — the generation response — and a read-back of the row cannot reconstruct it.
- [ ] A token with the right prefix and the wrong secret is rejected, and the comparison is constant-time.
- [ ] A malformed token is rejected without a database query.
- [ ] A `PENDING` and a `SUSPENDED` account both resolve to `anonymous`, and neither can reach a workspace.
- [ ] No route reads a user, brand, or creator id from the request body, query, or a header — checked by grepping the routes.
- [ ] `pnpm seed:phase-2` is idempotent, proved by running it twice.
- [ ] The `Viewer` shape matches what Phase 1's `navDestinationsFor` already expects, with no adapter in between.
- [ ] Both workspaces render in `ka` and `en` with an `EmptyState` that names what will appear there.
