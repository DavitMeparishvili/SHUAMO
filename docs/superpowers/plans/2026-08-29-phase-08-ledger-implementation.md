# Phase 8 — Billing Periods & Creator Ledger Implementation Plan

> **Superseded lifecycle assumptions — 2026-09-05:** The
> [successful-sale lifecycle decision](2026-09-05-successful-sale-lifecycle.md)
> takes precedence over all older prose, code samples and tests below.
> Successful-sale webhooks immediately confirm sales and earn eligible commission.
> There is no manual order confirmation, pending sale commission, or UNATTRIBUTED
> order status. Attribution is independent of sale status. Confirmation time
> survives cancellation. Brand approval belongs to invoices; approval and period
> close release no funds. Collected brand payment releases funded commission.
> Apply the decision's acceptance tests when implementing this historical plan.

## Required webhook accrual work (2026-09-05)

- Replace `accrue-on-confirm` with `accrue-on-sale`; run it inside conversion
  intake's transaction after canonical attribution insertion.
- Remove pending-commission queries, manual confirmation hooks and fixtures.
- Confirmed sales without attribution accrue nothing. Preserve one ACCRUAL per
  positive canonical attribution and test replay/concurrent delivery idempotency.
- `confirmedAt` is acceptance time and remains after cancellation. Test reversal
  without mutating attribution amounts; write into the currently open period.


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Confirming an order writes money into an append-only ledger, and nothing in the system — not the application, not an admin, not a migration — can move an amount once it is written.

**Architecture:** One table that is only ever inserted into, two database CHECK constraints that make a causeless or wrongly-signed entry impossible, and a database role with no `UPDATE` or `DELETE` grant on it. The entry-construction logic is a pure function tested against every kind and every sign; the persistence layer only writes what that function returns.

**Tech Stack:** Prisma 7 · PostgreSQL roles and grants · Vitest property tests · the Phase 5 `Money` type.

**Spec:** `docs/superpowers/specs/2026-08-29-shuamo-r2-accounting-design.md` §3.2, §4.1–4.7, §5.1, §5.4, §9, §11, §12, Appendix A.2, A.3, A.6, A.7.

## Global Constraints

Inherited from the roadmap. The ones this phase exercises:

- **`LedgerEntry` rows are inserted and never updated or deleted. No exception, including corrections** — a correction is an `ADJUSTMENT` (R2 §4.6).
- `LedgerEntry.billingPeriodId` is always **the period that was open when the row was written** — never one derived from `confirmedAt` or `occurredAt` (R2 §4.3).
- No `LedgerEntry` may reference a `CLOSED` period.
- `Σ ACCRUED` for any creator is never negative.
- Every `ACCRUAL` has exactly one `Attribution`, and every `Attribution` on a `CONFIRMED` conversion has exactly one `ACCRUAL` of equal amount.
- Pending commission is **absent from the ledger**. "The brand has not confirmed yet" stays a query over `Attribution ⋈ Conversion` (R2 §3.2).
- Periods are semi-monthly — `1–15` and `16–end` — in Asia/Tbilisi.
- Each task ends in a commit.

---

## Blocked path

**R2 §10.3 — post-payout clawback — is undecided.** An order cancelled after the creator has been paid would drive `AVAILABLE` negative, and the policy that governs that has not been chosen.

This phase builds the domain function that handles all three cancellation states, and the third one **throws a named, tested error** rather than writing a row. That keeps the blocked path visibly blocked instead of silently doing whatever the code happens to do. Phase 10 wires the real release state; the decision must be made before that path can be enabled.

---

## Planned file structure

```
prisma/schema.prisma                                 + BillingPeriod, LedgerEntry,
                                                       PeriodStatus, LedgerBucket,
                                                       LedgerKind; Brand and Creator
                                                       column additions (R2 A.2)
prisma/migrations/…_phase_8_ledger/migration.sql     includes the app-role grants
src/modules/ledger/domain/period-label.ts            semi-monthly boundaries
src/modules/ledger/domain/period-label.test.ts
src/modules/ledger/domain/entries.ts                 the pure entry constructors
src/modules/ledger/domain/entries.test.ts
src/modules/ledger/domain/balance.ts                 sum by bucket
src/modules/ledger/domain/balance.test.ts
src/modules/ledger/ports/ledger-repository.ts
src/modules/ledger/ports/period-repository.ts
src/modules/ledger/application/accrue-on-confirm.ts  + test
src/modules/ledger/application/reverse-on-cancel.ts  + test
src/modules/ledger/application/write-adjustment.ts   + test
src/modules/ledger/application/get-balances.ts       + test
src/modules/ledger/infrastructure/prisma-ledger-repository.ts
src/modules/ledger/infrastructure/prisma-period-repository.ts
src/modules/ledger/infrastructure/ledger.integration.test.ts
src/modules/ledger/infrastructure/append-only.integration.test.ts
src/modules/ledger/infrastructure/ledger.property.test.ts
src/modules/ledger/index.ts
scripts/open-first-period.ts
scripts/seed-phase-08.ts
src/test/e2e/ledger.spec.ts                          @phase-8
```

---

### Task 1: Add the periods, the ledger, and the grants

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `src/modules/ledger/infrastructure/ledger.integration.test.ts`, `append-only.integration.test.ts`
- Create: `scripts/open-first-period.ts`

