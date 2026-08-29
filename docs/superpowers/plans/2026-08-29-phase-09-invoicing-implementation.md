# Phase 9 — Invoicing & the Close Job Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Closing a period issues one gapless-numbered invoice per brand with entries in it, and re-running the job changes nothing.

**Architecture:** The close job is three steps with a deliberate transaction boundary after the first: closing the period and opening the next one commits on its own, so every entry written afterwards lands in the new period and a brand confirming an order mid-run never blocks. Invoice numbers come from a counter row taken under `SELECT … FOR UPDATE` — not a sequence, because sequences gap on rollback and a gap is not explicable to a tax authority. Invoice arithmetic is a pure function.

**Tech Stack:** Prisma interactive transactions with `FOR UPDATE` · the Phase 7 worker scheduler · the Phase 1 component kit.

**Spec:** `docs/superpowers/specs/2026-08-29-shuamo-r2-accounting-design.md` §3.1, §4.6, §4.7, §5.2, §5.4, §6, §7.2, §9, §11, §12, Appendix A.3, A.4.

## Global Constraints

Inherited from the roadmap. The ones this phase exercises:

- **Invoice numbering is gapless.** `XU-YYYY-NNNNNN` from a locked counter row inside the invoice's own transaction. A PostgreSQL sequence is the obvious choice and the wrong one (R2 §5.2).
- Invoice totals are **stored, not derived**: an invoice must still say what it said on the day it was issued, even after a later cancellation moves the underlying figures (R2 §3.2).
- `feeRate` is a **snapshot** of `brand.platform_fee_rate` at issue. Changing the brand's rate never moves an issued invoice.
- `commissionTotal` sums `ACCRUAL` **and** `REVERSAL` for `(brand, period)`. A reversal nets down the next invoice automatically, and may make `totalDue` negative — which is carried, not clamped (R2 §5.4).
- There is no `InvoiceLine` table. The per-creator breakdown is derivable and stable, because a closed period's entry set is frozen forever (R2 §3.2).
- There is no `OVERDUE` status. Overdue is `status = ISSUED AND dueAt < now()` — a query, not a state (R2 §4.4).
- **The close job is idempotent.** Re-running it issues no duplicate invoice and drafts no duplicate payout.
- Each task ends in a commit.

---

## Configuration, not columns

R2 §12 says SHUAMO's own VAT status, the payout minimum, and the default net terms are environment configuration. Add to `src/config/env.ts` with its own test in Task 1:

```
PLATFORM_VAT_REGISTERED   "true" | "false"
PLATFORM_VAT_RATE         decimal string, "0.18"
PAYOUT_MINIMUM_GEL        decimal string, "20.00"
DEFAULT_NET_TERMS_DAYS    integer, 7
```

`brand.vat_registered` keeps its R1 meaning and is unrelated: it derives *line* VAT inside the attribution calculator. SHUAMO's VAT status is the same for every invoice SHUAMO issues, so it is not a brand column (R2 §4.2).

---

## Planned file structure

```
prisma/schema.prisma                                  + Invoice, InvoiceCounter,
                                                        InvoiceStatus; the ledger's
                                                        invoice_id foreign key
src/modules/invoicing/domain/invoice-number.ts        format + parse
src/modules/invoicing/domain/invoice-number.test.ts
src/modules/invoicing/domain/invoice-totals.ts        the R2 §5.2 arithmetic
src/modules/invoicing/domain/invoice-totals.test.ts
src/modules/invoicing/ports/invoice-repository.ts
src/modules/invoicing/ports/counter-repository.ts
src/modules/invoicing/application/issue-invoice.ts    + test
src/modules/invoicing/application/close-period.ts     the R2 §6 job
src/modules/invoicing/application/close-period.test.ts
src/modules/invoicing/application/get-brand-billing.ts + test
src/modules/invoicing/infrastructure/prisma-invoice-repository.ts
src/modules/invoicing/infrastructure/prisma-counter-repository.ts   FOR UPDATE
src/modules/invoicing/infrastructure/invoicing.integration.test.ts
src/modules/invoicing/infrastructure/numbering.integration.test.ts
src/modules/invoicing/ui/invoice-list.tsx
src/modules/invoicing/ui/invoice-detail.tsx
src/modules/invoicing/index.ts
src/modules/worker/jobs/close-period-job.ts           + test
app/[locale]/brand/billing/page.tsx
app/[locale]/brand/billing/[invoiceId]/page.tsx
scripts/close-period.ts
scripts/seed-phase-09.ts
src/test/e2e/invoicing.spec.ts                        @phase-9
```

---

### Task 1: Add the invoice tables and the platform configuration

**Files:**

- Modify: `prisma/schema.prisma`, `src/config/env.ts`, `src/config/env.test.ts`
- Create: `src/modules/invoicing/infrastructure/invoicing.integration.test.ts`

**Interfaces:**

