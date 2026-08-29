# Phase 6 — Conversions API & Order Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A brand's server posts an order to `POST /v1/conversions` and the resulting attributions are correct, idempotent, and confirmable — with no amount ever recomputed after it is written.

**Architecture:** The API is a thin shell around Phase 5's pure calculator: authenticate, validate, resolve the cited click, query candidates, calculate, then persist everything in one transaction. The orders queue changes `Conversion.status` and nothing else. `AuditEvent` arrives here because this is the first phase where a human action moves something that looks like money.

**Tech Stack:** Next.js route handler (`runtime = "nodejs"`) · Zod 4 for the payload · Prisma interactive transactions · the Phase 1 component kit for the queue.

**Spec:** `docs/superpowers/specs/2026-08-28-shuamo-r1-design.md` §4.1, §4.4, §4.5, §4.6, §6.2, §7.1, §9, §10, Appendix A.4 and A.6.

## Global Constraints

Inherited from the roadmap. The ones this phase exercises:

- `orderId` is the idempotency key. There is no `Idempotency-Key` header, ever (§2).
- **`Attribution.commissionAmount` is written once and never recomputed.** Confirming or cancelling changes `Conversion.status`, never an amount (§4.6).
- `Click.convertedAt` is stamped in the same transaction as the attribution, keeps the **first** order's timestamp, and is never cleared — not even on cancellation.
- An `UNATTRIBUTED` conversion has no `Attribution` rows and is **surfaced to the brand, never silently dropped** (§9).
- A request carrying a browser `Origin` header is 401, logged as a probable leaked secret.
- Conversions API p95 < 200ms.
- Money is exact decimal end to end, including in the JSON response.
- Each task ends in a commit.

---

## Resolved ambiguities

Two, both recorded here so the implementer does not have to decide alone.

**Idempotency does not compare the `clickId`.** §6.2 says "same payload → the original result; different payload → 409", but §4.4 says `Conversion` stores no edge to the cited click. The stored payload is therefore `orderId`, `occurredAt`, and the item set — and those are what a replay is compared against. A retry that carries a different `clickId` with identical items returns the original result at 200. The first click won; re-posting cannot buy a second attribution, which is exactly the double-billing guard the unique constraint exists for.

**A line with an unknown SKU still stores its `commissionableNet`.** §6.3 says "if none: line earns nothing; record and continue", and A.4 makes `commissionable_net` `NOT NULL`. Phase 5 already computes the net for every line regardless of catalogue membership; this phase stores it.

---

## Planned file structure

```
prisma/schema.prisma                                  + Conversion, ConversionItem,
                                                        Attribution, AuditEvent,
                                                        ConversionStatus
src/modules/conversions/domain/payload.ts             Zod schema + canonical form
src/modules/conversions/domain/payload.test.ts
src/modules/conversions/domain/idempotency.ts         payloadsMatch
src/modules/conversions/domain/idempotency.test.ts
src/modules/conversions/domain/order-transitions.ts   the §7.1 state machine
src/modules/conversions/domain/order-transitions.test.ts
src/modules/conversions/ports/conversion-repository.ts
src/modules/conversions/ports/candidate-click-repository.ts
src/modules/conversions/application/intake-conversion.ts   + test
src/modules/conversions/application/decide-order.ts        + test
src/modules/conversions/application/list-orders.ts         + test
src/modules/conversions/infrastructure/prisma-conversion-repository.ts
src/modules/conversions/infrastructure/prisma-candidate-clicks.ts
src/modules/conversions/infrastructure/intake.integration.test.ts
src/modules/conversions/infrastructure/invariants.integration.test.ts
src/modules/conversions/http/conversions-handler.ts        + test
src/modules/conversions/http/order-handlers.ts             + test
src/modules/conversions/ui/orders-queue.tsx
src/modules/conversions/ui/pending-banner.tsx
src/modules/conversions/index.ts
src/modules/audit/domain/audit-event.ts               + test
src/modules/audit/infrastructure/prisma-audit-log.ts
src/modules/audit/index.ts
app/v1/conversions/route.ts
app/api/brand/orders/[id]/route.ts
app/[locale]/brand/orders/page.tsx
app/[locale]/creator/earnings/page.tsx                a first cut; Phase 7 finishes it
scripts/seed-phase-06.ts
scripts/post-conversion.ts                            the hand-held onboarding tool
scripts/measure-conversions-latency.ts
src/test/e2e/conversions.spec.ts                      @phase-6
```

---

### Task 1: Add the conversion, attribution and audit tables

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `src/modules/conversions/infrastructure/invariants.integration.test.ts`

**Interfaces:**

- Consumes: `Brand`, `Product`, `Creator`, `Click`
- Produces: models `Conversion`, `ConversionItem`, `Attribution`, `AuditEvent`; enum `ConversionStatus`

- [ ] **Step 1: Write the failing constraint test**

Every constraint in A.4 that this phase adds, plus the two Prisma cannot express:

```ts
import { Prisma } from "@/src/generated/prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedBrand, seedClick } from "@/src/test/fixtures/accounts";

describe("conversion tables", () => {
  it("defaults a conversion to PENDING with no confirmedAt", async () => {
    const brand = await seedBrand();
    const conversion = await prisma.conversion.create({
      data: { brandId: brand.id, orderId: "1234", occurredAt: new Date() },
    });

    expect(conversion.status).toBe("PENDING");
    expect(conversion.confirmedAt).toBeNull();
    expect(conversion.splitDegraded).toBe(false);
  });

  it("refuses a duplicate (brand, orderId) — idempotency and double-billing in one constraint", async () => {
    const brand = await seedBrand();
    const data = { brandId: brand.id, orderId: "dup", occurredAt: new Date() };
    await prisma.conversion.create({ data });

    await expect(prisma.conversion.create({ data })).rejects.toThrowError();
  });

  it("permits the same orderId at two different brands", async () => {
    const a = await seedBrand({ email: "a@x.ge" });
    const b = await seedBrand({ email: "b@x.ge" });
    await prisma.conversion.create({ data: { brandId: a.id, orderId: "1", occurredAt: new Date() } });

    await expect(
      prisma.conversion.create({ data: { brandId: b.id, orderId: "1", occurredAt: new Date() } }),
    ).resolves.toBeDefined();
  });

  it("refuses CONFIRMED without confirmedAt — confirmed_at_matches_status", async () => {
    const brand = await seedBrand();
    await expect(
      prisma.$executeRaw`
        INSERT INTO conversion (brand_id, order_id, occurred_at, status)
        VALUES (${brand.id}::uuid, 'bad', now(), 'CONFIRMED')
      `,
    ).rejects.toThrowError();
  });

  it("refuses a confirmedAt on a PENDING conversion", async () => {
    const brand = await seedBrand();
    await expect(
      prisma.$executeRaw`
        INSERT INTO conversion (brand_id, order_id, occurred_at, status, confirmed_at)
        VALUES (${brand.id}::uuid, 'bad2', now(), 'PENDING', now())
      `,
    ).rejects.toThrowError();
  });

  it("refuses a zero or negative quantity", async () => {
    const { conversion } = await seedConversion();
    await expect(
      prisma.conversionItem.create({
        data: {
          conversionId: conversion.id,
          sku: "P-9",
          qty: 0,
          unitPrice: new Prisma.Decimal("1"),
          lineDiscount: new Prisma.Decimal("0"),
          lineVat: new Prisma.Decimal("0"),
          commissionableNet: new Prisma.Decimal("1"),
        },
      }),
    ).rejects.toThrowError();
  });

  it("refuses a negative commissionableNet", async () => {
    const { conversion } = await seedConversion();
    await expect(
      prisma.$executeRaw`
        INSERT INTO conversion_item (conversion_id, sku, qty, unit_price, line_discount, line_vat, commissionable_net)
        VALUES (${conversion.id}::uuid, 'P-9', 1, 1, 0, 0, -1)
      `,
    ).rejects.toThrowError();
  });

  it("refuses two attributions for one creator on one line", async () => {
    const { item, click, creator, product } = await seedAttributable();
    const data = {
      conversionItemId: item.id,
      clickId: click.id,
      creatorId: creator.id,
      productId: product.id,
      commissionAmount: new Prisma.Decimal("1.00"),
    };

    await prisma.attribution.create({ data });
    await expect(prisma.attribution.create({ data })).rejects.toThrowError();
  });

  it("cascades conversion items and attributions on conversion delete, but restricts the click", async () => {
    // Nothing is ever deleted in production; this asserts the FK actions are
    // what A.4 says, because getting RESTRICT vs CASCADE backwards here is
    // how an attribution silently outlives its order.
    const { click } = await seedAttributable();
    await expect(prisma.click.delete({ where: { id: click.id } })).rejects.toThrowError();
  });
});
```

- [ ] **Step 2: Run, confirm failure, write the schema**

```prisma
enum ConversionStatus { PENDING CONFIRMED CANCELLED UNATTRIBUTED }

model Conversion {
  id            String           @id @default(uuid()) @db.Uuid
  brandId       String           @map("brand_id") @db.Uuid
  orderId       String           @map("order_id")
  occurredAt    DateTime         @map("occurred_at") @db.Timestamptz(6)
  status        ConversionStatus @default(PENDING)
  confirmedAt   DateTime?        @map("confirmed_at") @db.Timestamptz(6)
  splitDegraded Boolean          @default(false) @map("split_degraded")
  createdAt     DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)

  brand Brand            @relation(fields: [brandId], references: [id], onDelete: Restrict)
  items ConversionItem[]

  @@unique([brandId, orderId])
  @@index([brandId, status, confirmedAt], map: "conversion_queue_idx")
  @@map("conversion")
}

model ConversionItem {
  id                String   @id @default(uuid()) @db.Uuid
  conversionId      String   @map("conversion_id") @db.Uuid
  sku               String
  qty               Int
  unitPrice         Decimal  @map("unit_price") @db.Decimal(12, 2)
  lineDiscount      Decimal  @map("line_discount") @db.Decimal(12, 2)
  lineVat           Decimal  @map("line_vat") @db.Decimal(12, 2)
  commissionableNet Decimal  @map("commissionable_net") @db.Decimal(12, 2)
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  conversion   Conversion    @relation(fields: [conversionId], references: [id], onDelete: Cascade)
  attributions Attribution[]

  @@index([conversionId], map: "conversion_item_conversion_idx")
  @@map("conversion_item")
}

/// clickId is the earning creator's most recent candidate click.
/// productId records which catalogue row produced the amount — the audit link
/// between money paid and the rate that produced it (§4.2).
model Attribution {
  id               String   @id @default(uuid()) @db.Uuid
  conversionItemId String   @map("conversion_item_id") @db.Uuid
  clickId          String   @map("click_id")
  creatorId        String   @map("creator_id") @db.Uuid
  productId        String   @map("product_id") @db.Uuid
  commissionAmount Decimal  @map("commission_amount") @db.Decimal(12, 2)
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  conversionItem ConversionItem @relation(fields: [conversionItemId], references: [id], onDelete: Cascade)
  click          Click          @relation(fields: [clickId], references: [id], onDelete: Restrict)
  creator        Creator        @relation(fields: [creatorId], references: [id], onDelete: Restrict)
  product        Product        @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@unique([conversionItemId, creatorId])
  @@index([conversionItemId], map: "attribution_item_idx")
  @@index([creatorId], map: "attribution_creator_idx")
  @@index([clickId], map: "attribution_click_idx")
  @@map("attribution")
}

model AuditEvent {
  id         String   @id @default(uuid()) @db.Uuid
  actorId    String?  @map("actor_id") @db.Uuid
  action     String
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id") @db.Uuid
  changes    Json     @default("{}")
  at         DateTime @default(now()) @db.Timestamptz(6)

  actor AppUser? @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([entityType, entityId, at(sort: Desc)], map: "audit_event_entity_idx")
  @@map("audit_event")
}
```

