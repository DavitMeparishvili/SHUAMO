# Phase 11 — Money Views, Admin Console & Reconciliation Implementation Plan · **R2**

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everyone can see where their money is, an operator can move it without touching the database, and seven nightly checks say whether the books are true.

**Architecture:** Reporting over the ledger, with no new money computed anywhere. The seven reconciliation checks are SQL queries that return zero rows in a healthy system; each one gets a healthy fixture and a fixture corrupted specifically for it, because a check nobody has seen fail is a check nobody has tested. The admin console exists because money moves through it, not because approvals were inconvenient.

**Tech Stack:** Prisma raw SQL for the checks · the Phase 7 worker scheduler · the Phase 1 component kit.

**Spec:** `docs/superpowers/specs/2026-08-29-shuamo-r2-accounting-design.md` §4.6, §7.1–7.4, §8, §9, §11, §12, Appendix A.7.

## Global Constraints

Inherited from the roadmap. The ones this phase exercises:

- **The Provenance Rule.** Every aggregate figure links to the rows that produced it. A total the creator cannot open is a total they cannot check.
- "In transit" is shown only when non-zero, and exists because the ledger debits at `SENT` — between the transfer leaving and the operator confirming it, that money is in neither `AVAILABLE` nor "paid to date", and a creator watching their balance drop with nothing to show for it would be right to be alarmed.
- Pending commission is **not in the ledger**. It is `Σ Attribution.commissionAmount where Conversion.status = PENDING`.
- An `ADJUSTMENT` requires a memo and a `createdBy`. Both are enforced by a database CHECK, and the console must not be the only thing enforcing them.
- Nothing in the accounting record is ever hard-deleted, aggregated, or rolled up.
- Each task ends in a commit.

---

## Blocking gates, restated

R2 §10.1 (licensing) and §10.2 (creator tax treatment) must be answered **in writing before a single lari is collected**. They are legal preconditions, not launch tasks, and no amount of passing tests substitutes for them.

A `pg_dump` restore must be verified **before the first invoice is issued**, not after. Phase 7 rehearsed the procedure; do it again against the R2 schema, because the accounting record is now the thing being protected.

---

## Planned file structure

```
src/modules/reconciliation/domain/checks.ts            the seven queries, as data
src/modules/reconciliation/domain/checks.test.ts       shape and naming
src/modules/reconciliation/application/run-checks.ts   + test
src/modules/reconciliation/infrastructure/prisma-checks.ts
src/modules/reconciliation/infrastructure/checks.integration.test.ts   7 healthy + 7 corrupt
src/modules/reconciliation/index.ts

src/modules/ledger/application/get-creator-money.ts    the five numbers
src/modules/ledger/application/get-creator-money.test.ts
src/modules/ledger/application/get-creator-statement.ts + test
src/modules/ledger/ui/money-summary.tsx
src/modules/ledger/ui/statement.tsx

src/modules/admin/application/*.ts                     period / invoice / payout / adjustment
src/modules/admin/http/*.ts                            + tests
src/modules/admin/ui/periods.tsx  invoices.tsx  payouts.tsx  adjustments.tsx
src/modules/admin/index.ts

src/modules/reporting/application/build-invoice-csv.ts + test
src/modules/reporting/application/build-payout-csv.ts  + test

src/modules/worker/jobs/reconciliation-job.ts          + test
app/[locale]/creator/earnings/page.tsx                 finished
app/[locale]/creator/statements/[period]/page.tsx
app/[locale]/admin/periods/page.tsx  invoices  payouts  adjustments
app/api/admin/**/route.ts
app/api/brand/reports/invoice-csv/route.ts
app/api/admin/reports/payout-csv/route.ts
scripts/seed-phase-11.ts  ·  scripts/corrupt-fixture.ts
src/test/e2e/money.spec.ts                             @phase-11
docs/runbook.md                                        the reconciliation section
```

---

### Task 1: Build the creator's five numbers

**Files:**

- Create: `src/modules/ledger/application/get-creator-money.ts`, and its test
- Create: `src/modules/ledger/ui/money-summary.tsx`
- Modify: `app/[locale]/creator/earnings/page.tsx`

**Interfaces:**