**Interfaces:**

- Consumes: `Creator`, `Brand`, `Attribution`, `AppUser`
- Produces: models `BillingPeriod`, `LedgerEntry`; enums `PeriodStatus`, `LedgerBucket`, `LedgerKind`; new columns on `Brand` and `Creator`

- [ ] **Step 1: Write the failing constraint test**

Both CHECK constraints, tested by trying to violate them from SQL — because that is the only way to prove the database is enforcing them rather than the application:

```ts
import { Prisma } from "@/src/generated/prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";

// One insert helper for every constraint case, so a test differs from its
// neighbours only in the field under test. `amount` arrives as a string and
// is converted here — a JavaScript number must never reach a money column.
function insertEntry(overrides: Record<string, unknown>) {
  const { amount = "1.00", ...rest } = overrides;
  return prisma.ledgerEntry.create({
    data: {
      bucket: "ACCRUED",
      kind: "ACCRUAL",
      memo: "",
      ...rest,
      amount: new Prisma.Decimal(amount as string),
    } as Prisma.LedgerEntryUncheckedCreateInput,
  });
}

describe("ledger_entry constraints", () => {
  it("accepts a well-formed ACCRUAL", async () => {
    const { creator, brand, period, attribution } = await seedAccruable();
    const entry = await prisma.ledgerEntry.create({
      data: {
        creatorId: creator.id,
        billingPeriodId: period.id,
        bucket: "ACCRUED",
        amount: new Prisma.Decimal("11.44"),
        kind: "ACCRUAL",
        brandId: brand.id,
        attributionId: attribution.id,
      },
    });

    expect(entry.amount.toFixed(2)).toBe("11.44");
  });

  it("refuses an ACCRUAL with no attribution — entry_has_a_cause", async () => {
    const { creator, brand, period } = await seedAccruable();
    await expect(
      prisma.ledgerEntry.create({
        data: {
          creatorId: creator.id, billingPeriodId: period.id, bucket: "ACCRUED",
          amount: new Prisma.Decimal("1.00"), kind: "ACCRUAL", brandId: brand.id,
        },
      }),
    ).rejects.toThrowError();
  });

  // entry_has_a_cause, one row per kind. Each case omits exactly the field
  // that kind requires and leaves everything else valid, so a rejection can
  // only come from the constraint under test.
  it.each([
    ["ACCRUAL missing its brand", { kind: "ACCRUAL", attributionId: ATTR, brandId: null }],
    ["ACCRUAL missing its attribution", { kind: "ACCRUAL", attributionId: null, brandId: BRAND }],
    ["REVERSAL missing its attribution", { kind: "REVERSAL", amount: "-1.00", attributionId: null, brandId: BRAND }],
    ["REVERSAL missing its brand", { kind: "REVERSAL", amount: "-1.00", attributionId: ATTR, brandId: null }],
    ["RELEASE missing its invoice", { kind: "RELEASE", invoiceId: null, brandId: BRAND }],
    ["RELEASE missing its brand", { kind: "RELEASE", invoiceId: INVOICE, brandId: null }],
    ["PAYOUT missing its payment order", { kind: "PAYOUT", bucket: "AVAILABLE", amount: "-1.00", paymentOrderId: null }],
    ["PAYOUT_REVERSAL missing its payment order", { kind: "PAYOUT_REVERSAL", bucket: "AVAILABLE", paymentOrderId: null }],
  ] as const)("refuses %s — entry_has_a_cause", async (_name, override) => {
    const { creator, period } = await seedAccruable();
    await expect(
      insertEntry({ creatorId: creator.id, billingPeriodId: period.id, ...override }),
    ).rejects.toThrowError();
  });

  it("refuses an ADJUSTMENT with no createdBy or an empty memo", async () => {
    const { creator, period } = await seedAccruable();
    for (const data of [
      { memo: "", createdById: someUserId },
      { memo: "a reason", createdById: null },
    ]) {
      await expect(
        prisma.ledgerEntry.create({
          data: {
            creatorId: creator.id, billingPeriodId: period.id, bucket: "ACCRUED",
            amount: new Prisma.Decimal("1.00"), kind: "ADJUSTMENT", ...data,
          },
        }),
      ).rejects.toThrowError();
    }
  });

  // entry_sign. Signs are not a matter of opinion (R2 A.6), so every wrong
  // combination is asserted rather than assumed.
  it.each([
    ["a negative ACCRUAL", { kind: "ACCRUAL", amount: "-1.00", bucket: "ACCRUED", attributionId: ATTR, brandId: BRAND }],
    ["an ACCRUAL into AVAILABLE", { kind: "ACCRUAL", amount: "1.00", bucket: "AVAILABLE", attributionId: ATTR, brandId: BRAND }],
    ["a positive REVERSAL", { kind: "REVERSAL", amount: "1.00", bucket: "ACCRUED", attributionId: ATTR, brandId: BRAND }],
    ["a positive PAYOUT", { kind: "PAYOUT", amount: "1.00", bucket: "AVAILABLE", paymentOrderId: PO }],
    ["a PAYOUT out of ACCRUED", { kind: "PAYOUT", amount: "-1.00", bucket: "ACCRUED", paymentOrderId: PO }],
    ["a negative PAYOUT_REVERSAL", { kind: "PAYOUT_REVERSAL", amount: "-1.00", bucket: "AVAILABLE", paymentOrderId: PO }],
    ["a PAYOUT_REVERSAL into ACCRUED", { kind: "PAYOUT_REVERSAL", amount: "1.00", bucket: "ACCRUED", paymentOrderId: PO }],
  ] as const)("refuses %s — entry_sign", async (_name, override) => {
    const { creator, period } = await seedAccruable();
    await expect(
      insertEntry({ creatorId: creator.id, billingPeriodId: period.id, ...override }),
    ).rejects.toThrowError();
  });

  it("refuses an amount of zero, whatever the kind", async () => {
    const { creator, period, brand } = await seedAccruable();
    await expect(
      insertEntry({
        creatorId: creator.id, billingPeriodId: period.id, bucket: "ACCRUED",
        amount: "0.00", kind: "ACCRUAL", attributionId: ATTR, brandId: brand.id,
      }),
    ).rejects.toThrowError();
  });

  it("permits a RELEASE of either sign — its pairing is checked in §8, not here", async () => {
    // Both rows of the pair must be insertable, which is why entry_sign
    // deliberately says nothing about RELEASE.
    await expect(insertRelease("-11.44", "ACCRUED")).resolves.toBeDefined();
    await expect(insertRelease("11.44", "AVAILABLE")).resolves.toBeDefined();
  });

  it("refuses a second ACCRUAL for one attribution — ledger_accrual_once_idx", async () => {
    const data = accrualFor(attribution);
    await prisma.ledgerEntry.create({ data });
    await expect(prisma.ledgerEntry.create({ data })).rejects.toThrowError();
  });

  it("permits a REVERSAL for an attribution that already has an ACCRUAL", async () => {
    // The partial unique index is on kind = 'ACCRUAL' only.
    await prisma.ledgerEntry.create({ data: accrualFor(attribution) });
    await expect(
      prisma.ledgerEntry.create({ data: reversalFor(attribution) }),
    ).resolves.toBeDefined();
  });
});

describe("billing_period constraints", () => {
  const august = {
    label: "2026-08-H1",
    startsAt: new Date("2026-07-31T20:00:00Z"),
    endsAt: new Date("2026-08-15T20:00:00Z"),
  };

  it("refuses endsAt at or before startsAt", async () => {
    for (const endsAt of [august.startsAt, new Date("2026-07-01T00:00:00Z")]) {
      await expect(
        prisma.billingPeriod.create({ data: { ...august, endsAt } }),
      ).rejects.toThrowError();
    }
  });

  it("refuses CLOSED with no closedAt — closed_at_matches_status", async () => {
    await expect(
      prisma.billingPeriod.create({ data: { ...august, status: "CLOSED" } }),
    ).rejects.toThrowError();
  });

  it("refuses OPEN with a closedAt", async () => {
    await expect(
      prisma.billingPeriod.create({
        data: { ...august, status: "OPEN", closedAt: new Date() },
      }),
    ).rejects.toThrowError();
  });

  it("refuses a duplicate label", async () => {
    await prisma.billingPeriod.create({ data: august });
    await expect(
      prisma.billingPeriod.create({
        data: { ...august, startsAt: new Date("2026-09-30T20:00:00Z") },
      }),
    ).rejects.toThrowError();
  });

  it("refuses a duplicate startsAt", async () => {
    await prisma.billingPeriod.create({ data: august });
    await expect(
      prisma.billingPeriod.create({ data: { ...august, label: "2026-08-H1-again" } }),
    ).rejects.toThrowError();
  });
});
```