Add the CHECK constraints by hand:

```sql
ALTER TABLE "conversion"
  ADD CONSTRAINT confirmed_at_matches_status
    CHECK ((status = 'CONFIRMED') = (confirmed_at IS NOT NULL));

ALTER TABLE "conversion_item"
  ADD CONSTRAINT conversion_item_qty_positive        CHECK (qty > 0),
  ADD CONSTRAINT conversion_item_unit_price_non_neg  CHECK (unit_price >= 0),
  ADD CONSTRAINT conversion_item_discount_non_neg    CHECK (line_discount >= 0),
  ADD CONSTRAINT conversion_item_vat_non_neg         CHECK (line_vat >= 0),
  ADD CONSTRAINT conversion_item_net_non_neg         CHECK (commissionable_net >= 0);

ALTER TABLE "attribution"
  ADD CONSTRAINT attribution_amount_non_negative CHECK (commission_amount >= 0);
```

- [ ] **Step 3: Diff against A.4, migrate, run**

```bash
pnpm db:migrate --name phase_6_conversions && pnpm db:migrate:test && pnpm test:integration
```

- [ ] **Step 4: Commit**

```bash
git add prisma src/modules/conversions src/test/fixtures
git commit -m "feat: add the conversion, attribution and audit tables"
```

---

### Task 2: Validate and canonicalise the payload

**Files:**

- Create: `src/modules/conversions/domain/payload.ts`, `payload.test.ts`
- Create: `src/modules/conversions/domain/idempotency.ts`, `idempotency.test.ts`

**Interfaces:**

- Consumes: `Money`
- Produces:
  - `parseConversionPayload(body: unknown): Result<ConversionPayload, PayloadError>`
  - `type PayloadError = { kind: "malformed" } | { kind: "invalid"; issues: string[] }`
  - `isTimestampAcceptable(occurredAt: Date, now: Date): boolean` — ±48h
  - `payloadsMatch(stored: StoredOrder, presented: ConversionPayload): boolean`

- [ ] **Step 1: Write the failing payload test**

```ts
import { describe, expect, it } from "vitest";
import { isTimestampAcceptable, parseConversionPayload } from "./payload";

const valid = {
  orderId: "1234",
  occurredAt: "2026-08-12T14:22:00+04:00",
  clickId: "ck_a91f",
  items: [
    { sku: "P-9", qty: 1, unitPrice: "250.00", lineDiscount: "25.00", lineVat: "34.32" },
  ],
};

describe("parseConversionPayload", () => {
  it("accepts the §6.2 example", () => {
    const result = parseConversionPayload(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items[0]?.unitPrice.toStorageString()).toBe("250.00");
  });

  it("accepts a numeric money value and keeps it exact", () => {
    // A brand's developer will send JSON numbers. 250.10 must not become
    // 250.09999999999999 on the way in.
    const result = parseConversionPayload({
      ...valid,
      items: [{ sku: "P-9", qty: 1, unitPrice: 250.1, lineDiscount: 0, lineVat: 0 }],
    });
    expect(result.ok && result.value.items[0]?.unitPrice.toStorageString()).toBe("250.10");
  });

  it("accepts an absent lineVat, which means derive it", () => {
    const result = parseConversionPayload({
      ...valid,
      items: [{ sku: "P-9", qty: 1, unitPrice: "250.00", lineDiscount: "0" }],
    });
    expect(result.ok && result.value.items[0]?.lineVat).toBeUndefined();
  });

  it("accepts an absent clickId, which becomes UNATTRIBUTED", () => {
    const { clickId, ...withoutClick } = valid;
    expect(parseConversionPayload(withoutClick).ok).toBe(true);
  });

  it("rejects an empty items array — commission comes exclusively from items", () => {
    expect(parseConversionPayload({ ...valid, items: [] }).ok).toBe(false);
  });

  it("rejects a zero or negative quantity", () => {
    for (const qty of [0, -1, 1.5]) {
      expect(
        parseConversionPayload({ ...valid, items: [{ ...valid.items[0], qty }] }).ok,
      ).toBe(false);
    }
  });

  it("rejects a negative unit price, discount or VAT", () => {
    for (const field of ["unitPrice", "lineDiscount", "lineVat"]) {
      expect(
        parseConversionPayload({
          ...valid,
          items: [{ ...valid.items[0], [field]: "-1" }],
        }).ok,
      ).toBe(false);
    }
  });

  it("rejects an unparseable occurredAt", () => {
    expect(parseConversionPayload({ ...valid, occurredAt: "yesterday" }).ok).toBe(false);
  });

  it("rejects an empty orderId", () => {
    expect(parseConversionPayload({ ...valid, orderId: "" }).ok).toBe(false);
  });

  it("ignores order totals rather than rejecting them", () => {
    // §6.2: there are no order totals. A brand sending them is not an error;
    // the field is simply not read.
    expect(parseConversionPayload({ ...valid, orderTotal: "9999" }).ok).toBe(true);
  });
});

describe("isTimestampAcceptable", () => {
  const now = new Date("2026-08-12T12:00:00Z");
  const hours = (n: number) => new Date(now.getTime() + n * 3_600_000);

  it("accepts a timestamp inside ±48h", () => {
    expect(isTimestampAcceptable(hours(-47), now)).toBe(true);
    expect(isTimestampAcceptable(hours(47), now)).toBe(true);
  });

  it("rejects one outside ±48h", () => {
    expect(isTimestampAcceptable(hours(-49), now)).toBe(false);
    expect(isTimestampAcceptable(hours(49), now)).toBe(false);
  });
});
```