- Consumes: `Brand`, `BillingPeriod`, `LedgerEntry`
- Produces: models `Invoice`, `InvoiceCounter`; enum `InvoiceStatus`; the `ledger_entry.invoice_id` foreign key deferred from Phase 8

- [ ] **Step 1: Write the failing constraint test**

```ts
describe("invoice constraints", () => {
  it("accepts a well-formed invoice", async () => {
    const invoice = await createInvoice({
      commissionTotal: "100.00", feeRate: "0.15", feeAmount: "15.00",
      feeVatAmount: "2.70", totalDue: "117.70",
    });
    expect(invoice.number).toMatch(/^XU-\d{4}-\d{6}$/);
  });

  it("refuses totals that do not add up — totals_add_up", async () => {
    await expect(
      createInvoice({
        commissionTotal: "100.00", feeRate: "0.15", feeAmount: "15.00",
        feeVatAmount: "2.70", totalDue: "999.99",
      }),
    ).rejects.toThrowError();
  });

  it("accepts a NEGATIVE commissionTotal and totalDue — a carried credit", async () => {
    // R2 §5.4: a reversal exceeding the period's accruals issues a negative
    // invoice, which is carried, not clamped.
    await expect(
      createInvoice({
        commissionTotal: "-40.00", feeRate: "0.15", feeAmount: "-6.00",
        feeVatAmount: "-1.08", totalDue: "-47.08",
      }),
    ).resolves.toBeDefined();
  });

  it("refuses PAID without paidAt — paid_at_matches_status", async () => {
    await expect(createInvoice({ status: "PAID", paidAt: null })).rejects.toThrowError();
  });

  it.each(["DRAFT", "ISSUED", "VOID"] as const)(
    "refuses a paidAt on a %s invoice",
    async (status) => {
      await expect(createInvoice({ status, paidAt: new Date() })).rejects.toThrowError();
    },
  );

  it("refuses dueAt before issuedAt", async () => {
    await expect(
      createInvoice({
        issuedAt: new Date("2026-09-01T00:00:00Z"),
        dueAt: new Date("2026-08-31T00:00:00Z"),
      }),
    ).rejects.toThrowError();
  });

  it("permits dueAt equal to issuedAt — net terms of zero days", async () => {
    const at = new Date("2026-09-01T00:00:00Z");
    await expect(createInvoice({ issuedAt: at, dueAt: at })).resolves.toBeDefined();
  });

  it.each(["1.0001", "2", "-0.01"])("refuses a feeRate of %s", async (feeRate) => {
    await expect(createInvoice({ feeRate })).rejects.toThrowError();
  });

  it("refuses a duplicate number across brands", async () => {
    await createInvoice({ number: "XU-2026-000001" });
    await expect(
      createInvoice({ number: "XU-2026-000001", brandId: otherBrand.id }),
    ).rejects.toThrowError();
  });

  it("refuses a second invoice for one (brand, period) — the close job's idempotency guard", async () => {
    const data = invoiceFor(brand, period);
    await prisma.invoice.create({ data });
    await expect(prisma.invoice.create({ data: { ...data, number: "XU-2026-000002" } }))
      .rejects.toThrowError();
  });

  it("permits one invoice per brand for the same period", async () => { /* two brands */ });

  it("indexes the overdue query", async () => {
    const rows = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'invoice'
    `;
    expect(rows.map((r) => r.indexname)).toContain("invoice_overdue_idx");
  });
});