- [ ] **Step 2: Run and confirm failure, then write the schema**

Transcribe R2 Appendix A.3 and A.6 field for field:

```prisma
enum PeriodStatus { OPEN CLOSED }
enum LedgerBucket { ACCRUED AVAILABLE }
enum LedgerKind   { ACCRUAL RELEASE PAYOUT PAYOUT_REVERSAL REVERSAL ADJUSTMENT }

/// Half-open [startsAt, endsAt) in Asia/Tbilisi. Exactly one row is OPEN at
/// any time — enforced in the close transaction rather than by a partial
/// unique index, because the index would forbid the instant inside that
/// transaction when the next period exists and the old one is not yet closed.
model BillingPeriod {
  id        String       @id @default(uuid()) @db.Uuid
  label     String       @unique                      // '2026-08-H2'
  startsAt  DateTime     @unique @map("starts_at") @db.Timestamptz(6)
  endsAt    DateTime     @map("ends_at") @db.Timestamptz(6)
  status    PeriodStatus @default(OPEN)
  closedAt  DateTime?    @map("closed_at") @db.Timestamptz(6)
  createdAt DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)

  entries LedgerEntry[]

  @@map("billing_period")
}

/// Append-only. Nothing here is ever UPDATEd or DELETEd; a correction is an
/// ADJUSTMENT. amount is signed: a debit is a negative row, never an edit.
/// billingPeriodId is always the period OPEN when the row was written.
model LedgerEntry {
  id              String       @id @default(uuid()) @db.Uuid
  creatorId       String       @map("creator_id") @db.Uuid
  billingPeriodId String       @map("billing_period_id") @db.Uuid
  bucket          LedgerBucket
  amount          Decimal      @db.Decimal(12, 2)
  kind            LedgerKind
  brandId         String?      @map("brand_id") @db.Uuid
  attributionId   String?      @map("attribution_id") @db.Uuid
  invoiceId       String?      @map("invoice_id") @db.Uuid
  paymentOrderId  String?      @map("payment_order_id") @db.Uuid
  memo            String       @default("")
  createdById     String?      @map("created_by") @db.Uuid
  createdAt       DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)

  creator       Creator       @relation(fields: [creatorId], references: [id], onDelete: Restrict)
  billingPeriod BillingPeriod @relation(fields: [billingPeriodId], references: [id], onDelete: Restrict)
  brand         Brand?        @relation(fields: [brandId], references: [id], onDelete: Restrict)
  attribution   Attribution?  @relation(fields: [attributionId], references: [id], onDelete: Restrict)
  createdBy     AppUser?      @relation(fields: [createdById], references: [id], onDelete: SetNull)

  @@index([creatorId, bucket], map: "ledger_balance_idx")
  @@index([billingPeriodId, brandId, kind], map: "ledger_invoicing_idx")
  @@index([creatorId, billingPeriodId], map: "ledger_statement_idx")
  @@map("ledger_entry")
}
```

