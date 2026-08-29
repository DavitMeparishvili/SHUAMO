# Phase 4 — Redirect & Click Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GET /r/:code` records a click and redirects inside a 50ms p95 budget, and the click row is committed to PostgreSQL before the buyer ever sees `?xu=`.

**Architecture:** Two Postgres round trips and nothing else in the path — no cache, no queue, no worker (§3.4). One joined `SELECT` supplies everything the disable chain needs; one `INSERT` commits the click. The decisions around that I/O are pure functions: `resolveLink` (Phase 3), `computeFingerprint`, `decideCreditability`, `appendClickId`. Failure is designed for: a failed click write still redirects, without `?xu=`, because losing one attribution beats losing the sale.

**Tech Stack:** Next.js route handler with `runtime = "nodejs"` · Prisma 7 · `node:crypto` for the fingerprint · Caddy trusted-proxy client IP resolution.

**Spec:** `docs/superpowers/specs/2026-08-28-shuamo-r1-design.md` §3.1, §4.1 `Click`, §4.5 indexes, §4.6 invariants, §5, §6.1, §9, §11, Appendix A.4.

## Global Constraints

Inherited from the roadmap. The ones this phase exercises, in the order they will bite:

- **The click is committed before the 302 returns.** The entire attribution chain rests on this (§6.1), and it is why Phase 6 has no pending-resolution state.
- **Raw IP and User-Agent are never persisted.** Only `fpHash = sha256(ip ‖ user-agent ‖ hmac(FINGERPRINT_SECRET, utcDate))`.
- **The application never reads `X-Forwarded-For` itself.** The client IP comes from Caddy's trusted-proxy resolution. A header any client can set is not a fingerprint.
- **`fpHash` deduplicates and does nothing else.** It must never reach a candidate-click query, at any distance (§6.3). Phase 5 depends on this being structurally true, not merely intended.
- A fingerprint-deduplicated click still earns through the single-click path — Georgian CGNAT puts thousands of subscribers behind one address, and gating earnings on that match would mean a genuine sale paying nobody.
- Redirect p95 < 50ms of server time, instrumented from day one.
- Disabled → a localised "offer ended" page at HTTP **200**, not an error status.
- Each task ends in a commit.

---

## Planned file structure

```
prisma/schema.prisma                                + Click and its four indexes
src/modules/tracking/domain/fingerprint.ts          fpHash + the daily salt
src/modules/tracking/domain/fingerprint.test.ts
src/modules/tracking/domain/creditability.ts        the 30-minute rule
src/modules/tracking/domain/creditability.test.ts
src/modules/tracking/domain/backlink.ts             appendClickId
src/modules/tracking/domain/backlink.test.ts
src/modules/tracking/domain/click-id.ts             ck_… token
src/modules/tracking/domain/click-id.test.ts
src/modules/tracking/domain/visitor-cookie.ts       name, attributes, max age
src/modules/tracking/domain/visitor-cookie.test.ts
src/modules/tracking/ports/click-repository.ts
src/modules/tracking/ports/link-lookup.ts
src/modules/tracking/application/record-click.ts    the whole §6.1 sequence
src/modules/tracking/application/record-click.test.ts
src/modules/tracking/infrastructure/prisma-link-lookup.ts     the one joined SELECT
src/modules/tracking/infrastructure/prisma-click-repository.ts
src/modules/tracking/infrastructure/client-ip.ts    Caddy-resolved, never XFF
src/modules/tracking/infrastructure/client-ip.test.ts
src/modules/tracking/infrastructure/redirect.integration.test.ts
src/modules/tracking/http/redirect-handler.ts       + redirect-handler.test.ts
src/modules/tracking/ui/offer-ended.tsx
src/modules/tracking/index.ts
app/r/[code]/route.ts                               the redirect
app/[locale]/offer-ended/page.tsx                   the disabled destination
deploy/Caddyfile                                    trusted_proxies
scripts/seed-phase-04.ts
scripts/measure-redirect-latency.ts
src/test/e2e/redirect.spec.ts                       @phase-4
```

---

### Task 1: Add the click table

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `src/modules/tracking/infrastructure/click.integration.test.ts`

**Interfaces:**

- Consumes: `TrackingLink`, `Brand` from earlier phases
- Produces: model `Click` with a **text** primary key and the four indexes from §4.5

- [ ] **Step 1: Write the failing test**

`click.integration.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedLink } from "@/src/test/fixtures/accounts";

describe("click table", () => {
  it("takes a ck_ text id rather than a uuid", async () => {
    const { link, brand } = await seedLink();
    const click = await prisma.click.create({
      data: { id: "ck_a91f0000", trackingLinkId: link.id, brandId: brand.id },
    });

    expect(click.id).toBe("ck_a91f0000");
    expect(click.creditable).toBe(true);
    expect(click.convertedAt).toBeNull();
    expect(click.visitorId).toBeNull();
  });

  it("stores brand_id denormalised, so a candidate query needs no join", async () => {
    const { link, brand } = await seedLink();
    const click = await prisma.click.create({
      data: { id: "ck_brand001", trackingLinkId: link.id, brandId: brand.id },
    });

    expect(click.brandId).toBe(brand.id);
  });

  it("has the four indexes §4.5 requires", async () => {
    const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'click'
    `;
    const names = indexes.map((row) => row.indexname);

    expect(names).toContain("click_candidates_idx");
    expect(names).toContain("click_link_idx");
    expect(names).toContain("click_fp_dedup_idx");
    expect(names).toContain("click_converted_idx");
  });

  it("makes the candidate index partial on creditable", async () => {
    const [definition] = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'click_candidates_idx'
    `;
    expect(definition?.indexdef).toMatch(/WHERE creditable/i);
  });

  it("makes the converted index partial on converted_at", async () => {
    const [definition] = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'click_converted_idx'
    `;
    expect(definition?.indexdef).toMatch(/WHERE \(converted_at IS NOT NULL\)/i);
  });

  it("refuses a click whose tracking link does not exist", async () => {
    const { brand } = await seedLink();
    await expect(
      prisma.click.create({
        data: { id: "ck_orphan01", trackingLinkId: crypto.randomUUID(), brandId: brand.id },
      }),
    ).rejects.toThrowError();
  });
});
```

The two index-definition tests exist because a partial index that silently became a full index would still pass every functional test, and would only show up as a latency regression months later.

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm test:integration
```