- Consumes: the ledger, attribution and payment repositories
- Produces:
  - `type CreatorMoney = { pending: Money; accrued: Money; available: Money; inTransit: Money; paidToDate: Money; byBrand: BrandMoney[] }`
  - `type BrandMoney = CreatorMoney & { brandId: string; brandName: string; blockingInvoice?: { number: string; dueAt: Date; isOverdue: boolean } }`
  - `getCreatorMoney(deps)(creatorId): Promise<CreatorMoney>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { getCreatorMoney } from "./get-creator-money";

describe("getCreatorMoney", () => {
  it("reads pending from attributions, not from the ledger", async () => {
    const money = await getCreatorMoney(deps({
      pendingAttributions: ["412.60"],
      ledger: [],
    }))("nino");

    expect(money.pending.toStorageString()).toBe("412.60");
    expect(money.accrued.toStorageString()).toBe("0.00");
  });

  it("reads accrued and available from the ledger buckets", async () => {
    const money = await getCreatorMoney(deps({
      ledger: [accrued("847.22"), available("230.00")],
    }))("nino");

    expect(money.accrued.toStorageString()).toBe("847.22");
    expect(money.available.toStorageString()).toBe("230.00");
  });

  it("reads in transit from OUTBOUND orders in SENT", async () => {
    const money = await getCreatorMoney(deps({ sentPayouts: ["180.00"] }))("nino");
    expect(money.inTransit.toStorageString()).toBe("180.00");
  });

  it("reads paid to date from OUTBOUND orders in PAID", async () => {
    const money = await getCreatorMoney(deps({ paidPayouts: ["3110.44"] }))("nino");
    expect(money.paidToDate.toStorageString()).toBe("3110.44");
  });

  it("does not count a SENT payout as paid to date", async () => {
    const money = await getCreatorMoney(deps({ sentPayouts: ["180.00"], paidPayouts: [] }))("nino");
    expect(money.paidToDate.toStorageString()).toBe("0.00");
  });

  it("does not count a FAILED payout as either in transit or paid", async () => {
    const money = await getCreatorMoney(deps({ failedPayouts: ["180.00"] }))("nino");
    expect(money.inTransit.toStorageString()).toBe("0.00");
    expect(money.paidToDate.toStorageString()).toBe("0.00");
  });

  it("names the brand whose unpaid invoice is holding accrued money", async () => {
    const money = await getCreatorMoney(deps(aromashopOwesFixture))("nino");
    const aromashop = money.byBrand.find((b) => b.brandName === "Aromashop")!;

    // The single most useful thing a creator can know is which brand has
    // not paid (R2 §7.1).
    expect(aromashop.blockingInvoice).toMatchObject({ number: "XU-2026-000418", isOverdue: false });
  });

  it("marks the blocking invoice overdue when it is past due", async () => {
    const money = await getCreatorMoney(deps(overdueFixture))("nino");
    expect(money.byBrand[0]?.blockingInvoice?.isOverdue).toBe(true);
  });

  it("has no blocking invoice when nothing is accrued for that brand", async () => {
    const money = await getCreatorMoney(deps(settledFixture))("nino");
    expect(money.byBrand[0]?.blockingInvoice).toBeUndefined();
  });

  it("breaks every figure down per brand, summing to the totals", async () => {
    const money = await getCreatorMoney(deps(twoBrandFixture))("nino");

    const summed = money.byBrand.reduce((sum, b) => sum.plus(b.accrued), Money.ZERO);
    expect(summed.toStorageString()).toBe(money.accrued.toStorageString());
  });

  it("attributes payouts and adjustments to no brand, so per-brand totals stay honest", async () => {
    // PAYOUT and ADJUSTMENT have a null brand_id (R2 A.6). They belong to
    // the totals, not to any brand's column.
    const money = await getCreatorMoney(deps(payoutFixture))("nino");
    expect(money.byBrand.every((b) => b.paidToDate.isZero())).toBe(true);
    expect(money.paidToDate.isZero()).toBe(false);
  });
});
```

- [ ] **Step 2: Run, confirm failure, implement, build the screen**

Per R2 §7.1:

```
Pending          412.60 ₾   awaiting Aromashop's confirmation
Accrued          847.22 ₾   confirmed — invoiced to Aromashop, due 8 Sep
Available        230.00 ₾   payable now, in your 16 Sep payout
In transit       180.00 ₾   sent to your bank on 16 Sep
Paid to date   3 110.44 ₾
```

Four numbers rather than one because they answer four different questions. The fifth appears only when non-zero.

Every figure is a `Figure` with an `href` — the Provenance Rule. Pending opens the orders behind it, accrued opens the ledger entries, available opens the releases, in transit opens the payment order, paid to date opens the payout history.

- [ ] **Step 3: Commit**

```bash
pnpm test:unit && pnpm build
git add src/modules/ledger app/[locale]/creator
git commit -m "feat: show the creator five numbers, each linking to its rows"
```

---

### Task 2: Build the creator statement

**Files:**

- Create: `src/modules/ledger/application/get-creator-statement.ts`, and its test
- Create: `src/modules/ledger/ui/statement.tsx`
- Create: `app/[locale]/creator/statements/[period]/page.tsx`

**Interfaces:**