describe("invoice_counter", () => {
  it("keys on the year and starts at 1", async () => {
    const counter = await prisma.invoiceCounter.create({ data: { year: 2026 } });
    expect(counter.nextSeq).toBe(1);
  });

  it("refuses a next_seq below 1", async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO invoice_counter (year, next_seq) VALUES (2027, 0)`,
    ).rejects.toThrowError();
  });
});
```

- [ ] **Step 2: Run, confirm failure, write the schema**

Transcribe R2 Appendix A.3 and A.4:

```prisma
enum InvoiceStatus { DRAFT ISSUED PAID VOID }

/// Totals are stored, not derived: an invoice must still say what it said on
/// the day it was issued, even after a later cancellation moves the
/// underlying figures. feeRate is a snapshot at issue.
/// commissionTotal may be negative — a carried credit (R2 §5.4).
model Invoice {
  id              String        @id @default(uuid()) @db.Uuid
  brandId         String        @map("brand_id") @db.Uuid
  billingPeriodId String        @map("billing_period_id") @db.Uuid
  number          String        @unique
  issuedAt        DateTime      @map("issued_at") @db.Timestamptz(6)
  dueAt           DateTime      @map("due_at") @db.Timestamptz(6)
  commissionTotal Decimal       @map("commission_total") @db.Decimal(12, 2)
  feeRate         Decimal       @map("fee_rate") @db.Decimal(9, 4)
  feeAmount       Decimal       @map("fee_amount") @db.Decimal(12, 2)
  feeVatAmount    Decimal       @map("fee_vat_amount") @db.Decimal(12, 2)
  totalDue        Decimal       @map("total_due") @db.Decimal(12, 2)
  status          InvoiceStatus @default(DRAFT)
  paidAt          DateTime?     @map("paid_at") @db.Timestamptz(6)
  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)

  brand         Brand         @relation(fields: [brandId], references: [id], onDelete: Restrict)
  billingPeriod BillingPeriod @relation(fields: [billingPeriodId], references: [id], onDelete: Restrict)
  ledgerEntries LedgerEntry[]

  @@unique([brandId, billingPeriodId])
  @@index([status, dueAt], map: "invoice_overdue_idx")
  @@map("invoice")
}

/// Gapless numbering. Taken under SELECT … FOR UPDATE in the same
/// transaction as the insert (R2 §5.2).
model InvoiceCounter {
  year    Int @id
  nextSeq Int @default(1) @map("next_seq")

  @@map("invoice_counter")
}
```

Add the CHECK constraints from A.4 by hand, then close the loop on Phase 8's deferred foreign key:

```sql
ALTER TABLE "ledger_entry"
  ADD CONSTRAINT ledger_entry_invoice_fkey
  FOREIGN KEY (invoice_id) REFERENCES invoice(id) ON DELETE RESTRICT;

CREATE INDEX ledger_invoice_idx ON ledger_entry (invoice_id) WHERE invoice_id IS NOT NULL;
```

- [ ] **Step 3: Extend the environment contract**

Add the four platform variables with Zod validation and a test asserting each is required and each rejects an out-of-range value. `PLATFORM_VAT_RATE` above `1` and `PAYOUT_MINIMUM_GEL` below `0` both fail parsing.

- [ ] **Step 4: Migrate, diff, run**

```bash
pnpm db:migrate --name phase_9_invoicing && pnpm db:migrate:test && pnpm test:integration
```

- [ ] **Step 5: Commit**

```bash
git add prisma src/modules/invoicing src/config
git commit -m "feat: add invoice tables, the counter, and the platform configuration"
```

---

### Task 2: Compute invoice totals

**Files:**

- Create: `src/modules/invoicing/domain/invoice-totals.ts`, `invoice-totals.test.ts`
- Create: `src/modules/invoicing/domain/invoice-number.ts`, `invoice-number.test.ts`

**Interfaces:**

- Consumes: `Money`
- Produces:
  - `computeInvoiceTotals(input: { commissionTotal: Money; feeRate: string; platformVatRegistered: boolean; platformVatRate: string }): { commissionTotal: Money; feeRate: string; feeAmount: Money; feeVatAmount: Money; totalDue: Money }`
  - `formatInvoiceNumber(year: number, seq: number): string`
  - `parseInvoiceNumber(number: string): { year: number; seq: number }`

- [ ] **Step 1: Write the failing totals test**

Every arithmetic edge R2 §11 lists, plus the negative case that makes credits work:

```ts
import { describe, expect, it } from "vitest";
import { Money } from "@/src/modules/shared";
import { computeInvoiceTotals } from "./invoice-totals";

const vat = { platformVatRegistered: true, platformVatRate: "0.18" };

describe("computeInvoiceTotals", () => {
  it("computes fee, fee VAT and total", () => {
    const totals = computeInvoiceTotals({
      commissionTotal: Money.of("1000.00"),
      feeRate: "0.15",
      ...vat,
    });

    expect(totals.feeAmount.toStorageString()).toBe("150.00");
    expect(totals.feeVatAmount.toStorageString()).toBe("27.00");
    expect(totals.totalDue.toStorageString()).toBe("1177.00");
  });

  it("charges no fee VAT when SHUAMO is not VAT-registered", () => {
    const totals = computeInvoiceTotals({
      commissionTotal: Money.of("1000.00"),
      feeRate: "0.15",
      platformVatRegistered: false,
      platformVatRate: "0.18",
    });

    expect(totals.feeVatAmount.toStorageString()).toBe("0.00");
    expect(totals.totalDue.toStorageString()).toBe("1150.00");
  });

  it("never charges VAT on the commission pool — only on the fee", () => {
    const totals = computeInvoiceTotals({
      commissionTotal: Money.of("1000.00"),
      feeRate: "0",
      ...vat,
    });

    expect(totals.feeAmount.toStorageString()).toBe("0.00");
    expect(totals.feeVatAmount.toStorageString()).toBe("0.00");
    expect(totals.totalDue.toStorageString()).toBe("1000.00");
  });

  it("rounds the fee to the tetri, half up", () => {
    // 33.37 x 0.15 = 5.0055 -> 5.01
    const totals = computeInvoiceTotals({
      commissionTotal: Money.of("33.37"),
      feeRate: "0.15",
      ...vat,
    });
    expect(totals.feeAmount.toStorageString()).toBe("5.01");
  });

  it("puts the fee on a half-tetri and still lands exactly", () => {
    // 3.70 x 0.15 = 0.555 -> 0.56;  0.56 x 0.18 = 0.1008 -> 0.10
    const totals = computeInvoiceTotals({
      commissionTotal: Money.of("3.70"),
      feeRate: "0.15",
      ...vat,
    });

    expect(totals.feeAmount.toStorageString()).toBe("0.56");
    expect(totals.feeVatAmount.toStorageString()).toBe("0.10");
    expect(totals.totalDue.toStorageString()).toBe("4.36");
  });

  it("computes fee VAT from the ROUNDED fee, not from the unrounded product", () => {
    // If VAT came from 0.555 the answer would be 0.0999 -> 0.10 by luck.
    // Assert the chain explicitly so a refactor cannot change the basis.
    const totals = computeInvoiceTotals({
      commissionTotal: Money.of("3.70"),
      feeRate: "0.15",
      ...vat,
    });
    expect(totals.feeVatAmount.toStorageString()).toBe(
      Money.of("0.56").timesRateFraction("0.18").roundToTetri().toStorageString(),
    );
  });

  it("handles a zero pool", () => {
    const totals = computeInvoiceTotals({ commissionTotal: Money.ZERO, feeRate: "0.15", ...vat });
    expect(totals.totalDue.toStorageString()).toBe("0.00");
  });

  it("handles a NEGATIVE pool, carrying the credit through the fee too", () => {
    // A reversal-dominated period. The brand is credited the commission AND
    // the fee it was charged on it.
    const totals = computeInvoiceTotals({
      commissionTotal: Money.of("-40.00"),
      feeRate: "0.15",
      ...vat,
    });

    expect(totals.feeAmount.toStorageString()).toBe("-6.00");
    expect(totals.feeVatAmount.toStorageString()).toBe("-1.08");
    expect(totals.totalDue.toStorageString()).toBe("-47.08");
  });

  it("always satisfies totals_add_up", () => {
    for (const pool of ["0.00", "0.01", "-0.01", "3.70", "-40.00", "999999.99"]) {
      for (const rate of ["0", "0.0001", "0.15", "1"]) {
        const t = computeInvoiceTotals({ commissionTotal: Money.of(pool), feeRate: rate, ...vat });
        expect(
          t.commissionTotal.plus(t.feeAmount).plus(t.feeVatAmount).toStorageString(),
        ).toBe(t.totalDue.toStorageString());
      }
    }
  });
});
```

Crediting the fee back on a negative pool is a decision, not a fallout: the brand paid a fee on commission that has since been reversed, and charging a positive fee on a negative pool would mean SHUAMO keeps a fee on a sale that did not happen.

- [ ] **Step 2: Write the failing number test**

```ts
describe("invoice numbers", () => {
  it("formats as XU-YYYY-NNNNNN, zero-padded to six", () => {
    expect(formatInvoiceNumber(2026, 418)).toBe("XU-2026-000418");
    expect(formatInvoiceNumber(2026, 1)).toBe("XU-2026-000001");
  });

  it("round-trips", () => {
    expect(parseInvoiceNumber("XU-2026-000418")).toEqual({ year: 2026, seq: 418 });
  });

  it("refuses a sequence that will not fit in six digits", () => {
    expect(() => formatInvoiceNumber(2026, 1_000_000)).toThrowError();
  });

  it("refuses a malformed number", () => {
    for (const bad of ["XU-2026-418", "2026-000418", "XU-26-000418", ""]) {
      expect(() => parseInvoiceNumber(bad)).toThrowError();
    }
  });
});
```

- [ ] **Step 3: Run, confirm failure, implement, commit**

```bash
pnpm vitest run src/modules/invoicing/domain
git add src/modules/invoicing/domain
git commit -m "feat: compute invoice totals and format gapless invoice numbers"
```

---

### Task 3: Issue an invoice with a gapless number

**Files:**

- Create: `src/modules/invoicing/ports/*.ts`
- Create: `src/modules/invoicing/application/issue-invoice.ts`, `issue-invoice.test.ts`
- Create: `src/modules/invoicing/infrastructure/prisma-counter-repository.ts`, `prisma-invoice-repository.ts`
- Create: `src/modules/invoicing/infrastructure/numbering.integration.test.ts`

**Interfaces:**

- Consumes: `computeInvoiceTotals`, `formatInvoiceNumber`, the ledger repository
- Produces:
  - `nextInvoiceNumber(tx, year): Promise<string>` — takes the counter row `FOR UPDATE`
  - `issueInvoice(deps)(tx, { brandId, periodId, issuedAt }): Promise<Invoice | undefined>` — `undefined` when the brand has no entries in the period

- [ ] **Step 1: Write the failing test**

```ts
describe("issueInvoice", () => {
  it("sums ACCRUAL and REVERSAL for the (brand, period)", async () => {
    const invoice = await issueInvoice(deps({
      entries: [accrual("11.44"), accrual("25.42"), reversal("-11.44")],
    }))(fakeTx, request);

    expect(invoice?.commissionTotal.toStorageString()).toBe("25.42");
  });

  it("ignores entries of other kinds", async () => {
    const invoice = await issueInvoice(deps({
      entries: [accrual("10.00"), release("-10.00"), payout("-10.00"), adjustment("5.00")],
    }))(fakeTx, request);

    // Only ACCRUAL and REVERSAL. A RELEASE moves money between buckets and a
    // PAYOUT leaves; neither is something a brand owes.
    expect(invoice?.commissionTotal.toStorageString()).toBe("10.00");
  });

  it("ignores entries belonging to another brand or another period", async () => {
    const invoice = await issueInvoice(deps({
      entries: [
        accrual("10.00", { brandId: "b1", periodId: "p1" }),
        accrual("99.00", { brandId: "b2", periodId: "p1" }),   // another brand
        accrual("77.00", { brandId: "b1", periodId: "p0" }),   // another period
      ],
    }))(fakeTx, { brandId: "b1", periodId: "p1", issuedAt: NOW });

    expect(invoice?.commissionTotal.toStorageString()).toBe("10.00");
  });

  it("issues nothing for a brand with no entries in the period", async () => {
    expect(await issueInvoice(deps({ entries: [] }))(fakeTx, request)).toBeUndefined();
  });

  it("issues nothing when the entries net to zero", async () => {
    const invoice = await issueInvoice(deps({
      entries: [accrual("11.44"), reversal("-11.44")],
    }))(fakeTx, request);

    // A zero invoice is a document nobody needs to send, pay, or file.
    expect(invoice).toBeUndefined();
  });

  it("snapshots the brand's fee rate at issue", async () => {
    const invoice = await issueInvoice(deps({ brandFeeRate: "0.15" }))(fakeTx, request);
    expect(invoice?.feeRate).toBe("0.15");
  });

  it("computes dueAt from the brand's net terms", async () => {
    const invoice = await issueInvoice(deps({ netTermsDays: 7 }))(fakeTx, {
      ...request,
      issuedAt: new Date("2026-09-01T00:00:00Z"),
    });

    expect(invoice?.dueAt.toISOString()).toBe("2026-09-08T00:00:00.000Z");
  });

  it("issues in ISSUED, not DRAFT", async () => {
    // DRAFT exists for an invoice a human is still editing. The close job
    // issues finished documents.
    expect((await issueInvoice(deps())(fakeTx, request))?.status).toBe("ISSUED");
  });

  it("takes its number from the counter and advances it", async () => {
    const counter = { year: 2026, nextSeq: 418 };
    const invoice = await issueInvoice(deps({ counter }))(fakeTx, request);

    expect(invoice?.number).toBe("XU-2026-000418");
    expect(counter.nextSeq).toBe(419);
  });

  it("uses the issue year, not the period's year, for the counter", async () => {
    // A December period closes on 1 January. R2 says XU-YYYY; the year is
    // the year the document was issued, which is what a tax filing expects.
    const invoice = await issueInvoice(deps({ counter: { year: 2027, nextSeq: 1 } }))(fakeTx, {
      ...request,
      issuedAt: new Date("2027-01-01T00:00:00Z"),
    });

    expect(invoice?.number).toBe("XU-2027-000001");
  });
});
```

- [ ] **Step 2: Implement the counter under `FOR UPDATE`**

```ts
export async function nextInvoiceNumber(tx: TxClient, year: number): Promise<string> {
  // A sequence gaps on rollback, and "why does XU-2026-000418 not exist?"
  // is not a question a non-transactional counter answers (R2 §5.2). The
  // close job runs twenty-four times a year, so this lock costs nothing.
  const rows = await tx.$queryRaw<{ next_seq: number }[]>`
    SELECT next_seq FROM invoice_counter WHERE year = ${year} FOR UPDATE
  `;

  if (rows[0] === undefined) {
    await tx.$executeRaw`INSERT INTO invoice_counter (year, next_seq) VALUES (${year}, 2)`;
    return formatInvoiceNumber(year, 1);
  }

  const seq = rows[0].next_seq;
  await tx.$executeRaw`UPDATE invoice_counter SET next_seq = ${seq + 1} WHERE year = ${year}`;
  return formatInvoiceNumber(year, seq);
}
```

- [ ] **Step 3: Write the gapless-numbering integration test**

The one that proves the whole design decision:

```ts
describe("invoice numbering", () => {
  it("is contiguous across a normal run", async () => {
    await issueThree();
    const numbers = (await prisma.invoice.findMany({ orderBy: { number: "asc" } })).map((i) => i.number);
    expect(numbers).toEqual(["XU-2026-000001", "XU-2026-000002", "XU-2026-000003"]);
  });

  it("leaves NO GAP when an invoice insert rolls back", async () => {
    await issueOne();                                    // XU-2026-000001

    await expect(
      prisma.$transaction(async (tx) => {
        await nextInvoiceNumber(tx, 2026);               // would be 000002
        throw new Error("deliberate failure mid-invoice");
      }),
    ).rejects.toThrow();

    await issueOne();                                    // must be 000002

    const numbers = (await prisma.invoice.findMany({ orderBy: { number: "asc" } })).map((i) => i.number);
    expect(numbers).toEqual(["XU-2026-000001", "XU-2026-000002"]);
  });

  it("serialises two concurrent issuers rather than duplicating a number", async () => {
    const [a, b] = await Promise.all([issueOneFor(brandA), issueOneFor(brandB)]);
    expect(a.number).not.toBe(b.number);

    const seqs = [a, b].map((i) => parseInvoiceNumber(i.number).seq).sort();
    expect(seqs[1]! - seqs[0]!).toBe(1);
  });

  it("starts a new year at 000001", async () => {
    await issueOneAt(new Date("2026-12-31T23:00:00Z"));
    const next = await issueOneAt(new Date("2027-01-01T01:00:00Z"));
    expect(next.number).toBe("XU-2027-000001");
  });
});
```

The rollback test is the reason a sequence was rejected. Run it, watch it pass, and note in `docs/runbook.md` that this behaviour is a compliance requirement rather than a preference.

- [ ] **Step 4: Run and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/invoicing
git commit -m "feat: issue invoices with gapless numbering from a locked counter"
```

---

### Task 4: Close the period

**Files:**

- Create: `src/modules/invoicing/application/close-period.ts`, `close-period.test.ts`
- Create: `src/modules/worker/jobs/close-period-job.ts`, and its test
- Create: `scripts/close-period.ts`
- Modify: `src/modules/worker/scheduler.ts`, `package.json`

**Interfaces:**

- Consumes: `issueInvoice`, the period repository, the audit log
- Produces: `closePeriod(deps)(at: Date): Promise<{ periodLabel: string; invoicesIssued: number; payoutsDrafted: number }>`

Payout drafting is Phase 10; this phase's `closePeriod` calls an injected `draftPayouts` port whose Phase 9 implementation returns `0`. The seam exists now so Phase 10 changes one adapter rather than the job.

- [ ] **Step 1: Write the failing test**

The transaction boundary is the design, so it is what the test asserts:

```ts
describe("closePeriod", () => {
  it("closes the period and opens the next one in ONE committed transaction, first", async () => {
    const order: string[] = [];

    await closePeriod({
      periods: {
        currentOpen: async () => openPeriod,
        closeAndOpenNext: async () => { order.push("close+open committed"); return nextPeriod; },
      },
      brandsWithEntries: async () => { order.push("read brands"); return ["b1"]; },
      issueInvoice: async () => { order.push("issue"); return invoice; },
      draftPayouts: async () => { order.push("draft"); return 0; },
      audit: async () => undefined,
    })(NOW);

    expect(order[0]).toBe("close+open committed");
  });

  it("issues one invoice per brand with entries in the closed period", async () => {
    const result = await closePeriod(deps({ brands: ["b1", "b2", "b3"] }))(NOW);
    expect(result.invoicesIssued).toBe(3);
  });

  it("reads only the CLOSED period, so a confirmation mid-run cannot be half-counted", async () => {
    const requestedPeriods: string[] = [];
    await closePeriod(
      deps({ onEntryQuery: (periodId) => requestedPeriods.push(periodId) }),
    )(NOW);

    expect(new Set(requestedPeriods)).toEqual(new Set([openPeriod.id]));
  });

  it("issues no invoice for a brand with no entries", async () => {
    const result = await closePeriod(deps({ brands: [] }))(NOW);
    expect(result.invoicesIssued).toBe(0);
  });

  it("writes an audit event for the close and for every invoice", async () => {
    const events: string[] = [];
    await closePeriod(deps({ brands: ["b1", "b2"], audit: async (e) => void events.push(e.action) }))(NOW);

    expect(events).toContain("period.closed");
    expect(events.filter((a) => a === "invoice.issued")).toHaveLength(2);
  });

  it("continues after one brand's invoice fails, and reports it", async () => {
    // One brand's bad data must not stop twenty-three other invoices.
    const result = await closePeriod(
      deps({ brands: ["good", "bad", "good2"], failFor: "bad" }),
    )(NOW);

    expect(result.invoicesIssued).toBe(2);
    expect(result.failures).toEqual(["bad"]);
  });

  it("throws when there is no open period rather than closing nothing silently", async () => {
    await expect(
      closePeriod(deps({ currentOpen: undefined }))(NOW),
    ).rejects.toThrowError(/no open billing period/i);
  });
});
```

- [ ] **Step 2: Write the idempotency integration test**

```ts
it("is idempotent: run twice, one invoice per brand", async () => {
  await seedTwoBrandsWithAccruals();

  const first = await runCloseJob();
  const second = await runCloseJob();   // recovery re-run after a partial failure

  expect(first.invoicesIssued).toBe(2);
  expect(second.invoicesIssued).toBe(0);
  expect(await prisma.invoice.count()).toBe(2);
});

it("a confirmation arriving during the run lands in the newly opened period", async () => {
  const { conversionId } = await seedPendingOrder();
  const closed = await currentPeriod();

  await runCloseJobWithHook(async () => {
    // Between step 1 and step 2.
    await confirmOrder(conversionId);
  });

  const [entry] = await prisma.ledgerEntry.findMany({ where: { kind: "ACCRUAL" } });
  expect(entry?.billingPeriodId).not.toBe(closed.id);

  const invoices = await prisma.invoice.findMany({ where: { billingPeriodId: closed.id } });
  expect(invoices.every((i) => i.commissionTotal.toFixed(2) !== entry?.amount.toFixed(2))).toBe(true);
});

it("nets a reversal down against the next invoice", async () => {
  await confirmOrderWorth("100.00");
  await runCloseJob();                        // invoice 1: 100.00

  await cancelThatOrder();                    // -100.00 into the new period
  await confirmAnotherOrderWorth("40.00");
  await runCloseJob();                        // invoice 2: -60.00

  const [, second] = await prisma.invoice.findMany({ orderBy: { number: "asc" } });
  expect(second?.commissionTotal.toFixed(2)).toBe("-60.00");
  expect(second?.totalDue.isNegative()).toBe(true);
});

it("issues a negative invoice when a reversal exceeds the period's accruals", async () => {
  await confirmOrderWorth("100.00");
  await runCloseJob();
  await cancelThatOrder();
  await runCloseJob();

  const [, second] = await prisma.invoice.findMany({ orderBy: { number: "asc" } });
  expect(second?.commissionTotal.toFixed(2)).toBe("-100.00");
});

it("exactly one period is OPEN after the close", async () => {
  await runCloseJob();
  expect(await prisma.billingPeriod.count({ where: { status: "OPEN" } })).toBe(1);
});
```

- [ ] **Step 3: Schedule it and expose a manual run**

The worker runs the job at 00:00 Asia/Tbilisi on the 1st and the 16th. `scripts/close-period.ts` runs it by hand — the recovery path when the scheduler misses a window (R2 §6). Period boundaries are dates, not run times, so a late run produces the same result.

- [ ] **Step 4: Run and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/invoicing src/modules/worker scripts package.json
git commit -m "feat: close the period, issue invoices, and make the job re-runnable"
```

---

### Task 5: Build the brand billing view

**Files:**

- Create: `src/modules/invoicing/application/get-brand-billing.ts`, and its test
- Create: `src/modules/invoicing/ui/invoice-list.tsx`, `invoice-detail.tsx`
- Create: `app/[locale]/brand/billing/page.tsx`, `billing/[invoiceId]/page.tsx`
- Modify: `src/modules/shell/ui/nav-model.ts`, the message catalogues

**Interfaces:**

- Consumes: the invoice and ledger repositories
- Produces:
  - `getBrandBilling(deps)(brandId): Promise<{ invoices: InvoiceSummary[]; openPeriod: OpenPeriodEstimate }>`
  - `getInvoiceDetail(deps)(brandId, invoiceId): Promise<Result<InvoiceDetail, "not_found" | "not_yours">>`

- [ ] **Step 1: Write the failing test**

```ts
it("derives the per-creator breakdown from the period's frozen entries", async () => {
  const detail = await getInvoiceDetail(deps(fixture))("b1", "inv1");

  expect(detail.ok && detail.value.byCreator).toEqual([
    { creatorId: "nino", displayName: "Nino", amount: "11.44" },
    { creatorId: "dato", displayName: "Dato", amount: "25.42" },
  ]);
});

it("labels the open period's total an estimate", async () => {
  const billing = await getBrandBilling(deps(fixture))("b1");
  expect(billing.openPeriod.isEstimate).toBe(true);
});

it("shows the fee the open period will attract at the CURRENT rate", async () => {
  const billing = await getBrandBilling(deps(fixture))("b1");
  expect(billing.openPeriod.estimatedFee.toStorageString()).toBe("5.50");
});

it("marks an ISSUED invoice past its due date as overdue, without a status column", async () => {
  const billing = await getBrandBilling(deps(overdueFixture))("b1");
  expect(billing.invoices[0]?.isOverdue).toBe(true);
});

it("does not mark a PAID invoice overdue, however late it was", async () => {
  const billing = await getBrandBilling(deps(latePaidFixture))("b1");
  expect(billing.invoices[0]?.isOverdue).toBe(false);
});

it("refuses another brand's invoice", async () => {
  expect(await getInvoiceDetail(deps(fixture))("b-other", "inv1")).toEqual({
    ok: false, error: "not_yours",
  });
});

it("keeps an issued invoice's totals stable after a later cancellation moves the figures", async () => {
  const before = await getInvoiceDetail(deps(fixture))("b1", "inv1");
  await cancelAnOrderCoveredByThatInvoice();
  const after = await getInvoiceDetail(deps(fixture))("b1", "inv1");

  expect(after).toEqual(before);
});
```

That last test is R2 §3.2's whole argument for storing totals, expressed as an assertion.

- [ ] **Step 2: Build the screens**

**Invoice list** — number, period, issued, due, total, status. An overdue invoice takes a `danger` `StatusPill` reading "Overdue by N days", computed rather than stored. Above the list, the open period's running commission total with the fee it will attract, labelled an estimate in both locales per the Estimate Rule.

**Invoice detail** — the stored totals exactly as issued, the per-creator breakdown derived from the frozen entries, and a note stating the fee rate that was snapshotted. There is no PDF (R2 §2); there is an HTML view and a CSV, and the CSV link lands in Phase 11.

- [ ] **Step 3: Run and commit**

```bash
pnpm test:unit && pnpm build
git add src/modules/invoicing app/[locale]/brand/billing src/modules/localization
git commit -m "feat: build the brand billing view with a derived per-creator breakdown"
```

---

### Task 6: Prove the phase

**Files:**

- Create: `scripts/seed-phase-09.ts`, `src/test/e2e/invoicing.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the property test**

```ts
it("total_due equals its three components for random rates and pools", async () => {
  const random = mulberry32(909);

  for (let i = 0; i < 5000; i += 1) {
    const sign = random() < 0.2 ? -1 : 1;
    const tetri = Math.floor(random() * 100_000_000) * sign;
    const pool = Money.of(`${Math.trunc(tetri / 100)}.${String(Math.abs(tetri % 100)).padStart(2, "0")}`);
    const rate = `0.${String(Math.floor(random() * 10000)).padStart(4, "0")}`;

    const t = computeInvoiceTotals({
      commissionTotal: pool,
      feeRate: rate,
      platformVatRegistered: random() < 0.5,
      platformVatRate: "0.18",
    });

    expect(t.commissionTotal.plus(t.feeAmount).plus(t.feeVatAmount).toStorageString()).toBe(
      t.totalDue.toStorageString(),
    );
  }
});
```

- [ ] **Step 2: Write the browser journey**

```ts
test("@phase-9 closing a period issues an invoice the brand can read", async ({ page }) => {
  await runCloseJobViaScript();

  await signInAsBrand(page, "en");
  await page.goto("/en/brand/billing");

  await expect(page.getByText(/XU-\d{4}-\d{6}/)).toBeVisible();
  await page.getByRole("link", { name: /XU-/ }).click();

  await expect(page.getByText("Nino")).toBeVisible();
  await expect(page.getByText("11.44 ₾")).toBeVisible();
});

test("@phase-9 the open period total is labelled an estimate", async ({ page }) => {
  await signInAsBrand(page, "ka");
  await page.goto("/ka/brand/billing");
  await expect(page.getByText(/შეფასება/)).toBeVisible();
});
```

- [ ] **Step 3: Wire the gate and run it**

```json
{
  "close:period": "tsx scripts/close-period.ts",
  "seed:phase-9": "tsx scripts/seed-phase-09.ts",
  "verify:phase-9": "pnpm verify:phase-8 && pnpm db:migrate:test && pnpm test:integration && pnpm build && pnpm seed:phase-9 && pnpm test:e2e --grep @phase-9"
}
```

```bash
pnpm verify:phase-9
```

- [ ] **Step 4: Commit**

```bash
git add scripts src/test/e2e/invoicing.spec.ts package.json
git commit -m "test: prove invoice arithmetic, gapless numbering and close idempotency"
```

---

## Phase 9 completion checklist

- [ ] `pnpm verify:phase-9` passes.
- [ ] Invoice numbering leaves **no gap** after a deliberately rolled-back invoice transaction.
- [ ] Two concurrent issuers get consecutive numbers, never the same one.
- [ ] A new calendar year restarts at `XU-YYYY-000001`.
- [ ] `total_due = commission_total + fee_amount + fee_vat_amount` for 5000 randomised inputs, including zero, negative, and a rate of 1.
- [ ] Fee VAT is computed from the **rounded** fee, asserted explicitly.
- [ ] A negative pool credits the fee and the fee VAT too.
- [ ] A brand with no entries — or entries netting to zero — is issued no invoice.
- [ ] Running the close job twice issues one invoice per brand and drafts one payout per creator.
- [ ] A confirmation arriving during the run lands in the newly opened period and appears on no invoice from that run.
- [ ] Exactly one `billing_period` is `OPEN` after every close.
- [ ] A reversal nets down the next invoice; a reversal exceeding it produces a negative `total_due` that is carried, not clamped.
- [ ] An issued invoice's totals are byte-identical after a later cancellation moves the underlying figures.
- [ ] Overdue is computed from `status = ISSUED AND due_at < now()`; there is no `OVERDUE` value anywhere in the enum or the code.
- [ ] One brand's failure during a close does not stop the other invoices, and the failure is reported.