- [ ] **Step 3: Write the schema**

```prisma
/// id is the ck_… token echoed in ?xu=.
/// brandId is denormalised: brand-filtering candidate clicks is a correctness
/// requirement (§6.3), not an optimisation.
/// convertedAt is denormalised: deriving it costs three joins on the busiest
/// table in the schema (§4.2).
/// fpHash deduplicates cookie-less clicks and does nothing else — it must
/// never reach the candidate-click query.
model Click {
  id             String    @id
  trackingLinkId String    @map("tracking_link_id") @db.Uuid
  brandId        String    @map("brand_id") @db.Uuid
  visitorId      String?   @map("visitor_id") @db.Uuid
  fpHash         String?   @map("fp_hash")
  occurredAt     DateTime  @default(now()) @map("occurred_at") @db.Timestamptz(6)
  creditable     Boolean   @default(true)
  convertedAt    DateTime? @map("converted_at") @db.Timestamptz(6)

  trackingLink TrackingLink @relation(fields: [trackingLinkId], references: [id], onDelete: Restrict)
  brand        Brand        @relation(fields: [brandId], references: [id], onDelete: Restrict)

  @@index([trackingLinkId, occurredAt(sort: Desc)], map: "click_link_idx")
  @@map("click")
}
```

Prisma cannot express partial indexes. Add the three partial ones to the generated migration by hand:

```sql
CREATE INDEX click_candidates_idx ON click (brand_id, visitor_id, occurred_at DESC)
  WHERE creditable;
CREATE INDEX click_fp_dedup_idx   ON click (tracking_link_id, fp_hash, occurred_at DESC)
  WHERE fp_hash IS NOT NULL;
CREATE INDEX click_converted_idx  ON click (tracking_link_id)
  WHERE converted_at IS NOT NULL;
```

- [ ] **Step 4: Diff against Appendix A.4, migrate, run**

Check: `id` is `text`, not `uuid`; `occurred_at` is `timestamptz`; there is **no** `ip` or `user_agent` column, and there never will be.

```bash
pnpm db:migrate --name phase_4_click && pnpm db:migrate:test && pnpm test:integration
```

- [ ] **Step 5: Commit**

```bash
git add prisma src/modules/tracking
git commit -m "feat: add the click table with its four indexes"
```

---

### Task 2: Compute the fingerprint without keeping anything raw

**Files:**

- Create: `src/modules/tracking/domain/fingerprint.ts`, `fingerprint.test.ts`
- Create: `src/modules/tracking/domain/click-id.ts`, `click-id.test.ts`
- Create: `src/modules/tracking/domain/visitor-cookie.ts`, `visitor-cookie.test.ts`

**Interfaces:**

- Consumes: `node:crypto` (permitted in domain since Phase 2 Task 2), an injected `Clock`
- Produces:
  - `dailySalt(secret: string, at: Date): string` — `hmac(secret, utcDate)`, so there is no salt table and no rotation job
  - `computeFingerprint(input: { ip: string; userAgent: string; secret: string; at: Date }): string`
  - `newClickId(random: RandomSource): string` — `ck_` + 12 lowercase hex
  - `VISITOR_COOKIE` — `{ name: "xu_vid", maxAgeSeconds: 2_592_000, httpOnly: true, sameSite: "lax", secure: true }`

- [ ] **Step 1: Write the failing fingerprint test**

`fingerprint.test.ts`. Every property that matters is a separate assertion, because this function is the difference between deduplication and a privacy incident:

```ts
import { describe, expect, it } from "vitest";
import { computeFingerprint, dailySalt } from "./fingerprint";

const SECRET = "0".repeat(40);
const base = { ip: "31.146.0.1", userAgent: "Mozilla/5.0 (Linux)", secret: SECRET };

describe("computeFingerprint", () => {
  it("is a 64-character hex digest", () => {
    const hash = computeFingerprint({ ...base, at: new Date("2026-08-12T10:00:00Z") });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable for the same input within one UTC day", () => {
    const morning = computeFingerprint({ ...base, at: new Date("2026-08-12T00:00:01Z") });
    const evening = computeFingerprint({ ...base, at: new Date("2026-08-12T23:59:59Z") });
    expect(morning).toBe(evening);
  });

  it("changes when the UTC day rolls over", () => {
    const before = computeFingerprint({ ...base, at: new Date("2026-08-12T23:59:59Z") });
    const after = computeFingerprint({ ...base, at: new Date("2026-08-13T00:00:00Z") });
    expect(before).not.toBe(after);
  });

  it("changes with the IP", () => {
    const a = computeFingerprint({ ...base, at: new Date("2026-08-12T10:00:00Z") });
    const b = computeFingerprint({ ...base, ip: "31.146.0.2", at: new Date("2026-08-12T10:00:00Z") });
    expect(a).not.toBe(b);
  });

  it("changes with the User-Agent", () => {
    const a = computeFingerprint({ ...base, at: new Date("2026-08-12T10:00:00Z") });
    const b = computeFingerprint({ ...base, userAgent: "curl/8", at: new Date("2026-08-12T10:00:00Z") });
    expect(a).not.toBe(b);
  });

  it("changes with the secret, so rotation invalidates every in-flight window", () => {
    const a = computeFingerprint({ ...base, at: new Date("2026-08-12T10:00:00Z") });
    const b = computeFingerprint({ ...base, secret: "1".repeat(40), at: new Date("2026-08-12T10:00:00Z") });
    expect(a).not.toBe(b);
  });

  it("never contains the raw IP or User-Agent", () => {
    const hash = computeFingerprint({ ...base, at: new Date("2026-08-12T10:00:00Z") });
    expect(hash).not.toContain("31.146");
    expect(hash.toLowerCase()).not.toContain("mozilla");
  });

  it("separates fields so two inputs cannot collide by concatenation", () => {
    // "ab" + "c" must not hash the same as "a" + "bc"
    const at = new Date("2026-08-12T10:00:00Z");
    const a = computeFingerprint({ ip: "ab", userAgent: "c", secret: SECRET, at });
    const b = computeFingerprint({ ip: "a", userAgent: "bc", secret: SECRET, at });
    expect(a).not.toBe(b);
  });
});

describe("dailySalt", () => {
  it("depends only on the UTC date, not on local time", () => {
    // 2026-08-12T21:00:00-04:00 is 2026-08-13T01:00:00Z
    expect(dailySalt(SECRET, new Date("2026-08-13T01:00:00Z"))).toBe(
      dailySalt(SECRET, new Date("2026-08-12T21:00:00-04:00")),
    );
  });
});
```

The concatenation test is the one people skip. Without a separator, an IP ending in a character and a User-Agent starting with one can produce the same input string as a different pair — and two unrelated visitors sharing a fingerprint costs a creator a click.

- [ ] **Step 2: Run, confirm failure, implement**

```ts
import { createHash, createHmac } from "node:crypto";

/**
 * hmac(secret, utcDate). Derived rather than stored: no salt table, no
 * rotation job, and the 24-hour roll sits comfortably above the 30-minute
 * window it serves (§6.1).
 */
export function dailySalt(secret: string, at: Date): string {
  const utcDate = at.toISOString().slice(0, 10);
  return createHmac("sha256", secret).update(utcDate).digest("hex");
}

/**
 * sha256(ip ‖ user-agent ‖ dailySalt). Fields are separated by a byte that
 * cannot appear in either, so no two distinct pairs share an input.
 * Raw IP and User-Agent are never stored anywhere.
 */
export function computeFingerprint(input: {
  ip: string;
  userAgent: string;
  secret: string;
  at: Date;
}): string {
  return createHash("sha256")
    .update(input.ip)
    .update(" ")
    .update(input.userAgent)
    .update(" ")
    .update(dailySalt(input.secret, input.at))
    .digest("hex");
}
```

- [ ] **Step 3: Implement the click id and the cookie descriptor**

`newClickId` returns `ck_` plus 12 lowercase hex characters — matching the `ck_a91f` shape in §6.2's example payload, long enough that a clickId cannot be guessed and fed to the conversions API.

`visitor-cookie.ts` holds the cookie's attributes as data rather than spelling them at the call site, and its test asserts each one against §6.1: 30 days, `HttpOnly`, `SameSite=Lax`, `Secure`.

- [ ] **Step 4: Run and commit**

```bash
pnpm vitest run src/modules/tracking/domain
git add src/modules/tracking/domain
git commit -m "feat: derive the click fingerprint from a daily salt, storing nothing raw"
```

---

### Task 3: Decide creditability and build the redirect target

**Files:**

- Create: `src/modules/tracking/domain/creditability.ts`, `creditability.test.ts`
- Create: `src/modules/tracking/domain/backlink.ts`, `backlink.test.ts`

**Interfaces:**

- Consumes: nothing
- Produces:
  - `DEDUP_WINDOW_MS = 1_800_000`
  - `decideCreditability(input: { priorClickAt: Date | undefined; now: Date }): boolean`
  - `appendClickId(backlinkUrl: string, clickId: string): string`

- [ ] **Step 1: Write the failing creditability test**

```ts
import { describe, expect, it } from "vitest";
import { DEDUP_WINDOW_MS, decideCreditability } from "./creditability";

const now = new Date("2026-08-12T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

describe("decideCreditability", () => {
  it("credits a first click", () => {
    expect(decideCreditability({ priorClickAt: undefined, now })).toBe(true);
  });

  it("does not credit a repeat inside the window", () => {
    expect(decideCreditability({ priorClickAt: ago(29 * 60_000 + 59_000), now })).toBe(false);
  });

  it("credits a repeat one second outside the window", () => {
    expect(decideCreditability({ priorClickAt: ago(DEDUP_WINDOW_MS + 1_000), now })).toBe(true);
  });

  it("treats the boundary itself as outside — 30m00s exactly still credits", () => {
    expect(decideCreditability({ priorClickAt: ago(DEDUP_WINDOW_MS), now })).toBe(true);
  });

  it("uses a 30-minute window", () => {
    expect(DEDUP_WINDOW_MS).toBe(30 * 60 * 1000);
  });
});
```

Where the boundary falls is a decision, not an accident, so the test states it: exactly 30 minutes credits, one millisecond under does not.

- [ ] **Step 2: Write the failing backlink test**