`invoiceId` and `paymentOrderId` are plain UUID columns with **no relation** in this phase, because `invoice` and `payment_order` do not exist yet. Phase 9 and Phase 10 add the foreign keys. Note this in the schema comment so it does not read as an oversight.

Also add R2 A.2's columns:

```sql
ALTER TABLE "brand"
  ADD COLUMN legal_name        text         NOT NULL DEFAULT '',
  ADD COLUMN tax_id            text         NOT NULL DEFAULT '',
  ADD COLUMN platform_fee_rate numeric(9,4) NOT NULL DEFAULT 0
    CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 1),
  ADD COLUMN net_terms_days    integer      NOT NULL DEFAULT 7
    CHECK (net_terms_days >= 0);

ALTER TABLE "creator" ADD COLUMN tax_id text;
```

- [ ] **Step 3: Add the CHECK constraints by hand**

Copy R2 A.6's `entry_has_a_cause` and `entry_sign` verbatim into the migration, plus `CHECK (amount <> 0)`, plus the partial unique index `ledger_accrual_once_idx`, plus the `billing_period` constraints from A.3.

- [ ] **Step 4: Take away the grants**

R2 §12 says the application role holds no `UPDATE` or `DELETE` on `ledger_entry`. Implement it in the same migration:

```sql
-- R2 §12. The application inserts and selects; nothing else. This is the
-- one invariant in A.7 that a constraint cannot express and a role can.
REVOKE UPDATE, DELETE ON TABLE ledger_entry FROM shuamo_app;
GRANT  SELECT, INSERT ON TABLE ledger_entry TO   shuamo_app;
```

This requires the application to connect as `shuamo_app` rather than as the owner. Add the role to `compose.yaml` and `compose.production.yaml` init, point `DATABASE_URL` at it, and keep a separate `DATABASE_URL_MIGRATIONS` for the owner that only `prisma migrate deploy` uses. Add `DATABASE_URL_MIGRATIONS` to `src/config/env.ts` with its own test.

- [ ] **Step 5: Write the append-only proof**

`append-only.integration.test.ts` — the test that makes R2 §4.6's first bullet real:

```ts
describe("ledger_entry is append-only at the database", () => {
  it("refuses an UPDATE as the application role", async () => {
    const { entry } = await seedAccrual();
    await expect(
      appRoleClient.$executeRaw`UPDATE ledger_entry SET amount = 1 WHERE id = ${entry.id}::uuid`,
    ).rejects.toThrowError(/permission denied/i);
  });

  it("refuses a DELETE as the application role", async () => {
    const { entry } = await seedAccrual();
    await expect(
      appRoleClient.$executeRaw`DELETE FROM ledger_entry WHERE id = ${entry.id}::uuid`,
    ).rejects.toThrowError(/permission denied/i);
  });

  it("permits INSERT and SELECT as the application role", async () => {
    await expect(appRoleClient.ledgerEntry.findMany()).resolves.toBeDefined();
  });

  it("exposes no update or delete path through the module's public surface", () => {
    const source = readFileSync("src/modules/ledger/infrastructure/prisma-ledger-repository.ts", "utf8");
    expect(source).not.toMatch(/ledgerEntry\.(update|delete|upsert|updateMany|deleteMany)/);
  });
});
```

- [ ] **Step 6: Open the first period**

`scripts/open-first-period.ts` creates the period covering today, so the system is never in a state where a confirmation has nowhere to land.

- [ ] **Step 7: Migrate, diff against A.3 and A.6, run**

```bash
pnpm db:migrate --name phase_8_ledger && pnpm db:migrate:test && pnpm test:integration
```

- [ ] **Step 8: Commit**

```bash
git add prisma src/modules/ledger scripts compose*.yaml src/config
git commit -m "feat: add billing periods and an append-only creator ledger"
```

---

### Task 2: Compute semi-monthly period boundaries

**Files:**

- Create: `src/modules/ledger/domain/period-label.ts`, `period-label.test.ts`

**Interfaces:**