Accepting a JSON number and converting it exactly is the detail that would otherwise bite in production: `JSON.parse` produces a float, so `unitPrice` must be re-read from the raw text or converted through a string before it reaches `Money`. Implement it by parsing the body with a reviver that keeps money fields as strings.

- [ ] **Step 2: Write the failing idempotency test**

```ts
describe("payloadsMatch", () => {
  it("matches an identical replay", () => {
    expect(payloadsMatch(stored, presented)).toBe(true);
  });

  it("matches a replay carrying a different clickId — the conversion stores no click edge", () => {
    expect(payloadsMatch(stored, { ...presented, clickId: "ck_different" })).toBe(true);
  });

  it("does not match a changed quantity", () => {
    expect(payloadsMatch(stored, withItem({ qty: 2 }))).toBe(false);
  });

  it("does not match a changed price, discount or VAT", () => {
    for (const field of ["unitPrice", "lineDiscount", "lineVat"] as const) {
      expect(payloadsMatch(stored, withItem({ [field]: "999.00" }))).toBe(false);
    }
  });

  it("does not match an added or removed line", () => {
    expect(payloadsMatch(stored, { ...presented, items: [...presented.items, extraItem] })).toBe(false);
    expect(payloadsMatch(stored, { ...presented, items: [] })).toBe(false);
  });

  it("does not match a changed occurredAt", () => {
    expect(payloadsMatch(stored, { ...presented, occurredAt: new Date("2026-01-01T00:00:00Z") })).toBe(false);
  });

  it("matches regardless of item order", () => {
    expect(payloadsMatch(stored, { ...presented, items: [...presented.items].reverse() })).toBe(true);
  });
});
```

- [ ] **Step 3: Run, confirm failure, implement both**

`payloadsMatch` compares `occurredAt` and a canonical sorted list of `(sku, qty, unitPrice, lineDiscount, lineVat)` decimal strings. A comment records why `clickId` is excluded, citing §4.4.

- [ ] **Step 4: Run and commit**

```bash
pnpm vitest run src/modules/conversions/domain
git add src/modules/conversions/domain
git commit -m "feat: validate and canonicalise the conversion payload"
```

---

### Task 3: Take a conversion in

**Files:**

- Create: `src/modules/conversions/ports/*.ts`
- Create: `src/modules/conversions/application/intake-conversion.ts`, `intake-conversion.test.ts`

**Interfaces:**

- Consumes: `authenticateBrandKey` from identity, `calculateAttributions` from attribution, the repositories
- Produces:
  - `intakeConversion(deps)(brandId, payload): Promise<IntakeOutcome>` where
    `IntakeOutcome = { kind: "created"; conversion: ConversionView } | { kind: "replay"; conversion: ConversionView } | { kind: "conflict" } | { kind: "unattributed"; conversion: ConversionView }`

- [ ] **Step 1: Write the failing test**