Every shape §9 mentions, plus the ones it does not:

```ts
import { describe, expect, it } from "vitest";
import { appendClickId } from "./backlink";

describe("appendClickId", () => {
  it("appends to a bare url", () => {
    expect(appendClickId("https://shop.ge/p/1", "ck_a91f")).toBe(
      "https://shop.ge/p/1?xu=ck_a91f",
    );
  });

  it("preserves an existing query", () => {
    expect(appendClickId("https://shop.ge/p/1?color=red", "ck_a91f")).toBe(
      "https://shop.ge/p/1?color=red&xu=ck_a91f",
    );
  });

  it("preserves a fragment and keeps xu before it", () => {
    expect(appendClickId("https://shop.ge/p/1#reviews", "ck_a91f")).toBe(
      "https://shop.ge/p/1?xu=ck_a91f#reviews",
    );
  });

  it("preserves both a query and a fragment", () => {
    expect(appendClickId("https://shop.ge/p/1?color=red#reviews", "ck_a91f")).toBe(
      "https://shop.ge/p/1?color=red&xu=ck_a91f#reviews",
    );
  });

  it("replaces an xu the brand already put there rather than sending two", () => {
    expect(appendClickId("https://shop.ge/p/1?xu=stale", "ck_new")).toBe(
      "https://shop.ge/p/1?xu=ck_new",
    );
  });

  it("preserves a trailing slash and a path with encoded characters", () => {
    expect(appendClickId("https://shop.ge/კატეგორია/1/", "ck_a91f")).toContain("?xu=ck_a91f");
  });

  it("throws on a url that is not absolute http(s), rather than emitting a broken Location", () => {
    expect(() => appendClickId("/relative", "ck_a91f")).toThrowError();
    expect(() => appendClickId("javascript:alert(1)", "ck_a91f")).toThrowError();
  });
});
```

The `javascript:` case is the one that matters beyond correctness: `backlink_url` is brand-supplied text, and a redirect handler that will emit any string as a `Location` is an open redirect.

- [ ] **Step 3: Run, confirm failure, implement**

```ts
export function appendClickId(backlinkUrl: string, clickId: string): string {
  const url = new URL(backlinkUrl);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TypeError(`backlink must be http(s), received "${url.protocol}"`);
  }

  url.searchParams.set("xu", clickId);
  return url.toString();
}
```

`URL` handles query, fragment, and encoding correctly, which is why this is four lines rather than a string-splicing function with its own bug surface. `searchParams.set` also gives the replace-a-stale-`xu` behaviour for free.

- [ ] **Step 4: Run and commit**

```bash
pnpm vitest run src/modules/tracking/domain
git add src/modules/tracking/domain
git commit -m "feat: decide click creditability and build the redirect target safely"
```

---

### Task 4: Record the click

**Files:**

- Create: `src/modules/tracking/ports/click-repository.ts`, `link-lookup.ts`
- Create: `src/modules/tracking/application/record-click.ts`, `record-click.test.ts`

**Interfaces:**

- Consumes: `resolveLink` from `@/src/modules/partnerships`, the domain functions from Tasks 2–3
- Produces:
  - `type LinkSnapshot = { linkId: string; brandId: string; backlinkUrl: string; state: LinkState }`
  - `interface LinkLookup { byCode(code: string): Promise<LinkSnapshot | undefined> }`
  - `interface ClickRepository { findPriorByVisitor(linkId, visitorId, since): Promise<Date | undefined>; findPriorByFingerprint(linkId, fpHash, since): Promise<Date | undefined>; insert(click): Promise<void> }`
  - `recordClick(deps)(request): Promise<RedirectOutcome>` where
    `RedirectOutcome = { kind: "redirect"; location: string; setVisitorCookie?: string } | { kind: "offer-ended"; reason: DisableReason } | { kind: "unavailable" }`

- [ ] **Step 1: Write the failing test**

`record-click.test.ts` is the largest unit test in the phase, because this function is §6.1 end to end:

```ts
import { describe, expect, it, vi } from "vitest";
import { recordClick } from "./record-click";

const NOW = new Date("2026-08-12T12:00:00Z");

const liveSnapshot = {
  linkId: "l1",
  brandId: "b1",
  backlinkUrl: "https://aromashop.ge/p/perfume-100",
  state: {
    brandStatus: "APPROVED" as const,
    partnershipStatus: "APPROVED" as const,
    productStatus: "ACTIVE" as const,
    linkStatus: "ACTIVE" as const,
  },
};

function deps(overrides: Partial<Parameters<typeof recordClick>[0]> = {}) {
  return {
    links: { byCode: async () => liveSnapshot },
    clicks: {
      findPriorByVisitor: async () => undefined,
      findPriorByFingerprint: async () => undefined,
      insert: vi.fn(async () => undefined),
    },
    clock: { now: () => NOW },
    random: { bytes: (n: number) => new Uint8Array(n).fill(4) },
    secret: "0".repeat(40),
    ...overrides,
  };
}

const request = {
  code: "K7M2QPXZ",
  visitorId: "11111111-1111-4111-8111-111111111111",
  ip: "31.146.0.1",
  userAgent: "Mozilla/5.0",
};

describe("recordClick", () => {
  it("redirects with ?xu= appended", async () => {
    const outcome = await recordClick(deps())(request);
    expect(outcome.kind).toBe("redirect");
    if (outcome.kind !== "redirect") return;
    expect(outcome.location).toMatch(/^https:\/\/aromashop\.ge\/p\/perfume-100\?xu=ck_/);
  });

  it("writes the click before returning — the insert is awaited", async () => {
    const d = deps();
    await recordClick(d)(request);
    expect(d.clicks.insert).toHaveBeenCalledTimes(1);
  });

  it("stores brandId, visitorId and fpHash, and nothing raw", async () => {
    const d = deps();
    await recordClick(d)(request);

    const [written] = d.clicks.insert.mock.calls[0]!;
    expect(written.brandId).toBe("b1");
    expect(written.visitorId).toBe(request.visitorId);
    expect(written.fpHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(written)).not.toContain("31.146");
    expect(JSON.stringify(written)).not.toContain("Mozilla");
  });

  it("mints a visitor cookie when none is presented", async () => {
    const outcome = await recordClick(deps())({ ...request, visitorId: undefined });
    expect(outcome.kind === "redirect" && outcome.setVisitorCookie).toBeDefined();
  });

  it("reuses a presented cookie rather than minting a new one", async () => {
    const outcome = await recordClick(deps())(request);
    expect(outcome.kind === "redirect" && outcome.setVisitorCookie).toBeUndefined();
  });

  it("marks a repeat visitor click non-creditable inside 30 minutes", async () => {
    const d = deps({
      clicks: {
        findPriorByVisitor: async () => new Date(NOW.getTime() - 60_000),
        findPriorByFingerprint: async () => undefined,
        insert: vi.fn(async () => undefined),
      },
    });
    await recordClick(d)(request);
    expect(d.clicks.insert.mock.calls[0]![0].creditable).toBe(false);
  });

  it("falls back to the fingerprint only when there is no cookie", async () => {
    const byFingerprint = vi.fn(async () => new Date(NOW.getTime() - 60_000));
    const d = deps({
      clicks: {
        findPriorByVisitor: async () => undefined,
        findPriorByFingerprint: byFingerprint,
        insert: vi.fn(async () => undefined),
      },
    });

    await recordClick(d)(request);
    expect(byFingerprint).not.toHaveBeenCalled();   // a cookie was presented

    await recordClick(d)({ ...request, visitorId: undefined });
    expect(byFingerprint).toHaveBeenCalledTimes(1);
  });

  it("still redirects with ?xu= when the fingerprint deduplicates — the sale still pays", async () => {
    const d = deps({
      clicks: {
        findPriorByVisitor: async () => undefined,
        findPriorByFingerprint: async () => new Date(NOW.getTime() - 60_000),
        insert: vi.fn(async () => undefined),
      },
    });

    const outcome = await recordClick(d)({ ...request, visitorId: undefined });
    expect(outcome.kind === "redirect" && outcome.location).toContain("?xu=ck_");
    expect(d.clicks.insert.mock.calls[0]![0].creditable).toBe(false);
  });

  it.each([
    ["BRAND_DISABLED", { brandStatus: "SUSPENDED" as const }],
    ["CREATOR_REMOVED", { partnershipStatus: "REJECTED" as const }],
    ["PRODUCT_ARCHIVED", { productStatus: "ARCHIVED" as const }],
    ["LINK_DISABLED", { linkStatus: "DISABLED" as const }],
  ])("returns offer-ended with reason %s", async (reason, override) => {
    const d = deps({
      links: {
        byCode: async () => ({
          ...liveSnapshot,
          state: { ...liveSnapshot.state, ...override },
        }),
      },
    });

    const outcome = await recordClick(d)(request);
    expect(outcome).toEqual({ kind: "offer-ended", reason });
  });

  it("writes no click for a disabled link", async () => {
    const d = deps({
      links: {
        byCode: async () => ({
          ...liveSnapshot,
          state: { ...liveSnapshot.state, linkStatus: "DISABLED" as const },
        }),
      },
    });
    await recordClick(d)(request);
    expect(d.clicks.insert).not.toHaveBeenCalled();
  });

  it("redirects WITHOUT ?xu= when the click write fails — §6.1", async () => {
    const d = deps({
      clicks: {
        findPriorByVisitor: async () => undefined,
        findPriorByFingerprint: async () => undefined,
        insert: vi.fn(async () => {
          throw new Error("connection terminated");
        }),
      },
    });

    const outcome = await recordClick(d)(request);
    expect(outcome).toEqual({
      kind: "redirect",
      location: "https://aromashop.ge/p/perfume-100",
    });
  });

  it("reports unavailable when the link lookup fails — no cache to serve from", async () => {
    const d = deps({
      links: {
        byCode: async () => {
          throw new Error("connection terminated");
        },
      },
    });

    expect(await recordClick(d)(request)).toEqual({ kind: "unavailable" });
  });

  it("returns offer-ended for an unknown code", async () => {
    const d = deps({ links: { byCode: async () => undefined } });
    const outcome = await recordClick(d)(request);
    expect(outcome.kind).toBe("offer-ended");
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm vitest run src/modules/tracking/application
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the §6.1 sequence**

The shape follows the spec's six numbered steps exactly, including which failures are swallowed and which are not:

```ts
export function recordClick(deps: RecordClickDeps) {
  return async (request: ClickRequest): Promise<RedirectOutcome> => {
    // 1. one indexed SELECT
    let snapshot: LinkSnapshot | undefined;
    try {
      snapshot = await deps.links.byCode(request.code);
    } catch {
      // §9: no cache exists to serve from.
      return { kind: "unavailable" };
    }

    if (snapshot === undefined) {
      return { kind: "offer-ended", reason: "LINK_DISABLED" };
    }

    // 2. the disable chain
    const resolution = resolveLink(snapshot.state);
    if (!resolution.active) {
      return { kind: "offer-ended", reason: resolution.reason };
    }

    // 3. read or mint the visitor id
    const visitorId = request.visitorId ?? uuidFrom(deps.random);
    const mintedCookie = request.visitorId === undefined;

    const now = deps.clock.now();

    // 4. fingerprint — computed for every click, used only for dedup
    const fpHash = computeFingerprint({
      ip: request.ip,
      userAgent: request.userAgent,
      secret: deps.secret,
      at: now,
    });

    // 5. dedup, then insert and commit
    const since = new Date(now.getTime() - DEDUP_WINDOW_MS);
    const priorAt = request.visitorId !== undefined
      ? await deps.clicks.findPriorByVisitor(snapshot.linkId, request.visitorId, since)
      : await deps.clicks.findPriorByFingerprint(snapshot.linkId, fpHash, since);

    const clickId = newClickId(deps.random);

    try {
      await deps.clicks.insert({
        id: clickId,
        trackingLinkId: snapshot.linkId,
        brandId: snapshot.brandId,
        visitorId,
        fpHash,
        occurredAt: now,
        creditable: decideCreditability({ priorClickAt: priorAt, now }),
      });
    } catch {
      // §6.1: the buyer's journey is never held hostage to SHUAMO's database.
      // Losing one click's attribution beats losing the sale.
      return { kind: "redirect", location: snapshot.backlinkUrl };
    }

    // 6. 302 with ?xu=
    return {
      kind: "redirect",
      location: appendClickId(snapshot.backlinkUrl, clickId),
      ...(mintedCookie ? { setVisitorCookie: visitorId } : {}),
    };
  };
}
```

Two details worth noticing while implementing. The dedup lookup runs against `visitorId` **or** `fpHash`, never both — a cookie always wins (§6.1). And `fpHash` is computed and stored on every click regardless, because §4.6 says it is set on every click, but it is only *read* on the no-cookie path.

- [ ] **Step 4: Run and commit**

```bash
pnpm vitest run src/modules/tracking
git add src/modules/tracking
git commit -m "feat: record a click and decide the redirect, per §6.1"
```

---

### Task 5: Mount the route and resolve the client IP safely

**Files:**

- Create: `app/r/[code]/route.ts`
- Create: `src/modules/tracking/http/redirect-handler.ts`, `redirect-handler.test.ts`
- Create: `src/modules/tracking/infrastructure/client-ip.ts`, `client-ip.test.ts`
- Create: `src/modules/tracking/infrastructure/prisma-link-lookup.ts`, `prisma-click-repository.ts`
- Create: `src/modules/tracking/ui/offer-ended.tsx`, `app/[locale]/offer-ended/page.tsx`
- Create: `deploy/Caddyfile`

**Interfaces:**

- Consumes: `recordClick`
- Produces: `GET /r/:code`; `resolveClientIp(headers, trustedProxyCount): string`

- [ ] **Step 1: Write the failing client-IP test**

This is where §11's warning becomes code:

```ts
import { describe, expect, it } from "vitest";
import { resolveClientIp } from "./client-ip";