- Consumes: Phase 7's `billing-month` helpers
- Produces:
  - `type PeriodBounds = { label: string; startsAt: Date; endsAt: Date }`
  - `periodContaining(at: Date): PeriodBounds`
  - `periodAfter(period: PeriodBounds): PeriodBounds`
  - `parsePeriodLabel(label: string): PeriodBounds`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { periodAfter, periodContaining, parsePeriodLabel } from "./period-label";

describe("periodContaining", () => {
  it("labels the first half H1", () => {
    expect(periodContaining(new Date("2026-08-05T10:00:00Z")).label).toBe("2026-08-H1");
  });

  it("labels the second half H2", () => {
    expect(periodContaining(new Date("2026-08-20T10:00:00Z")).label).toBe("2026-08-H2");
  });

  it("puts the 15th in H1 and the 16th in H2, by Tbilisi time", () => {
    expect(periodContaining(new Date("2026-08-15T19:59:59Z")).label).toBe("2026-08-H1");
    // 2026-08-15T20:00Z is 16 August 00:00 in Tbilisi.
    expect(periodContaining(new Date("2026-08-15T20:00:00Z")).label).toBe("2026-08-H2");
  });

  it("starts H1 at Tbilisi midnight on the 1st", () => {
    expect(periodContaining(new Date("2026-08-05T10:00:00Z")).startsAt.toISOString()).toBe(
      "2026-07-31T20:00:00.000Z",
    );
  });

  it("ends H2 at the start of the next month's H1", () => {
    const h2 = periodContaining(new Date("2026-08-20T10:00:00Z"));
    expect(h2.endsAt.toISOString()).toBe("2026-08-31T20:00:00.000Z");
  });

  it("handles a 28-day February", () => {
    const h2 = parsePeriodLabel("2027-02-H2");
    expect(h2.endsAt.toISOString()).toBe("2027-02-28T20:00:00.000Z");
  });

  it("handles a 29-day February", () => {
    expect(parsePeriodLabel("2028-02-H2").endsAt.toISOString()).toBe("2028-02-29T20:00:00.000Z");
  });

  it("handles a 31-day month", () => {
    expect(parsePeriodLabel("2026-01-H2").endsAt.toISOString()).toBe("2026-01-31T20:00:00.000Z");
  });

  it("makes consecutive periods contiguous and non-overlapping", () => {
    let period = parsePeriodLabel("2026-01-H1");
    for (let i = 0; i < 48; i += 1) {
      const next = periodAfter(period);
      expect(next.startsAt.getTime()).toBe(period.endsAt.getTime());
      period = next;
    }
  });

  it("rolls H2 into the next month's H1 across a year boundary", () => {
    expect(periodAfter(parsePeriodLabel("2026-12-H2")).label).toBe("2027-01-H1");
  });

  it("rejects a malformed label", () => {
    for (const bad of ["2026-08", "2026-08-H3", "2026-13-H1", "H1"]) {
      expect(() => parsePeriodLabel(bad)).toThrowError();
    }
  });
});
```

The 48-period contiguity loop is worth more than any single boundary assertion: it proves that no instant in two years falls into two periods or into none, which is the property invoicing actually depends on.

- [ ] **Step 2: Run, confirm failure, implement, commit**

```bash
pnpm vitest run src/modules/ledger/domain/period-label.test.ts
git add src/modules/ledger/domain
git commit -m "feat: compute semi-monthly billing period boundaries"
```

---

### Task 3: Construct ledger entries

**Files:**

- Create: `src/modules/ledger/domain/entries.ts`, `entries.test.ts`
- Create: `src/modules/ledger/domain/balance.ts`, `balance.test.ts`

**Interfaces:**

- Consumes: `Money`
- Produces:
  - `type EntryDraft = { creatorId; billingPeriodId; bucket; amount: Money; kind; brandId?; attributionId?; invoiceId?; paymentOrderId?; memo; createdById? }`
  - `entriesForConfirmation(input): EntryDraft[]`
  - `entriesForCancellation(input): EntryDraft[]` — throws `ClawbackPolicyUndecided` for the paid-out case
  - `entriesForAdjustment(input): EntryDraft[]`
  - `balanceOf(entries, bucket): Money`

- [ ] **Step 1: Write the failing entry test**

```ts
import { describe, expect, it } from "vitest";
import { Money } from "@/src/modules/shared";
import {
  ClawbackPolicyUndecided,
  entriesForAdjustment,
  entriesForCancellation,
  entriesForConfirmation,
} from "./entries";

const period = "period-1";
const attributions = [
  { id: "a1", creatorId: "nino", brandId: "b1", amount: Money.of("11.44") },
  { id: "a2", creatorId: "dato", brandId: "b1", amount: Money.of("11.44") },
];

describe("entriesForConfirmation", () => {
  it("writes one positive ACCRUED entry per attribution", () => {
    const entries = entriesForConfirmation({ attributions, billingPeriodId: period });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      creatorId: "nino",
      billingPeriodId: period,
      bucket: "ACCRUED",
      kind: "ACCRUAL",
      brandId: "b1",
      attributionId: "a1",
    });
    expect(entries[0]?.amount.toStorageString()).toBe("11.44");
  });

  it("writes nothing for an order with no attributions", () => {
    expect(entriesForConfirmation({ attributions: [], billingPeriodId: period })).toEqual([]);
  });

  it("skips a zero-amount attribution — CHECK (amount <> 0) would refuse it", () => {
    const entries = entriesForConfirmation({
      attributions: [{ id: "a3", creatorId: "nino", brandId: "b1", amount: Money.ZERO }],
      billingPeriodId: period,
    });
    expect(entries).toEqual([]);
  });

  it("writes two entries for one creator earning on two lines of one order", () => {
    const entries = entriesForConfirmation({
      attributions: [
        { id: "a1", creatorId: "nino", brandId: "b1", amount: Money.of("11.44") },
        { id: "a2", creatorId: "nino", brandId: "b1", amount: Money.of("25.42") },
      ],
      billingPeriodId: period,
    });
    expect(entries).toHaveLength(2);
  });
});