```ts
describe("intakeConversion", () => {
  it("resolves the cited click and persists calculated attributions", async () => {
    const persisted = vi.fn(async (input) => ({ id: "cv1", ...input }));
    const outcome = await intakeConversion(deps({ persist: persisted }))("b1", payload);

    expect(outcome.kind).toBe("created");
    const [written] = persisted.mock.calls[0]!;
    expect(written.status).toBe("PENDING");
    expect(written.items[0]?.attributions).toHaveLength(2);
  });

  it("returns the original result for a replay, writing nothing", async () => {
    const persisted = vi.fn();
    const outcome = await intakeConversion(
      deps({ existing: storedConversion, persist: persisted }),
    )("b1", payload);

    expect(outcome.kind).toBe("replay");
    expect(persisted).not.toHaveBeenCalled();
  });

  it("returns conflict for the same orderId with different items, writing nothing", async () => {
    const persisted = vi.fn();
    const outcome = await intakeConversion(
      deps({ existing: storedConversion, persist: persisted }),
    )("b1", { ...payload, items: [{ ...payload.items[0]!, qty: 9 }] });

    expect(outcome.kind).toBe("conflict");
    expect(persisted).not.toHaveBeenCalled();
  });

  it("is UNATTRIBUTED when the clickId is absent", async () => {
    const outcome = await intakeConversion(deps())("b1", { ...payload, clickId: undefined });
    expect(outcome.kind).toBe("unattributed");
  });

  it("is UNATTRIBUTED when the clickId is unknown", async () => {
    const outcome = await intakeConversion(deps({ click: undefined }))("b1", payload);
    expect(outcome.kind).toBe("unattributed");
  });

  it("is UNATTRIBUTED when the cited click is older than 30 days", async () => {
    const outcome = await intakeConversion(
      deps({ click: { ...citedClick, occurredAt: new Date(ORDER_AT.getTime() - 31 * 86_400_000) } }),
    )("b1", payload);

    expect(outcome.kind).toBe("unattributed");
  });

  it("is UNATTRIBUTED when the cited click belongs to another brand", async () => {
    const outcome = await intakeConversion(deps({ click: { ...citedClick, brandId: "b-other" } }))(
      "b1",
      payload,
    );
    expect(outcome.kind).toBe("unattributed");
  });

  it("writes no attribution rows for an UNATTRIBUTED conversion — §4.6", async () => {
    const persisted = vi.fn(async (input) => ({ id: "cv1", ...input }));
    await intakeConversion(deps({ click: undefined, persist: persisted }))("b1", payload);

    const [written] = persisted.mock.calls[0]!;
    expect(written.status).toBe("UNATTRIBUTED");
    expect(written.items.every((i) => i.attributions.length === 0)).toBe(true);
  });

  it("resolves a cited click that deduplication marked non-creditable", async () => {
    const outcome = await intakeConversion(
      deps({ click: { ...citedClick, creditable: false } }),
    )("b1", payload);

    // §6.2 step 4: it loses its own candidacy, not its visitor.
    expect(outcome.kind).toBe("created");
  });

  it("sets splitDegraded when the cited click carries no visitorId", async () => {
    const persisted = vi.fn(async (input) => ({ id: "cv1", ...input }));
    await intakeConversion(
      deps({ click: { ...citedClick, visitorId: null }, persist: persisted }),
    )("b1", payload);

    expect(persisted.mock.calls[0]![0].splitDegraded).toBe(true);
  });

  it("stamps convertedAt on every earning click that lacks one", async () => {
    const persisted = vi.fn(async (input) => ({ id: "cv1", ...input }));
    await intakeConversion(deps({ persist: persisted }))("b1", payload);

    expect(persisted.mock.calls[0]![0].stampConvertedAt).toEqual(
      expect.arrayContaining([{ clickId: "ck_nino", at: ORDER_AT }, { clickId: "ck_dato", at: ORDER_AT }]),
    );
  });

  it("does not query candidates when the click did not resolve", async () => {
    const candidates = vi.fn(async () => []);
    await intakeConversion(deps({ click: undefined, candidates }))("b1", payload);
    expect(candidates).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, confirm failure, implement**

The sequence is §6.2's, in order: check `(brand, orderId)` first, then timestamp, then resolve the click, then calculate, then persist. Checking idempotency **before** validating the timestamp matters: a brand retrying an accepted order two days later must get its original result rather than a 422.

- [ ] **Step 3: Write the persistence, in one transaction**

`prisma-conversion-repository.ts` persists `conversion`, `conversionItem[]`, `attribution[]`, and the `convertedAt` stamps in a single `prisma.$transaction`. The stamp uses `updateMany` with `convertedAt: null` in the `where` clause, so a click that already converted keeps the **first** order's timestamp without a read-then-write race:

```ts
await tx.click.updateMany({
  where: { id: { in: earningClickIds }, convertedAt: null },
  data: { convertedAt: conversion.occurredAt },
});
```

- [ ] **Step 4: Run and commit**

```bash
pnpm vitest run src/modules/conversions
git add src/modules/conversions
git commit -m "feat: take a conversion in, calculate, and persist atomically"
```

---

### Task 4: Mount the API

**Files:**

- Create: `src/modules/conversions/http/conversions-handler.ts`, `conversions-handler.test.ts`
- Create: `app/v1/conversions/route.ts`
- Create: `scripts/post-conversion.ts`

**Interfaces:**

- Consumes: `authenticateBrandKey`, `intakeConversion`
- Produces: `POST /v1/conversions`, returning the §6.2 status table exactly

- [ ] **Step 1: Write the failing route-contract test**

One test per row of §6.2's table, plus the ones that protect the secret:

```ts
describe("POST /v1/conversions", () => {
  it("200 on a new order", async () => {
    const response = await post({ auth: approvedBrand, body: valid });
    expect(response.status).toBe(200);
  });

  it("200 and a byte-identical body on a replay", async () => {
    const handler = createHandler({ intake: async () => ({ kind: "replay", conversion: view }) });
    const first = await handler(request(valid));
    const second = await handler(request(valid));

    expect(await first.text()).toBe(await second.text());
  });

  it("400 on malformed JSON", async () => {
    const response = await postRaw({ auth: approvedBrand, raw: "{not json" });
    expect(response.status).toBe(400);
  });

  it("401 on an unknown key", async () => {
    const response = await post({ auth: "xu_sk_AAAAAAAA_" + "B".repeat(32), body: valid });
    expect(response.status).toBe(401);
  });

  it("401, never 404, on a missing Authorization header", async () => {
    // §9: a 404 would leak whether the endpoint exists.
    const response = await post({ auth: undefined, body: valid });
    expect(response.status).toBe(401);
  });

  it("401 on a request carrying a browser Origin header", async () => {
    const response = await post({
      auth: approvedBrand,
      body: valid,
      headers: { origin: "https://aromashop.ge" },
    });
    expect(response.status).toBe(401);
  });

  it("logs a leaked-secret warning for an Origin request", async () => {
    const logs: unknown[] = [];
    await post({ auth: approvedBrand, body: valid, headers: { origin: "https://x.ge" }, log: (e) => logs.push(e) });
    expect(JSON.stringify(logs)).toContain("probable_leaked_secret");
  });

  it("409 on the same orderId with different data", async () => {
    const handler = createHandler({ intake: async () => ({ kind: "conflict" }) });
    expect((await handler(request(valid))).status).toBe(409);
  });

  it("422 on timestamp skew beyond ±48h", async () => {
    const response = await post({
      auth: approvedBrand,
      body: { ...valid, occurredAt: "2020-01-01T00:00:00Z" },
    });
    expect(response.status).toBe(422);
  });

  it("422 on a bad item shape", async () => {
    const response = await post({ auth: approvedBrand, body: { ...valid, items: [{ sku: "P-9" }] } });
    expect(response.status).toBe(422);
  });

  it("200 with status UNATTRIBUTED, surfaced rather than dropped", async () => {
    const handler = createHandler({ intake: async () => ({ kind: "unattributed", conversion: unattributedView }) });
    const response = await handler(request(valid));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "UNATTRIBUTED" });
  });

  it("returns money as decimal strings, never as JSON numbers", async () => {
    const response = await post({ auth: approvedBrand, body: valid });
    const text = await response.text();

    expect(text).toContain('"commissionAmount":"11.44"');
    expect(text).not.toMatch(/"commissionAmount":\s*\d/);
  });

  it("never echoes a key, a hash, an fpHash or a visitorId", async () => {
    const text = await (await post({ auth: approvedBrand, body: valid })).text();

    for (const forbidden of ["xu_sk_", "keyHash", "fpHash", "visitorId"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("401 for a key belonging to a suspended brand", async () => {
    expect((await post({ auth: suspendedBrandKey, body: valid })).status).toBe(401);
  });
});
```

The "money as decimal strings" test is the one that prevents a subtle disaster: `JSON.stringify` on a `Decimal` that has been coerced to a number turns `11.44` into a float, and a brand's accounting system reading it back gets a different number than SHUAMO stored.

- [ ] **Step 2: Run, confirm failure, implement**

`app/v1/conversions/route.ts`:

```ts
import { createConversionsHandler } from "@/src/modules/conversions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createConversionsHandler();
```

- [ ] **Step 3: Write the operator's posting tool**

`scripts/post-conversion.ts` posts a conversion from the command line, taking a key, an order id, a click id and a JSON item list. §2 makes hand-held onboarding the only mitigation for risk 1, so the tool that does the hand-holding is part of the deliverable rather than an afterthought.

- [ ] **Step 4: Run and commit**

```bash
pnpm test:unit && pnpm build
git add src/modules/conversions app/v1 scripts/post-conversion.ts
git commit -m "feat: mount POST /v1/conversions with the §6.2 status contract"
```

---

### Task 5: Confirm and cancel orders

**Files:**

- Create: `src/modules/conversions/domain/order-transitions.ts`, `order-transitions.test.ts`
- Create: `src/modules/conversions/application/decide-order.ts`, `decide-order.test.ts`
- Create: `src/modules/audit/*`
- Create: `src/modules/conversions/http/order-handlers.ts`, `order-handlers.test.ts`
- Create: `app/api/brand/orders/[id]/route.ts`

**Interfaces:**

- Consumes: `requireBrand`, the conversion repository, the audit log
- Produces:
  - `nextStatus(current: ConversionStatus, action: "CONFIRM" | "CANCEL"): Result<ConversionStatus, "illegal_transition">`
  - `decideOrder(deps)(brandId, conversionId, action): Promise<Result<{ status: ConversionStatus }, DecideError>>`
  - `recordAuditEvent(deps)(event): Promise<void>`

- [ ] **Step 1: Write the failing transition test**

The whole state machine as a table, including every illegal move:

```ts
import { describe, expect, it } from "vitest";
import { nextStatus } from "./order-transitions";

describe("nextStatus", () => {
  it.each([
    ["PENDING", "CONFIRM", "CONFIRMED"],
    ["PENDING", "CANCEL", "CANCELLED"],
    ["CONFIRMED", "CANCEL", "CANCELLED"],
  ] as const)("%s + %s -> %s", (from, action, to) => {
    expect(nextStatus(from, action)).toEqual({ ok: true, value: to });
  });

  it.each([
    ["CONFIRMED", "CONFIRM"],
    ["CANCELLED", "CONFIRM"],
    ["CANCELLED", "CANCEL"],
    ["UNATTRIBUTED", "CONFIRM"],
    ["UNATTRIBUTED", "CANCEL"],
  ] as const)("refuses %s + %s", (from, action) => {
    expect(nextStatus(from, action)).toEqual({ ok: false, error: "illegal_transition" });
  });
});
```

`CONFIRMED → CANCELLED` is legal because §7.1 permits a return that surfaces after confirmation. `CANCELLED → CONFIRMED` is not, because un-cancelling a return is an adjustment, and adjustments arrive in R2.

An `UNATTRIBUTED` conversion cannot be confirmed at all: it has no attributions, so there is nothing for confirmation to mean.

- [ ] **Step 2: Write the failing decide-order test**

```ts
it("stamps confirmedAt on confirmation and nothing else", async () => {
  const updates: unknown[] = [];
  await decideOrder(deps({ update: async (u) => void updates.push(u) }))("b1", "cv1", "CONFIRM");

  expect(updates[0]).toEqual({
    id: "cv1",
    status: "CONFIRMED",
    confirmedAt: NOW,
  });
});

it("clears confirmedAt when a confirmed order is cancelled", async () => {
  // confirmed_at_matches_status forbids a CANCELLED row keeping its stamp.
  const updates: unknown[] = [];
  await decideOrder(
    deps({ existing: { status: "CONFIRMED" }, update: async (u) => void updates.push(u) }),
  )("b1", "cv1", "CANCEL");

  expect(updates[0]).toMatchObject({ status: "CANCELLED", confirmedAt: null });
});

it("never touches an attribution amount", async () => {
  const touched: string[] = [];
  await decideOrder(deps({ onWrite: (table) => touched.push(table) }))("b1", "cv1", "CONFIRM");
  expect(touched).not.toContain("attribution");
});

it("writes an audit event carrying the actor and the transition", async () => {
  const events: unknown[] = [];
  await decideOrder(deps({ audit: async (e) => void events.push(e) }))("b1", "cv1", "CONFIRM");

  expect(events[0]).toMatchObject({
    action: "conversion.confirmed",
    entityType: "conversion",
    entityId: "cv1",
    changes: { from: "PENDING", to: "CONFIRMED" },
  });
});

it("refuses an order belonging to another brand", async () => {
  const result = await decideOrder(deps({ existing: undefined }))("b-other", "cv1", "CONFIRM");
  expect(result).toEqual({ ok: false, error: "not_found" });
});
```

Losing `confirmedAt` on cancellation is worth noticing: the constraint requires it, and the fact that the order *was once confirmed* survives in the audit event rather than on the row. Phase 9's invoicing depends on ledger entries rather than on `confirmedAt`, so nothing downstream loses information.

- [ ] **Step 3: Implement, with the audit write in the same transaction**

The status change and the audit event commit together. An audited action whose audit row can fail independently is an action with no audit trail.

- [ ] **Step 4: Run and commit**

```bash
pnpm test:unit
git add src/modules/conversions src/modules/audit app/api/brand/orders
git commit -m "feat: confirm and cancel orders with an atomic audit trail"
```

---

### Task 6: Build the orders queue

**Files:**

- Create: `app/[locale]/brand/orders/page.tsx`
- Create: `src/modules/conversions/ui/orders-queue.tsx`, `pending-banner.tsx`
- Create: `app/[locale]/creator/earnings/page.tsx` (first cut)
- Modify: the message catalogues, `src/modules/shell/ui/nav-model.ts`

**Interfaces:**

- Consumes: `listOrders`, `decideOrder`, the Phase 1 kit
- Produces: the §7.1 queue, both locales

- [ ] **Step 1: Build the queue**

Per §7.1, each row shows the order id, date, line items, and the attributed creators with their shares:

```
Order #1234 — 250.00 ₾ — Nino, Dato — Commission 22.88 ₾
  [✓ Confirm]   [× Cancelled / Returned]
```

Rules the UI must hold to:

- Confirm and Cancel act on the **whole order**. There is no per-line control, because cancelling one returned line needs adjustment machinery and is R2 (§7.1).
- Every amount is a `MoneyAmount`. Every status is a `StatusPill` with words.
- An `UNATTRIBUTED` order appears in the queue with no actions and an explanation of what happened — this is §9's "surfaced to the brand, never silently dropped", and hiding it would defeat the point.
- Cancelling a `CONFIRMED` order asks for confirmation and states, in the confirmation, that the cancellation is recorded and will appear on the next CSV as a negative line.

- [ ] **Step 2: Build the pending escalation**

`pending-banner.tsx` shows the pending count and the oldest pending age in the navigation, escalating at 7, 14 and 30 days (§7.1). The three thresholds are a pure function with its own test:

```ts
it.each([
  [0, "none"],
  [6, "none"],
  [7, "notice"],
  [13, "notice"],
  [14, "warning"],
  [29, "warning"],
  [30, "danger"],
  [90, "danger"],
])("%s days old is %s", (days, expected) => {
  expect(pendingEscalation(days)).toBe(expected);
});
```

- [ ] **Step 3: Write the browser journey**

```ts
test("@phase-6 a posted order appears in the brand queue and confirms", async ({ page, request }) => {
  await request.post("/v1/conversions", {
    headers: { authorization: `Bearer ${SEEDED_BRAND_KEY}` },
    data: seededOrderPayload,
  });

  await signInAsBrand(page, "en");
  await page.goto("/en/brand/orders");
  await expect(page.getByText("#1234")).toBeVisible();
  await expect(page.getByText("22.88 ₾")).toBeVisible();

  await page.getByRole("button", { name: /confirm/i }).click();
  await expect(page.getByText("Confirmed")).toBeVisible();
});

test("@phase-6 an unattributed order is visible with no actions", async ({ page }) => {
  await signInAsBrand(page, "ka");
  await page.goto("/ka/brand/orders");

  const row = page.getByRole("row", { name: /UNATTRIBUTED-ORDER/ });
  await expect(row).toBeVisible();
  await expect(row.getByRole("button")).toHaveCount(0);
});

test("@phase-6 a creator sees the commission from that order", async ({ page }) => {
  await signInAsCreator(page, "en");
  await page.goto("/en/creator/earnings");
  await expect(page.getByText("11.44 ₾")).toBeVisible();
});
```

- [ ] **Step 4: Commit**

```bash
git add app src/modules/conversions
git commit -m "feat: build the brand orders queue with pending escalation"
```

---

### Task 7: Prove the invariants and the latency budget

**Files:**

- Create: `src/modules/conversions/infrastructure/intake.integration.test.ts`
- Create: `scripts/seed-phase-06.ts`, `scripts/measure-conversions-latency.ts`
- Create: `src/test/e2e/conversions.spec.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: the whole stack
- Produces: `verify:phase-6`

- [ ] **Step 1: Write the invariant tests**

One test per row of Appendix A.6, each named for its invariant, against the real database:

```ts
describe("A.6 invariants", () => {
  it("Σ commission_amount per line equals the line's computed commission", async () => {
    const { itemId, commission } = await postAndFetch(twoCreatorOrder);
    const [{ sum }] = await prisma.$queryRaw<{ sum: Prisma.Decimal }[]>`
      SELECT COALESCE(sum(commission_amount), 0) AS sum
      FROM attribution WHERE conversion_item_id = ${itemId}::uuid
    `;
    expect(sum.toFixed(2)).toBe(commission);
  });

  it("at most 3 attribution rows per line", async () => {
    const { itemId } = await postAndFetch(fiveCreatorOrder);
    expect(await prisma.attribution.count({ where: { conversionItemId: itemId } })).toBeLessThanOrEqual(3);
  });

  it("commission_amount is never rewritten after insert", async () => {
    const { id, amount } = await postAndFetchAttribution(order);
    await changeProductRate("P-9", "0.50");
    await confirmOrder(order.orderId);

    const after = await prisma.attribution.findUniqueOrThrow({ where: { id } });
    expect(after.commissionAmount.toFixed(2)).toBe(amount);
  });

  it("converted_at is set iff the click has an attribution", async () => {
    const orphans = await prisma.$queryRaw<unknown[]>`
      SELECT c.id FROM click c
      LEFT JOIN attribution a ON a.click_id = c.id
      WHERE (c.converted_at IS NOT NULL) <> (a.id IS NOT NULL)
    `;
    expect(orphans).toEqual([]);
  });

  it("converted_at keeps the first order's timestamp when a second order also earns", async () => {
    await post(firstOrder);                 // occurredAt Aug 12
    const first = await readConvertedAt(CLICK_ID);
    await post(secondOrder);                // occurredAt Aug 14, same click
    expect(await readConvertedAt(CLICK_ID)).toEqual(first);
  });

  it("converted_at survives a cancellation — the click did convert", async () => {
    await post(order);
    const before = await readConvertedAt(CLICK_ID);
    await cancelOrder(order.orderId);
    expect(await readConvertedAt(CLICK_ID)).toEqual(before);
  });

  it("converted_at is null for every click that earned nothing", async () => {
    const { id } = await seedClick();
    expect(await readConvertedAt(id)).toBeNull();
  });

  it("an UNATTRIBUTED conversion has no attribution rows", async () => {
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT c.id FROM conversion c
      JOIN conversion_item ci ON ci.conversion_id = c.id
      JOIN attribution a ON a.conversion_item_id = ci.id
      WHERE c.status = 'UNATTRIBUTED'
    `;
    expect(rows).toEqual([]);
  });

  it("confirmed_at is set iff status is CONFIRMED", async () => {
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT id FROM conversion
      WHERE (status = 'CONFIRMED') <> (confirmed_at IS NOT NULL)
    `;
    expect(rows).toEqual([]);
  });

  it("a replay writes no second conversion row", async () => {
    await post(order);
    await post(order);
    expect(await prisma.conversion.count({ where: { orderId: order.orderId } })).toBe(1);
  });

  it("a conflicting repost writes nothing at all", async () => {
    await post(order);
    const before = await snapshotCounts();
    await post({ ...order, items: [{ ...order.items[0]!, qty: 99 }] });
    expect(await snapshotCounts()).toEqual(before);
  });
});
```

The three `converted_at` tests and the money-immutability test are the ones that would be quietly wrong for months if they did not exist.

- [ ] **Step 2: Measure the latency**

`scripts/measure-conversions-latency.ts` posts 200 distinct orders against a seeded brand and reports p50/p95/p99 of server time.

```bash
pnpm seed:phase-6 && pnpm build && pnpm start &
pnpm measure:conversions
```

Expected: p95 under 200ms. If not, `EXPLAIN ANALYZE` the candidate-click query and confirm it uses `click_candidates_idx` before changing anything.

Add the budget as an assertion.

- [ ] **Step 3: Wire the gate**

```json
{
  "seed:phase-6": "tsx scripts/seed-phase-06.ts",
  "measure:conversions": "tsx scripts/measure-conversions-latency.ts",
  "verify:phase-6": "pnpm verify:phase-5 && pnpm db:migrate:test && pnpm test:integration && pnpm build && pnpm seed:phase-6 && pnpm test:e2e --grep @phase-6"
}
```

```bash
pnpm verify:phase-6
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/conversions scripts src/test/e2e/conversions.spec.ts package.json
git commit -m "test: prove the conversion invariants and the latency budget"
```

---

## Phase 6 completion checklist

- [ ] `pnpm verify:phase-6` passes.
- [ ] Every row of the §6.2 status table has a route-contract test: 200, 200-replay, 400, 401 unknown key, 401 `Origin`, 409, 422 skew, 422 shape.
- [ ] A replay returns a **byte-identical** body and writes nothing.
- [ ] A conflicting repost writes nothing at all, proved by a before-and-after row count across every table.
- [ ] Money appears in every JSON response as a decimal string; `grep` finds no numeric money value in a captured response body.
- [ ] No response echoes a key, a key hash, an `fpHash`, or a `visitorId`.
- [ ] Changing a product rate between click and confirmation leaves `commission_amount` byte-identical.
- [ ] `converted_at` is stamped in the intake transaction, keeps the first order's timestamp, survives a cancellation, and is null for clicks that earned nothing — four separate tests.
- [ ] An `UNATTRIBUTED` conversion has zero attribution rows and is visible in the brand's queue.
- [ ] Every row of Appendix A.6 has a named test.
- [ ] `nextStatus` refuses `CANCELLED → CONFIRMED` and both `UNATTRIBUTED` transitions.
- [ ] Every confirm and cancel writes an `AuditEvent` in the same transaction as the status change.
- [ ] Conversions API p95 is under 200ms over 200 posts, recorded in `docs/development.md`.