describe("resolveClientIp", () => {
  it("reads the address Caddy resolved, not the raw header", () => {
    const headers = new Headers({ "x-real-ip": "31.146.0.1" });
    expect(resolveClientIp(headers)).toBe("31.146.0.1");
  });

  it("ignores an X-Forwarded-For the client set itself", () => {
    const headers = new Headers({
      "x-real-ip": "31.146.0.1",
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    });
    expect(resolveClientIp(headers)).toBe("31.146.0.1");
  });

  it("returns a stable placeholder when no trusted header is present", () => {
    // A fingerprint over "unknown" merges those visitors, which is why the
    // placeholder is constant and documented rather than randomised.
    expect(resolveClientIp(new Headers())).toBe("unknown");
  });
});
```

The application reads `X-Real-IP`, which Caddy sets from its own trusted-proxy resolution. It never parses `X-Forwarded-For`. A client that sets `X-Real-IP` directly is overwritten by Caddy before the request reaches Next.

- [ ] **Step 2: Write the failing route-contract test**

`redirect-handler.test.ts`, with stubbed ports:

```ts
it("returns 302 with the Location header and the cookie", async () => {
  const handler = createRedirectHandler({
    record: async () => ({
      kind: "redirect",
      location: "https://shop.ge/p/1?xu=ck_abc",
      setVisitorCookie: "11111111-1111-4111-8111-111111111111",
    }),
  });

  const response = await handler(new Request("https://xu.ge/r/K7M2QPXZ"), {
    params: Promise.resolve({ code: "K7M2QPXZ" }),
  });

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("https://shop.ge/p/1?xu=ck_abc");

  const cookie = response.headers.get("set-cookie") ?? "";
  expect(cookie).toContain("xu_vid=");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Lax");
  expect(cookie).toContain("Max-Age=2592000");
});

it("sends no Set-Cookie when the visitor already had one", async () => {
  const handler = createRedirectHandler({
    record: async () => ({ kind: "redirect", location: "https://shop.ge/p/1?xu=ck_abc" }),
  });
  const response = await handler(new Request("https://xu.ge/r/X"), {
    params: Promise.resolve({ code: "X" }),
  });

  expect(response.headers.get("set-cookie")).toBeNull();
});

it("redirects an offer-ended link to the localised page at 302, which renders 200", async () => {
  const handler = createRedirectHandler({
    record: async () => ({ kind: "offer-ended", reason: "PRODUCT_ARCHIVED" }),
  });
  const response = await handler(
    new Request("https://xu.ge/r/X", { headers: { "accept-language": "ka" } }),
    { params: Promise.resolve({ code: "X" }) },
  );

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/ka/offer-ended?reason=PRODUCT_ARCHIVED");
});