describe("entriesForCancellation", () => {
  it("debits ACCRUED when the invoice has not been paid", () => {
    const entries = entriesForCancellation({
      attributions,
      billingPeriodId: period,
      releaseState: "not_released",
    });

    expect(entries[0]).toMatchObject({ bucket: "ACCRUED", kind: "REVERSAL" });
    expect(entries[0]?.amount.toStorageString()).toBe("-11.44");
  });

  it("debits AVAILABLE when the brand paid but the creator has not been paid out", () => {
    const entries = entriesForCancellation({
      attributions,
      billingPeriodId: period,
      releaseState: "released",
    });

    expect(entries[0]).toMatchObject({ bucket: "AVAILABLE", kind: "REVERSAL" });
    expect(entries[0]?.amount.toStorageString()).toBe("-11.44");
  });

  it("REFUSES to write anything once the creator has been paid out — R2 §10.3 is undecided", () => {
    expect(() =>
      entriesForCancellation({ attributions, billingPeriodId: period, releaseState: "paid_out" }),
    ).toThrowError(ClawbackPolicyUndecided);
  });

  it("names the open question in the error, so the operator knows what to escalate", () => {
    try {
      entriesForCancellation({ attributions, billingPeriodId: period, releaseState: "paid_out" });
    } catch (error) {
      expect((error as Error).message).toMatch(/R2 §10\.3/);
    }
  });

  it("carries the attribution and the brand on every reversal", () => {
    const entries = entriesForCancellation({
      attributions, billingPeriodId: period, releaseState: "not_released",
    });
    expect(entries.every((e) => e.attributionId !== undefined && e.brandId !== undefined)).toBe(true);
  });
});