- Consumes: the ledger, attribution, invoice and payment repositories
- Produces: `getCreatorStatement(deps)(creatorId, periodLabel): Promise<Statement>` — every entry with its cause

- [ ] **Step 1: Write the failing test**

```ts
it("lists every entry in the period with its cause", async () => {
  const statement = await getCreatorStatement(deps(fixture))("nino", "2026-08-H2");

  expect(statement.entries).toEqual([
    expect.objectContaining({
      kind: "ACCRUAL",
      amount: "11.44",
      cause: { type: "attribution", orderId: "1234", brandName: "Aromashop", productTitle: "Perfume 100ml" },
    }),
    expect.objectContaining({
      kind: "RELEASE",
      cause: { type: "invoice", number: "XU-2026-000418" },
    }),
    expect.objectContaining({
      kind: "PAYOUT",
      cause: { type: "payment_order", reference: "BANK-OUT-1" },
    }),
  ]);
});

it("carries an adjustment's memo and author", async () => {
  const statement = await getCreatorStatement(deps(adjustmentFixture))("nino", "2026-08-H2");
  const adjustment = statement.entries.find((e) => e.kind === "ADJUSTMENT")!;

  expect(adjustment.cause).toEqual({
    type: "adjustment", memo: "duplicate payout corrected", by: "admin@shuamo.ge",
  });
});

it("opens and closes with balances, so the arithmetic is checkable on the page", async () => {
  const statement = await getCreatorStatement(deps(fixture))("nino", "2026-08-H2");

  expect(statement.opening.accrued.plus(statement.movement.accrued).toStorageString())
    .toBe(statement.closing.accrued.toStorageString());
});

it("returns an empty statement for a period with no entries, not an error", async () => {
  const statement = await getCreatorStatement(deps(emptyFixture))("nino", "2026-01-H1");
  expect(statement.entries).toEqual([]);
});

it("refuses another creator's statement", async () => {
  await expect(
    getCreatorStatement(deps(fixture))("dato", "2026-08-H2", { asCreatorId: "nino" }),
  ).resolves.toEqual({ ok: false, error: "not_yours" });
});
```

"Why is this number what it is" is answered by rows on a screen, not by trust in the arithmetic (R2 §7.1) — which is why the statement carries opening and closing balances rather than only the movements.

- [ ] **Step 2: Build the screen and commit**

```bash
pnpm test:unit
git add src/modules/ledger app/[locale]/creator/statements
git commit -m "feat: build the per-period creator statement down to the attribution"
```

---

### Task 3: Write the seven reconciliation checks

**Files:**

- Create: `src/modules/reconciliation/domain/checks.ts`, `checks.test.ts`
- Create: `src/modules/reconciliation/application/run-checks.ts`, and its test
- Create: `src/modules/reconciliation/infrastructure/prisma-checks.ts`, `checks.integration.test.ts`
- Create: `scripts/corrupt-fixture.ts`

**Interfaces:**

- Consumes: raw SQL
- Produces:
  - `type Check = { id: CheckId; title: string; assertion: string; severity: "alert" | "critical"; sql: string }`
  - `CHECKS: readonly Check[]` — exactly seven
  - `runChecks(deps)(): Promise<CheckResult[]>` where `CheckResult = { id; passed: boolean; offendingRows: unknown[] }`

- [ ] **Step 1: Write the failing shape test**

```ts
import { describe, expect, it } from "vitest";
import { CHECKS } from "./checks";

describe("reconciliation checks", () => {
  it("is exactly the seven R2 §8 checks", () => {
    expect(CHECKS.map((c) => c.id)).toEqual([
      "accrual_completeness",
      "release_pairing",
      "bucket_conservation",
      "payout_agreement",
      "trial_balance",
      "solvency",
      "invoice_and_orphan_integrity",
    ]);
  });

  it("marks solvency critical and the rest alert", () => {
    // R2 §8: the other six detect a bookkeeping error; solvency detects the
    // failure that ends the company.
    expect(CHECKS.find((c) => c.id === "solvency")?.severity).toBe("critical");
    expect(CHECKS.filter((c) => c.severity === "critical")).toHaveLength(1);
  });

  it("states each assertion in a sentence an operator can act on", () => {
    for (const check of CHECKS) {
      expect(check.assertion.length, check.id).toBeGreaterThan(30);
    }
  });

  it("writes every check as a query that returns rows only on failure", () => {
    for (const check of CHECKS) {
      expect(check.sql.toUpperCase(), check.id).toContain("SELECT");
      expect(check.sql.toUpperCase(), check.id).not.toContain("INSERT");
      expect(check.sql.toUpperCase(), check.id).not.toContain("UPDATE");
      expect(check.sql.toUpperCase(), check.id).not.toContain("DELETE");
    }
  });
});
```

- [ ] **Step 2: Write the checks**