it("returns 503 when the database is unavailable", async () => {
  const handler = createRedirectHandler({ record: async () => ({ kind: "unavailable" }) });
  const response = await handler(new Request("https://xu.ge/r/X"), {
    params: Promise.resolve({ code: "X" }),
  });

  expect(response.status).toBe(503);
});

it("never caches a redirect", async () => {
  const handler = createRedirectHandler({
    record: async () => ({ kind: "redirect", location: "https://shop.ge/p/1?xu=ck_abc" }),
  });
  const response = await handler(new Request("https://xu.ge/r/X"), {
    params: Promise.resolve({ code: "X" }),
  });

  expect(response.headers.get("cache-control")).toMatch(/no-store/);
});
```

`no-store` is not decoration: a cached 302 would send every subsequent visitor to one creator's `?xu=`, which is an attribution bug that would take weeks to notice.

- [ ] **Step 3: Implement the handler and the route**

`app/r/[code]/route.ts` is a thin wrapper:

```ts
import { createRedirectHandler } from "@/src/modules/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = createRedirectHandler();
```

- [ ] **Step 4: Write the one joined SELECT**

`prisma-link-lookup.ts`. §6.1 budgets one query here, so it is written as one query and reviewed as one query:

```ts
export const prismaLinkLookup: LinkLookup = {
  async byCode(code) {
    const rows = await prisma.$queryRaw<LinkSnapshotRow[]>`
      SELECT l.id            AS "linkId",
             p.brand_id      AS "brandId",
             p.backlink_url  AS "backlinkUrl",
             b.status        AS "brandStatus",
             pt.status       AS "partnershipStatus",
             p.status        AS "productStatus",
             l.status        AS "linkStatus"
      FROM tracking_link l
      JOIN product p     ON p.id = l.product_id
      JOIN brand   b     ON b.id = p.brand_id
      LEFT JOIN partnership pt
             ON pt.brand_id = p.brand_id AND pt.creator_id = l.creator_id
      WHERE l.code = ${code}
      LIMIT 1
    `;
    // LEFT JOIN, not JOIN: a partnership deleted out from under a link must
    // resolve to CREATOR_REMOVED, not to "link not found".
    return rows[0] === undefined ? undefined : toSnapshot(rows[0]);
  },
};
```

- [ ] **Step 5: Build the offer-ended page**

`app/[locale]/offer-ended/page.tsx` renders a designed page, per the Dead-Link Rule — not an error template. It states, in the visitor's locale, that the offer has ended, and shows a different sentence per reason. It returns HTTP **200**, because the page rendered successfully; the offer is what ended, not the request.

- [ ] **Step 6: Configure Caddy**

`deploy/Caddyfile`:

```
xu.ge {
	encode gzip zstd

	# The application never parses X-Forwarded-For. Caddy resolves the client
	# address from its own trusted-proxy configuration and sets X-Real-IP,
	# which is the only address the fingerprint ever sees (§11).
	reverse_proxy web:3000 {
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-For {remote_host}
	}
}
```

`header_up X-Forwarded-For {remote_host}` **overwrites** any client-supplied value rather than appending to it. That single line is what makes the fingerprint unforgeable, and it is worth a comment in the file saying so.

- [ ] **Step 7: Run and commit**

```bash
pnpm test:unit && pnpm build
git add app/r app/[locale]/offer-ended src/modules/tracking deploy/Caddyfile
git commit -m "feat: mount /r/:code with safe client-IP resolution"
```

---

### Task 6: Prove durability and the latency budget

**Files:**

- Create: `src/modules/tracking/infrastructure/redirect.integration.test.ts`
- Create: `scripts/measure-redirect-latency.ts`, `scripts/seed-phase-04.ts`
- Create: `src/test/e2e/redirect.spec.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: the whole stack built above
- Produces: `pnpm measure:redirect`, `pnpm seed:phase-4`, `verify:phase-4`

- [ ] **Step 1: Write the durability test**

This is the phase's most important test, and it must not be simulated. It asserts §6.1's load-bearing claim using a **second connection**:

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/src/generated/prisma/client";
import { describe, expect, it } from "vitest";