describe("entriesForAdjustment", () => {
  it("writes one entry of either sign with a memo and an author", () => {
    const entries = entriesForAdjustment({
      creatorId: "nino",
      billingPeriodId: period,
      bucket: "AVAILABLE",
      amount: Money.of("-5.00"),
      memo: "duplicate payout corrected",
      createdById: "admin-1",
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: "ADJUSTMENT", memo: "duplicate payout corrected" });
  });

  it("refuses an empty memo before the database has to", () => {
    expect(() =>
      entriesForAdjustment({ creatorId: "nino", billingPeriodId: period, bucket: "AVAILABLE", amount: Money.of("1.00"), memo: "  ", createdById: "admin-1" }),
    ).toThrowError(/memo/);
  });

  it("refuses a zero amount", () => {
    expect(() =>
      entriesForAdjustment({ creatorId: "nino", billingPeriodId: period, bucket: "AVAILABLE", amount: Money.ZERO, memo: "why", createdById: "admin-1" }),
    ).toThrowError();
  });
});
```

- [ ] **Step 2: Run, confirm failure, implement**

```ts
export class ClawbackPolicyUndecided extends Error {
  constructor() {
    super(
      "Cancelling an order after the creator was paid out would drive AVAILABLE " +
        "negative. R2 §10.3 has not been decided: may Σ AVAILABLE go negative " +
        "for a creator? Escalate rather than guessing.",
    );
    this.name = "ClawbackPolicyUndecided";
  }
}
```

The error message names the question rather than the symptom, so an operator who hits it in production knows what decision unblocks them.

- [ ] **Step 3: Implement and test `balanceOf`**

Trivially small, but it is the function every screen in Phase 11 reads, so it gets tests for the empty case, the mixed-bucket case, and the case where a bucket sums to exactly zero.

- [ ] **Step 4: Run and commit**

```bash
pnpm vitest run src/modules/ledger/domain
git add src/modules/ledger/domain
git commit -m "feat: construct ledger entries, blocking the undecided clawback path"
```

---

### Task 4: Accrue on confirmation, reverse on cancellation

**Files:**

- Create: `src/modules/ledger/ports/*.ts`
- Create: `src/modules/ledger/application/accrue-on-confirm.ts`, `reverse-on-cancel.ts`, `write-adjustment.ts`, `get-balances.ts` and their tests
- Create: `src/modules/ledger/infrastructure/prisma-*.ts`
- Modify: `src/modules/conversions/application/decide-order.ts`

**Interfaces:**

- Consumes: `entriesForConfirmation`, `entriesForCancellation`, the period repository
- Produces:
  - `accrueOnConfirm(deps)(tx, conversionId): Promise<{ written: number }>`
  - `reverseOnCancel(deps)(tx, conversionId): Promise<{ written: number }>`
  - `currentOpenPeriod(deps)(): Promise<BillingPeriod>` — throws if none is open

- [ ] **Step 1: Write the failing test**

The rule that matters here is which period an entry lands in:

```ts
describe("accrueOnConfirm", () => {
  it("writes into the currently OPEN period, not the one the order belongs to", async () => {
    const written: unknown[] = [];
    await accrueOnConfirm({
      periods: { currentOpen: async () => ({ id: "period-current", status: "OPEN" }) },
      attributions: { listForConversion: async () => attributions },
      ledger: { insertMany: async (e) => void written.push(...e) },
    })(fakeTx, "cv1");

    expect(written.every((e) => e.billingPeriodId === "period-current")).toBe(true);
  });

  it("refuses to write into a CLOSED period", async () => {
    await expect(
      accrueOnConfirm({
        periods: { currentOpen: async () => ({ id: "p", status: "CLOSED" }) },
        attributions: { listForConversion: async () => attributions },
        ledger: { insertMany: async () => undefined },
      })(fakeTx, "cv1"),
    ).rejects.toThrowError(/closed/i);
  });

  it("throws when no period is open, rather than losing the money", async () => {
    await expect(
      accrueOnConfirm({
        periods: { currentOpen: async () => undefined },
        attributions: { listForConversion: async () => attributions },
        ledger: { insertMany: async () => undefined },
      })(fakeTx, "cv1"),
    ).rejects.toThrowError(/no open billing period/i);
  });

  it("writes nothing for a conversion with no attributions", async () => {
    const written: unknown[] = [];
    await accrueOnConfirm({
      periods: { currentOpen: async () => openPeriod },
      attributions: { listForConversion: async () => [] },
      ledger: { insertMany: async (e) => void written.push(...e) },
    })(fakeTx, "cv1");

    expect(written).toEqual([]);
  });
});

describe("reverseOnCancel", () => {
  it("writes nothing when the order was PENDING — there was never an accrual", async () => {
    const written: unknown[] = [];
    await reverseOnCancel(deps({ previousStatus: "PENDING", insert: (e) => written.push(...e) }))(
      fakeTx, "cv1",
    );
    expect(written).toEqual([]);
  });

  it("writes one negative entry per attribution when the order was CONFIRMED", async () => {
    const written: unknown[] = [];
    await reverseOnCancel(deps({ previousStatus: "CONFIRMED", insert: (e) => written.push(...e) }))(
      fakeTx, "cv1",
    );

    expect(written).toHaveLength(2);
    expect(written.every((e) => e.amount.isNegative())).toBe(true);
  });

  it("lands the reversal in the currently open period, not the accrual's period", async () => {
    const written: unknown[] = [];
    await reverseOnCancel(
      deps({
        previousStatus: "CONFIRMED",
        accrualPeriodId: "period-old",
        currentPeriodId: "period-new",
        insert: (e) => written.push(...e),
      }),
    )(fakeTx, "cv1");

    expect(written.every((e) => e.billingPeriodId === "period-new")).toBe(true);
  });
});
```

- [ ] **Step 2: Wire into the order lifecycle, in the same transaction**

Modify Phase 6's `decideOrder` so `CONFIRM` calls `accrueOnConfirm` and `CANCEL` calls `reverseOnCancel`, inside the transaction that already carries the status change and the audit event. R2 §5.1 requires "the same transaction that sets `Conversion.status = CONFIRMED`", and a separate transaction would leave a window where the order is confirmed and the creator has not been paid.

In this phase `releaseState` is always `not_released`, because there are no invoices yet. Pass it as a value the repository computes rather than a literal, so Phase 10 only changes the repository.

- [ ] **Step 3: Write the integration proof**

```ts
it("moves the creator's ACCRUED balance by exactly the attribution total", async () => {
  const { conversionId, creatorId } = await seedPendingOrder("22.88 split two ways");

  expect((await balances(creatorId)).accrued.toStorageString()).toBe("0.00");
  await confirmOrder(conversionId);
  expect((await balances(creatorId)).accrued.toStorageString()).toBe("11.44");
});

it("moves it back on cancellation, leaving both rows visible", async () => {
  const { conversionId, creatorId } = await seedConfirmedOrder();
  await cancelOrder(conversionId);

  expect((await balances(creatorId)).accrued.toStorageString()).toBe("0.00");
  expect(await prisma.ledgerEntry.count({ where: { creatorId } })).toBe(2);
});

it("lands a confirmation made after its period closed in the OPEN period", async () => {
  const { conversionId } = await seedPendingOrder();
  const oldPeriod = await currentPeriod();
  await closePeriodAndOpenNext();

  await confirmOrder(conversionId);
  const [entry] = await prisma.ledgerEntry.findMany();

  expect(entry?.billingPeriodId).not.toBe(oldPeriod.id);
});

it("writes exactly one ACCRUAL per attribution, of exactly that amount", async () => {
  const { conversionId } = await seedThreeAttributionOrder();
  await confirmOrder(conversionId);

  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT a.id
    FROM attribution a
    JOIN conversion_item ci ON ci.id = a.conversion_item_id
    JOIN conversion cv ON cv.id = ci.conversion_id
    LEFT JOIN ledger_entry le ON le.attribution_id = a.id AND le.kind = 'ACCRUAL'
    WHERE cv.status = 'CONFIRMED'
      AND (le.id IS NULL OR le.amount <> a.commission_amount)
  `;
  expect(rows).toEqual([]);
});
```

That last query is R2 §8's accrual-completeness check, arriving early. Phase 11 promotes it to a scheduled job; here it is a test, and writing it now means the job later has a proven query rather than a new one.

- [ ] **Step 4: Run and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/ledger src/modules/conversions
git commit -m "feat: accrue on confirmation and reverse on cancellation, atomically"
```

---

### Task 5: Prove the ledger properties

**Files:**

- Create: `src/modules/ledger/infrastructure/ledger.property.test.ts`
- Create: `scripts/seed-phase-08.ts`, `src/test/e2e/ledger.spec.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: the whole stack
- Produces: `verify:phase-8`

- [ ] **Step 1: Write the property test**

A randomised sequence of legal operations, with the invariants asserted after **every single step**:

```ts
describe("ledger properties", () => {
  it("Σ ACCRUED for a creator is never negative under any legal sequence", async () => {
    const random = mulberry32(20260829);
    const orders = await seedOrders(20);

    for (let step = 0; step < 200; step += 1) {
      const order = orders[Math.floor(random() * orders.length)]!;
      const action = random() < 0.6 ? "CONFIRM" : "CANCEL";

      try {
        await decideOrder(order.brandId, order.id, action);
      } catch {
        continue;   // illegal transitions are expected; they change nothing
      }

      for (const creatorId of CREATOR_IDS) {
        const { accrued } = await balances(creatorId);
        expect(accrued.isNegative(), `after step ${step} for ${creatorId}`).toBe(false);
      }
    }
  });

  it("never updates or deletes a row across a randomised run", async () => {
    const before = await prisma.$queryRaw<{ id: string; amount: string }[]>`
      SELECT id, amount::text FROM ledger_entry ORDER BY id
    `;

    await runRandomisedSequence(100);

    const after = await prisma.$queryRaw<{ id: string; amount: string }[]>`
      SELECT id, amount::text FROM ledger_entry ORDER BY id
    `;

    // Every row that existed before must still exist, byte-identical.
    for (const row of before) {
      expect(after.find((r) => r.id === row.id)).toEqual(row);
    }
  });

  it("keeps Σ ACCRUAL equal to Σ confirmed attributions at every step", async () => {
    await runRandomisedSequence(100, async () => {
      const [{ mismatch }] = await prisma.$queryRaw<{ mismatch: bigint }[]>`
        SELECT count(*) AS mismatch
        FROM attribution a
        JOIN conversion_item ci ON ci.id = a.conversion_item_id
        JOIN conversion cv ON cv.id = ci.conversion_id
        LEFT JOIN ledger_entry le ON le.attribution_id = a.id AND le.kind = 'ACCRUAL'
        WHERE cv.status = 'CONFIRMED' AND (le.id IS NULL OR le.amount <> a.commission_amount)
      `;
      expect(Number(mismatch)).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Write the browser journey**

```ts
test("@phase-8 confirming an order moves the creator's accrued balance", async ({ page }) => {
  await signInAsBrand(page, "en");
  await page.goto("/en/brand/orders");
  await page.getByRole("button", { name: /confirm/i }).first().click();

  await signInAsCreator(page, "en");
  await page.goto("/en/creator/earnings");
  await expect(page.getByText("11.44 ₾")).toBeVisible();
});
```

Phase 11 builds the full five-number view; this asserts only that the number moved.

- [ ] **Step 3: Wire the gate and run it**

```json
{
  "seed:phase-8": "tsx scripts/seed-phase-08.ts",
  "verify:phase-8": "pnpm verify:mvp && pnpm db:migrate:test && pnpm test:integration && pnpm build && pnpm seed:phase-8 && pnpm test:e2e --grep @phase-8"
}
```

```bash
pnpm verify:phase-8
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/ledger scripts src/test/e2e/ledger.spec.ts package.json
git commit -m "test: prove ledger conservation, non-negativity and append-only behaviour"
```

---

## Phase 8 completion checklist

- [ ] `pnpm verify:phase-8` passes.
- [ ] `UPDATE` and `DELETE` on `ledger_entry` both fail with `permission denied` as the application role.
- [ ] The repository source contains no `update`, `delete`, or `upsert` call against `ledgerEntry`.
- [ ] `entry_has_a_cause` rejects a causeless entry of every kind; `entry_sign` rejects every wrong sign and wrong bucket — one test per case.
- [ ] A second `ACCRUAL` for one attribution is refused by `ledger_accrual_once_idx`.
- [ ] A `RELEASE` of either sign is insertable, because its pairing is checked in Phase 11, not by a constraint.
- [ ] Semi-monthly periods are contiguous and non-overlapping across 48 consecutive periods.
- [ ] The 15th/16th boundary is correct at Tbilisi midnight, proved at `2026-08-15T19:59:59Z` and `2026-08-15T20:00:00Z`.
- [ ] `PENDING → CANCELLED` writes nothing.
- [ ] A confirmation arriving after its period closed lands in the open period.
- [ ] Writing into a `CLOSED` period is refused, and a system with no open period throws rather than losing money.
- [ ] Cancelling after a payout throws `ClawbackPolicyUndecided`, and the message names R2 §10.3.
- [ ] Accrual and the status change commit in one transaction — proved by forcing the ledger insert to fail and asserting the conversion is still `PENDING`.
- [ ] `Σ ACCRUED` stays non-negative across a 200-step randomised sequence.
- [ ] Every pre-existing ledger row is byte-identical after a randomised run.