Each is a query returning zero rows in a healthy system. Four of them already exist as tests from Phases 8 and 10 — lift those queries rather than writing new ones, so the scheduled job and the test suite assert the same thing.

```ts
export const CHECKS = [
  {
    id: "accrual_completeness",
    title: "Accrual completeness",
    assertion:
      "Every Attribution on a CONFIRMED conversion has exactly one ACCRUAL entry of equal " +
      "amount, and no ACCRUAL exists without one.",
    severity: "alert",
    sql: `
      SELECT a.id AS attribution_id, 'missing_or_unequal_accrual' AS problem
      FROM attribution a
      JOIN conversion_item ci ON ci.id = a.conversion_item_id
      JOIN conversion cv ON cv.id = ci.conversion_id
      LEFT JOIN ledger_entry le ON le.attribution_id = a.id AND le.kind = 'ACCRUAL'
      WHERE cv.status = 'CONFIRMED'
        AND (le.id IS NULL OR le.amount <> a.commission_amount)
      UNION ALL
      SELECT le.id, 'accrual_without_attribution'
      FROM ledger_entry le
      LEFT JOIN attribution a ON a.id = le.attribution_id
      WHERE le.kind = 'ACCRUAL' AND a.id IS NULL
    `,
  },
  {
    id: "release_pairing",
    title: "Release pairing",
    assertion:
      "Every RELEASE nets to exactly zero per (creator, invoice): the −ACCRUED row and the " +
      "+AVAILABLE row are equal and opposite.",
    severity: "alert",
    sql: `
      SELECT creator_id, invoice_id, sum(amount) AS net
      FROM ledger_entry WHERE kind = 'RELEASE'
      GROUP BY creator_id, invoice_id HAVING sum(amount) <> 0
    `,
  },
  // bucket_conservation, payout_agreement, trial_balance, solvency,
  // invoice_and_orphan_integrity follow, each written out in full.
] as const satisfies readonly Check[];
```

Write all seven. The remaining five, stated so the implementer knows what they must express:

- **Bucket conservation** — per creator, `Σ ACCRUED + Σ AVAILABLE` equals `Σ (ACCRUAL + REVERSAL + ADJUSTMENT + PAYOUT + PAYOUT_REVERSAL)`, which holds only if every `RELEASE` pairing does. It is split out from release pairing rather than combined, because a combined equation cannot tell you which of the two broke.
- **Payout agreement** — per creator, `−Σ (PAYOUT + PAYOUT_REVERSAL)` equals `Σ PaymentOrder.amount` for `OUTBOUND` orders in `SENT` or `PAID`. This is the check that covers the in-flight window, and it is exactly where a mis-keyed bank entry shows up.
- **Trial balance** — platform-wide, `Σ ACCRUED` equals the commission portion of all `ISSUED` unpaid invoices.
- **Solvency** — `Σ AVAILABLE` never exceeds the commission portion of collected invoices less cash paid out. **The one that matters.**
- **Invoice and orphan integrity** — each invoice's `commissionTotal` still equals the sum of its period's entries and `totalDue` still equals its three components; no entry lacks a cause; no entry references a closed period.

- [ ] **Step 3: Write fourteen integration tests**

Seven healthy, seven corrupted. This is the phase's core, and there is no shortcut:

```ts
describe("reconciliation checks against a healthy fixture", () => {
  it.each(CHECKS)("$id returns zero rows", async (check) => {
    await seedHealthyMoneyFixture();
    const result = await runCheck(check);
    expect(result.offendingRows).toEqual([]);
  });
});

describe("reconciliation checks against fixtures corrupted for them", () => {
  it("accrual_completeness finds an attribution with no accrual", async () => {
    await seedHealthyMoneyFixture();
    // As the owner role — the application role cannot do this, which is the point.
    await ownerClient.$executeRaw`DELETE FROM ledger_entry WHERE kind = 'ACCRUAL' LIMIT 1`;

    const result = await runCheck(byId("accrual_completeness"));
    expect(result.offendingRows).toHaveLength(1);
  });

  it("accrual_completeness finds an accrual of the wrong amount", async () => {
    await seedHealthyMoneyFixture();
    await ownerClient.$executeRaw`UPDATE ledger_entry SET amount = amount + 1 WHERE kind = 'ACCRUAL'`;

    expect((await runCheck(byId("accrual_completeness"))).offendingRows.length).toBeGreaterThan(0);
  });

  it("release_pairing finds a half-written pair", async () => {
    await seedHealthyMoneyFixture();
    await ownerClient.$executeRaw`
      DELETE FROM ledger_entry WHERE kind = 'RELEASE' AND bucket = 'AVAILABLE' LIMIT 1
    `;
    expect((await runCheck(byId("release_pairing"))).offendingRows).toHaveLength(1);
  });

  it("bucket_conservation finds a bucket that drifted", async () => {
    await seedHealthyMoneyFixture();
    // Flip one RELEASE row's bucket. Pairing still nets to zero per
    // (creator, invoice), so only conservation can catch this one.
    await ownerClient.$executeRaw`
      UPDATE ledger_entry SET bucket = 'AVAILABLE'
      WHERE kind = 'RELEASE' AND bucket = 'ACCRUED'
    `;

    expect((await runCheck(byId("bucket_conservation"))).offendingRows.length).toBeGreaterThan(0);
  });

  it("payout_agreement finds a ledger debit with no payment order", async () => {
    await seedHealthyMoneyFixture();
    await ownerClient.$executeRaw`UPDATE payment_order SET status = 'CANCELLED' WHERE direction = 'OUTBOUND'`;
    expect((await runCheck(byId("payout_agreement"))).offendingRows.length).toBeGreaterThan(0);
  });

  it("trial_balance finds accrued money with no unpaid invoice behind it", async () => {
    await seedHealthyMoneyFixture();
    // Void the invoice that funds the accrued balance. The ledger still
    // says the creator is owed; no unpaid invoice says the brand owes it.
    await ownerClient.$executeRaw`
      UPDATE invoice SET status = 'VOID' WHERE status = 'ISSUED'
    `;

    expect((await runCheck(byId("trial_balance"))).offendingRows.length).toBeGreaterThan(0);
  });

  it("solvency finds Σ AVAILABLE one tetri over cash held", async () => {
    await seedHealthyMoneyFixture();
    await ownerClient.$executeRaw`
      INSERT INTO ledger_entry (creator_id, billing_period_id, bucket, amount, kind,
                                payment_order_id)
      SELECT creator_id, billing_period_id, 'AVAILABLE', 0.01, 'PAYOUT_REVERSAL', payment_order_id
      FROM ledger_entry WHERE kind = 'PAYOUT' LIMIT 1
    `;

    const result = await runCheck(byId("solvency"));
    expect(result.offendingRows).toHaveLength(1);
    expect(byId("solvency").severity).toBe("critical");
  });

  it("invoice_and_orphan_integrity finds an invoice whose total no longer matches", async () => {
    await seedHealthyMoneyFixture();
    await ownerClient.$executeRaw`
      UPDATE invoice
      SET commission_total = commission_total + 1, total_due = total_due + 1
    `;

    expect((await runCheck(byId("invoice_and_orphan_integrity"))).offendingRows.length)
      .toBeGreaterThan(0);
  });

  it("invoice_and_orphan_integrity finds an entry against a closed period", async () => {
    await seedHealthyMoneyFixture();
    const closed = await closeCurrentPeriod();
    await ownerClient.$executeRaw`
      UPDATE ledger_entry SET billing_period_id = ${closed.id}::uuid
      WHERE kind = 'ACCRUAL'
    `;

    expect((await runCheck(byId("invoice_and_orphan_integrity"))).offendingRows.length)
      .toBeGreaterThan(0);
  });

  it("invoice_and_orphan_integrity finds an entry with no cause", async () => {
    await seedHealthyMoneyFixture();
    // The CHECK constraint refuses this on insert, so the corruption has to
    // disable it — which is itself the point: only a superuser can create
    // this state, and the check exists in case one ever does.
    await ownerClient.$executeRaw`ALTER TABLE ledger_entry DROP CONSTRAINT entry_has_a_cause`;
    await ownerClient.$executeRaw`UPDATE ledger_entry SET attribution_id = NULL WHERE kind = 'ACCRUAL'`;

    expect((await runCheck(byId("invoice_and_orphan_integrity"))).offendingRows.length)
      .toBeGreaterThan(0);
  });
});
```

Corruptions run as the **owner** role, because Phase 8 took `UPDATE` and `DELETE` away from the application. That is worth noticing rather than working around: the only way to corrupt the ledger is with credentials the application does not have, which is the protection working.

- [ ] **Step 4: Schedule and surface**

`reconciliation-job.ts` runs nightly. Any failing check writes a structured `critical` or `alert` log line naming the check, the assertion, and a sample of the offending rows, and marks the run in a `reconciliation_run` table so the console can show the last result without re-running seven queries.