describe("click durability", () => {
  it("commits the click before the redirect returns, visible to another connection", async () => {
    const { link } = await seedLink();

    const observer = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_TEST! }),
    });

    try {
      const response = await fetch(`${APP_URL}/r/${link.code}`, { redirect: "manual" });
      const location = response.headers.get("location")!;
      const clickId = new URL(location).searchParams.get("xu")!;

      // No polling and no retry. If this needs a wait, the guarantee is broken.
      const click = await observer.click.findUnique({ where: { id: clickId } });
      expect(click).not.toBeNull();
      expect(click?.trackingLinkId).toBe(link.id);
    } finally {
      await observer.$disconnect();
    }
  });
});
```

**Do not add a retry loop to make this pass.** If the row is not there, the click is not being committed before the response, and Phase 6's "a conversion citing a clickId can never arrive ahead of that click" is false.

- [ ] **Step 2: Write the dedup boundary integration tests**

Against the real database and its real indexes, with an injected clock:

- Two clicks, same visitor, same link, 29m59s apart → second is `creditable = false`.
- Same, 30m01s apart → second is `creditable = true`.
- Two clicks, **different links**, same visitor, one minute apart → both creditable. Dedup is per link, not per visitor.
- Two cookie-less clicks, same IP and User-Agent, one minute apart → second non-creditable, and **both** carry `?xu=`.
- The same pair, straddling UTC midnight → both creditable, because the salt rolled.
- A cookie-less click and a cookie-bearing click from the same address → the cookie one is judged by cookie, proved by asserting the fingerprint query was not the deciding factor.

- [ ] **Step 3: Write the "fpHash never widens attribution" guard**

A grep-style test, because this is a rule about the whole codebase rather than one function:

```ts
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("fpHash containment", () => {
  it("is never referenced outside the tracking module", () => {
    const offenders = globSync("src/modules/**/*.ts")
      .filter((file) => !file.includes("src/modules/tracking/"))
      .filter((file) => /fp_?[Hh]ash/.test(readFileSync(file, "utf8")));

    // §6.3: a CGNAT address shared by thousands of subscribers would merge
    // strangers into one visitor and pay creators who never touched this buyer.
    expect(offenders).toEqual([]);
  });
});
```

Keep this test through Phase 5 and Phase 6. It is cheap, and it is the only thing standing between a future convenience refactor and paying the wrong person.

- [ ] **Step 4: Measure the latency**

`scripts/measure-redirect-latency.ts` issues 500 sequential requests against a seeded link, records `Server-Timing` from each response, and prints p50/p95/p99. The handler emits `Server-Timing: total;dur=<ms>` so the measurement is server time, not network time.

```bash
pnpm seed:phase-4 && pnpm build && pnpm start &
pnpm measure:redirect
```

Expected: p95 under 50ms. If it is not, read the query plans before optimising anything — `EXPLAIN ANALYZE` the joined `SELECT` and confirm it uses `tracking_link_code_key`. §11.1's Redis option is bought against a measurement, and this script is the measurement.

Add the budget as an assertion so a regression fails CI:

```ts
it("@phase-4 keeps redirect p95 under 50ms", async () => {
  const { p95 } = await measureRedirectLatency({ requests: 200 });
  expect(p95).toBeLessThan(50);
});
```

- [ ] **Step 5: Write the browser journey**

`src/test/e2e/redirect.spec.ts`:

```ts
test("@phase-4 a real click lands on the destination with ?xu=", async ({ page }) => {
  await page.goto(`/r/${SEEDED_LINK_CODE}`);
  await expect(page).toHaveURL(/aromashop\.test\/.*\?xu=ck_/);
});

test("@phase-4 the visitor cookie is set once and reused", async ({ page, context }) => {
  await page.goto(`/r/${SEEDED_LINK_CODE}`);
  const [first] = (await context.cookies()).filter((c) => c.name === "xu_vid");
  expect(first).toBeDefined();

  await page.goto(`/r/${SEEDED_OTHER_LINK_CODE}`);
  const [second] = (await context.cookies()).filter((c) => c.name === "xu_vid");
  expect(second?.value).toBe(first?.value);
});

for (const locale of ["ka", "en"] as const) {
  test(`@phase-4 ${locale} a disabled link shows the offer-ended page at 200`, async ({ page }) => {
    const response = await page.goto(`/r/${SEEDED_DISABLED_LINK_CODE}`, {
      // follow the redirect to the localised page
    });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("main")).toContainText(
      locale === "ka" ? "შეთავაზება დასრულდა" : "This offer has ended",
    );
  });
}

test("@phase-4 a click on a disabled link writes no click row", async () => {
  const before = await countClicks();
  await fetch(`${APP_URL}/r/${SEEDED_DISABLED_LINK_CODE}`, { redirect: "manual" });
  expect(await countClicks()).toBe(before);
});
```

The e2e fixture needs a real destination host. Seed the backlinks to point at a route the test app itself serves — `/__test__/shop?xu=…` — rather than an external domain, so the journey has no network dependency.

- [ ] **Step 6: Wire the gate and run it**

```json
{
  "seed:phase-4": "tsx scripts/seed-phase-04.ts",
  "measure:redirect": "tsx scripts/measure-redirect-latency.ts",
  "verify:phase-4": "pnpm verify:phase-3 && pnpm db:migrate:test && pnpm test:integration && pnpm build && pnpm seed:phase-4 && pnpm test:e2e --grep @phase-4"
}
```

```bash
pnpm verify:phase-4
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/tracking scripts src/test/e2e/redirect.spec.ts package.json
git commit -m "test: prove click durability, dedup boundaries and the latency budget"
```

---

## Phase 4 completion checklist

- [ ] `pnpm verify:phase-4` passes.
- [ ] The click row is readable by a **second connection** immediately after the 302, with no retry loop in the test.
- [ ] Dedup boundaries hold at 29m59s and 30m01s, for both the cookie and the fingerprint path.
- [ ] A present cookie always decides creditability; the fingerprint query is not even issued.
- [ ] The daily salt rolling at UTC midnight ends an otherwise-matching cookie-less pair.
- [ ] A fingerprint-deduplicated click still receives `?xu=` — the sale still pays.
- [ ] No `ip` or `user_agent` value appears in any column, log line, or `Server-Timing` header, checked by grepping a request trace.
- [ ] A client-supplied `X-Forwarded-For` changes nothing, proved against the deployed Caddy config.
- [ ] `fpHash` appears in no module outside `src/modules/tracking`, enforced by a test.
- [ ] A failed click write still redirects, without `?xu=`; a failed link lookup returns 503.
- [ ] A disabled link renders the offer-ended page at HTTP 200 in both locales, naming the reason, and writes no click row.
- [ ] Redirect responses carry `Cache-Control: no-store`.
- [ ] Redirect p95 is under 50ms over 500 sequential requests, and the number is recorded in `docs/development.md` as the baseline the Redis decision will be measured against.