Alerting in the MVP is the external uptime monitor watching for a `critical` log line — there is no email (§2). Say so in `docs/runbook.md` rather than implying an alert pipeline exists.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/reconciliation src/modules/worker scripts/corrupt-fixture.ts
git commit -m "feat: add the seven reconciliation checks, each proved against a corrupted fixture"
```

---

### Task 4: Build the admin console

**Files:**

- Create: `src/modules/admin/application/*.ts` and their tests
- Create: `src/modules/admin/http/*.ts` and their tests
- Create: `src/modules/admin/ui/periods.tsx`, `invoices.tsx`, `payouts.tsx`, `adjustments.tsx`
- Create: `app/[locale]/admin/**`, `app/api/admin/**`
- Modify: `src/modules/shell/ui/nav-model.ts`

**Interfaces:**

- Consumes: `closePeriod`, `recordInvoicePayment`, `releasePayout`, `settlePayout`, `writeAdjustment`, `runChecks`
- Produces: four screens, all admin-only

- [ ] **Step 1: Write the failing authorisation tests first**

Everything here moves money, so authorisation is tested before anything else is built:

```ts
describe("admin routes", () => {
  it.each([
    "/api/admin/periods/close",
    "/api/admin/invoices/inv1/payment",
    "/api/admin/payouts/po1/release",
    "/api/admin/adjustments",
  ])("%s refuses an anonymous request", async (path) => {
    expect((await post(path, { viewer: anonymous })).status).toBe(401);
  });

  it.each([...routes])("%s refuses a brand viewer", async (path) => {
    expect((await post(path, { viewer: brandViewer })).status).toBe(403);
  });

  it.each([...routes])("%s refuses a creator viewer", async (path) => {
    expect((await post(path, { viewer: creatorViewer })).status).toBe(403);
  });

  it("navigation offers no admin destination to a non-admin", () => {
    for (const viewer of [anonymous, brandViewer, creatorViewer]) {
      expect(navDestinationsFor(viewer, "ka").every((d) => !d.href.includes("/admin/"))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Build Periods**

The open period with its running totals and a manual close. Closing states what it will do — how many invoices and how many payout drafts — **before** it does it, and asks for confirmation. It is the single most consequential button in the product.

Below it, the last twelve closed periods with their invoice counts.

- [ ] **Step 3: Build Invoices**

Issued and unpaid, sorted by age, with the overdue ones first. Recording a payment opens a form taking the bank reference and the receipt date, and states in the confirmation how much will be released and to how many creators — the operator should see the consequence before committing it.

An already-paid invoice shows the receipt and offers no second payment. R2 §9's "two admins record the same payment" is handled by the database; the interface should make it not happen in the first place.

- [ ] **Step 4: Build Payouts**

Drafted orders to review and release; sent orders to mark paid or failed. A blocked draft — no bank details — is shown at the top with a `warning` `Banner` naming the creator, because that money is sitting still and nobody is being told.

Marking one failed asks for a reason and states that the amount returns to the creator's available balance and will be redrafted at the next close.

- [ ] **Step 5: Build Adjustments**

A form: creator, bucket, signed amount, memo. The memo is `required` on the field and enforced by the database CHECK; write the route-contract test that posts a blank memo and asserts a 422 rather than a 500, so the constraint is a backstop rather than the error path.

Every adjustment is audit-logged with `createdBy`, and the screen shows the last fifty with their memos. R2 §9's "an amount was recorded wrong" is answered by an adjustment with a memo, and the original staying visible — so the list is the feature, not a nicety.

- [ ] **Step 6: Add the reconciliation panel**

The last nightly run, per check: pass or fail, when, and the offending rows when it failed. A "Run now" button for all seven.

- [ ] **Step 7: Run and commit**

```bash
pnpm test:unit && pnpm build
git add src/modules/admin app/[locale]/admin app/api/admin src/modules/shell
git commit -m "feat: build the admin console for periods, invoices, payouts and adjustments"
```

---

### Task 5: Add the exports

**Files:**

- Create: `src/modules/reporting/application/build-invoice-csv.ts`, `build-payout-csv.ts` and their tests
- Create: `app/api/brand/reports/invoice-csv/route.ts`, `app/api/admin/reports/payout-csv/route.ts`

**Interfaces:**

- Consumes: the Phase 7 `toCsv` writer
- Produces:
  - `buildInvoiceCsv(deps)(brandId, periodLabel): Promise<{ filename; body }>` — the per-creator breakdown behind one invoice
  - `buildPayoutCsv(deps)(periodLabel): Promise<{ filename; body }>` — what the operator works a bank run from

- [ ] **Step 1: Write the failing tests**

```ts
describe("buildPayoutCsv", () => {
  it("carries everything needed to make a bank transfer", async () => {
    const { body } = await buildPayoutCsv(deps(fixture))("2026-09-H1");

    for (const column of ["creator", "payoutName", "payoutBank", "payoutIban", "amount", "reference"]) {
      expect(body.split("\r\n")[0]).toContain(column);
    }
  });

  it("takes the bank details from the payee snapshot, not from the creator row", async () => {
    // The snapshot is what was frozen at draft. Reading the live row would
    // send money to an IBAN the payout was never approved against.
    const { body } = await buildPayoutCsv(deps(changedIbanFixture))("2026-09-H1");
    expect(body).toContain("GE00TB0000000000000000");
    expect(body).not.toContain("GE99NEW0000000000000");
  });

  it("includes DRAFT and SENT orders and excludes PAID and FAILED ones", async () => {
    // The operator works a bank run from this file: it must list what still
    // needs sending or confirming, and nothing that is already settled.
    const { body } = await buildPayoutCsv(deps(mixedStatusFixture))("2026-09-H1");

    expect(body).toContain("DRAFTED-CREATOR");
    expect(body).toContain("SENT-CREATOR");
    expect(body).not.toContain("PAID-CREATOR");
    expect(body).not.toContain("FAILED-CREATOR");
  });

  it("flags a blocked payout with no bank details rather than emitting a blank row", async () => {
    const { body } = await buildPayoutCsv(deps(blockedFixture))("2026-09-H1");
    expect(body).toContain("BLOCKED_NO_BANK_DETAILS");
  });
});

describe("buildInvoiceCsv", () => {
  it("breaks the invoice down per creator, summing to commissionTotal", async () => {
    const { body } = await buildInvoiceCsv(deps(fixture))("b1", "2026-08-H2");
    const rows = body.trim().split("\r\n").slice(1);

    const total = rows.reduce((sum, row) => sum.plus(Money.of(row.split(",").at(-1)!)), Money.ZERO);
    expect(total.toStorageString()).toBe("36.86");
  });

  it("states the stored totals, not recomputed ones", async () => {
    const before = await buildInvoiceCsv(deps(fixture))("b1", "2026-08-H2");
    await cancelAnOrderCoveredByThatInvoice();
    const after = await buildInvoiceCsv(deps(fixture))("b1", "2026-08-H2");

    expect(after.body).toBe(before.body);
  });

  it("refuses another brand's invoice", async () => {
    await expect(buildInvoiceCsv(deps(fixture))("b-other", "2026-08-H2")).rejects.toThrowError();
  });
});
```

- [ ] **Step 2: Implement, and keep the R1 CSV**

The §7.4 settlement CSV survives as an export rather than a settlement mechanism (R2 §7.4). Leave it in place, and add a note on the brand's reports screen saying invoices are now the settlement record — otherwise a brand that has been paying against the CSV will keep doing so.

- [ ] **Step 3: Commit**

```bash
pnpm test:unit
git add src/modules/reporting app/api
git commit -m "feat: add the invoice and payout CSV exports"
```

---

### Task 6: Prove R2 end to end

**Files:**

- Create: `scripts/seed-phase-11.ts`, `src/test/e2e/money.spec.ts`
- Modify: `package.json`, `docs/runbook.md`

**Interfaces:**

- Consumes: everything
- Produces: `verify:r2`

- [ ] **Step 1: Write the full-chain test**

R2 §11's end-to-end scenario, asserting the ledger, both balances and the trial balance **at every step**:

```ts
test("@phase-11 click to bank transfer, asserted at every step", async ({ page, request }) => {
  // R1: click -> postback -> attribution
  const clickId = await followRedirect(request, SEEDED_LINK_CODE);
  await postConversion(request, { orderId: "R2-E2E", clickId, items: [perfumeLine] });
  await expectBalances("nino", { pending: "11.44", accrued: "0.00", available: "0.00" });

  // confirm -> accrual
  await confirmOrderAsBrand(page, "R2-E2E");
  await expectBalances("nino", { pending: "0.00", accrued: "11.44", available: "0.00" });
  await expectAllChecksPass();

  // close -> invoice
  await closePeriodAsAdmin(page);
  const invoiceNumber = await readLatestInvoiceNumber();
  await expectTrialBalance();

  // record payment -> release
  await recordPaymentAsAdmin(page, invoiceNumber, "BANK-IN-1");
  await expectBalances("nino", { accrued: "0.00", available: "11.44" });
  await expectAllChecksPass();

  // close -> payout draft (below the 20 GEL minimum, so nothing drafts)
  await closePeriodAsAdmin(page);
  await expectNoPayoutDraft("nino");

  // earn past the minimum, close again, and the draft appears
  await earnAndSettleAnother("30.00");
  await closePeriodAsAdmin(page);
  const payoutId = await expectPayoutDraft("nino", "41.44");

  // release -> the debit lands at SENT
  await releasePayoutAsAdmin(page, payoutId);
  await expectBalances("nino", { available: "0.00", inTransit: "41.44" });
  await expectAllChecksPass();

  // mark paid
  await markPayoutPaidAsAdmin(page, payoutId, "BANK-OUT-1");
  await expectBalances("nino", { available: "0.00", inTransit: "0.00", paidToDate: "41.44" });
  await expectAllChecksPass();
});

for (const locale of ["ka", "en"] as const) {
  test(`@phase-11 ${locale} the money screens have no accessibility violations`, async ({ page }) => {
    for (const path of ["/creator/earnings", "/brand/billing", "/admin/periods", "/admin/payouts"]) {
      await page.goto(`/${locale}${path}`);
      const results = await new AxeBuilder({ page }).withTags(["wcag22aa"]).analyze();
      expect(results.violations, `${locale}${path}`).toEqual([]);
    }
  });
}

test("@phase-11 in transit is hidden when it is zero", async ({ page }) => {
  await signInAsCreator(page, "en");
  await page.goto("/en/creator/earnings");
  await expect(page.getByText(/in transit/i)).toHaveCount(0);
});

test("@phase-11 every figure links to the rows behind it", async ({ page }) => {
  await signInAsCreator(page, "en");
  await page.goto("/en/creator/earnings");

  for (const label of ["Pending", "Accrued", "Available", "Paid to date"]) {
    await expect(page.getByRole("link", { name: new RegExp(label, "i") })).toBeVisible();
  }
});
```

`expectAllChecksPass()` runs all seven reconciliation checks and asserts zero rows. Calling it after every state change is what turns the end-to-end test from a happy-path walk into a proof.

- [ ] **Step 2: Finish the runbook**

Add to `docs/runbook.md`:

- The two blocking legal gates (R2 §10.1, §10.2) with their answer status and who is chasing them.
- R2 §10.3's open question, and what an operator does when `ClawbackPolicyUndecided` fires.
- How to close a period by hand when the scheduler misses a window.
- How to read a failed reconciliation check, and which one to treat as an emergency (solvency, and only solvency).
- The `pg_dump` restore procedure and the date it was last rehearsed against the R2 schema.
- R2 §9's whole error table, as an operator-facing troubleshooting list: what a brand overpaying looks like, what to do when a brand pays two invoices with one transfer, what happens when a creator has no bank details.

- [ ] **Step 3: Rehearse the restore against the R2 schema**

```bash
./scripts/backup-database.sh
createdb shuamo_restore_r2
./scripts/restore-database.sh latest shuamo_restore_r2
DATABASE_URL=postgresql://…/shuamo_restore_r2 pnpm test:integration
```

Do this **before the first invoice is issued** (R2 §12), and record the date.

- [ ] **Step 4: Wire the gate and run it**

```json
{
  "seed:phase-11": "tsx scripts/seed-phase-11.ts",
  "verify:r2": "pnpm verify:phase-10 && pnpm db:migrate:test && pnpm test:integration && pnpm build && pnpm seed:phase-11 && pnpm test:e2e --grep @phase-11"
}
```

```bash
pnpm verify:r2
```

- [ ] **Step 5: Commit**

```bash
git add scripts src/test/e2e/money.spec.ts docs/runbook.md package.json
git commit -m "test: prove R2 end to end, from click to bank transfer"
```

---

## Phase 11 completion checklist

- [ ] `pnpm verify:r2` passes.
- [ ] All seven checks return zero rows against a healthy fixture, and each returns the offending row against a fixture corrupted specifically for it — fourteen tests, no shortcuts.
- [ ] The solvency check catches `Σ AVAILABLE` one tetri over cash held, and is the only check marked `critical`.
- [ ] Corrupting the ledger requires the owner role, because the application role cannot `UPDATE` or `DELETE` — noticed and stated in the test file.
- [ ] The creator's five numbers reconcile to the ledger, and each links to the rows that produced it.
- [ ] "In transit" is shown only when non-zero, and a `SENT` payout counts as neither available nor paid to date.
- [ ] The per-brand breakdown names the brand whose unpaid invoice is holding accrued money, and marks it overdue when it is.
- [ ] `PAYOUT` and `ADJUSTMENT` entries belong to the totals and to no brand's column.
- [ ] The statement opens and closes with balances that reconcile against its movements.
- [ ] Every admin route refuses anonymous, brand and creator viewers, and no admin destination is offered in navigation to a non-admin.
- [ ] A blank adjustment memo returns 422, not 500 — the database CHECK is a backstop, not the error path.
- [ ] The payout CSV takes bank details from `payeeSnapshot`, never from the live creator row.
- [ ] The nightly job writes a structured `critical` log line on a solvency failure, and `docs/runbook.md` says exactly what happens next and what does not (there is no email alerting in R2).
- [ ] The end-to-end test asserts all seven checks after every state change, not only at the end.
- [ ] A `pg_dump` restore has been verified against the R2 schema, before the first invoice, and the date is recorded.
- [ ] **R2 §10.1 and §10.2 are answered in writing before a single lari is collected.** No test substitutes for this.
