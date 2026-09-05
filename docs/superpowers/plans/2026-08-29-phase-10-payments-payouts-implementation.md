# Phase 10 — Payment Orders, Release & Payouts Implementation Plan

> **Superseded lifecycle assumptions — 2026-09-05:** The
> [successful-sale lifecycle decision](2026-09-05-successful-sale-lifecycle.md)
> takes precedence over all older prose, code samples and tests below.
> Successful-sale webhooks immediately confirm sales and earn eligible commission.
> There is no manual order confirmation, pending sale commission, or UNATTRIBUTED
> order status. Attribution is independent of sale status. Confirmation time
> survives cancellation. Brand approval belongs to invoices; approval and period
> close release no funds. Collected brand payment releases funded commission.
> Apply the decision's acceptance tests when implementing this historical plan.


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recording a brand's payment releases exactly the money that invoice covered, and a released payout debits `AVAILABLE` at `SENT` — so no creator is ever paid from money that has not arrived, and no payout can be drafted twice against money already in flight.

**Architecture:** One table, two directions, and constraints rather than goodwill keeping the unused half of each row empty. An `INBOUND` order is a **receipt**, born `PAID`. An `OUTBOUND` order is an **instruction**, with the full `DRAFT → SENT → PAID | FAILED` lifecycle, and it is the row that debits `AVAILABLE` on release to `SENT`. Every state transition writes ledger entries in the same transaction as the status change.

**Tech Stack:** Prisma interactive transactions · PostgreSQL partial unique indexes · the Phase 1 component kit.

**Spec:** `docs/superpowers/specs/2026-08-29-shuamo-r2-accounting-design.md` §1.3, §3.1, §4.3, §4.6, §4.7, §5.3, §5.4, §5.5, §9, §10.3, Appendix A.5, A.7.

## Global Constraints

Inherited from the roadmap. The ones this phase exercises:

- **`PaymentOrder.amount > 0` in both directions. Direction carries the sign, not the amount.**
- An `INBOUND` order has a brand and an invoice and **never** a creator; an `OUTBOUND` one has a creator and **never** a brand or an invoice.
- **The `−AVAILABLE` entry is written on `DRAFT → SENT`, not on `PAID`** (R2 §5.5). Debiting at release is what makes a second payout against in-flight money impossible.
- A creator has at most one `OUTBOUND` order in a non-terminal state at any time, enforced by a partial unique index.
- `Σ AVAILABLE` across all creators never exceeds cash collected less cash paid out. SHUAMO never promises money it has not collected.
- The set of entries a payment releases is exactly `(brand, billingPeriod)` from the invoice — which is what lets a creator's view name the brand holding up their money.
- `payeeSnapshot` preserves what was actually paid to. A later change to `creator.payout_iban` must never rewrite it.
- Settlement truth is operator-entered (R2 §1.3 risk 2). The audit trail and the Phase 11 checks detect a wrong entry after the fact; neither prevents one.
- Each task ends in a commit.

---

## Blocking gates

**Before a single lari is collected**, R2 §10.1 and §10.2 must be answered in writing:

1. Does receiving brand money and paying it to creators make SHUAMO a payment service provider under Georgian law?
2. Must SHUAMO withhold on payouts to individuals, and is its VAT base the fee alone or the whole invoice?

Building this phase is not blocked. **Running it against real money is.** Put both questions at the top of `docs/runbook.md` with their answer status, and do not point the deployment at a real bank account until both are answered.

**R2 §10.3 — post-payout clawback — remains undecided.** Phase 8 built `entriesForCancellation` to throw `ClawbackPolicyUndecided` for that case. This phase wires the real `releaseState`, which means the throw becomes reachable. Task 6 covers what an operator sees when it fires.

---

## Planned file structure

```
prisma/schema.prisma                                   + PaymentOrder,
                                                         PaymentDirection, PaymentStatus;
                                                         the ledger's payment_order_id FK
src/modules/payments/domain/payee-snapshot.ts          + test
src/modules/payments/domain/payout-eligibility.ts      minimum + bank details
src/modules/payments/domain/payout-eligibility.test.ts
src/modules/payments/domain/payment-transitions.ts     both lifecycles
src/modules/payments/domain/payment-transitions.test.ts
src/modules/payments/domain/release-entries.ts         the RELEASE pair
src/modules/payments/domain/release-entries.test.ts
src/modules/payments/ports/payment-repository.ts
src/modules/payments/application/record-invoice-payment.ts   + test
src/modules/payments/application/draft-payouts.ts            + test
src/modules/payments/application/release-payout.ts           + test
src/modules/payments/application/settle-payout.ts            + test
src/modules/payments/infrastructure/prisma-payment-repository.ts
src/modules/payments/infrastructure/payments.integration.test.ts
src/modules/payments/infrastructure/conservation.property.test.ts
src/modules/payments/index.ts
src/modules/ledger/infrastructure/release-state.ts     wires Phase 8's seam
scripts/record-payment.ts  ·  scripts/release-payout.ts
scripts/seed-phase-10.ts
src/test/e2e/payments.spec.ts                          @phase-10
```

---

### Task 1: Add the payment order table

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `src/modules/payments/infrastructure/payments.integration.test.ts`

**Interfaces:**

- Consumes: `Brand`, `Creator`, `Invoice`, `BillingPeriod`, `AppUser`
- Produces: model `PaymentOrder`; enums `PaymentDirection`, `PaymentStatus`; the `ledger_entry.payment_order_id` foreign key deferred from Phase 8

- [ ] **Step 1: Write the failing constraint test**

Every one of the seven CHECK constraints and both partial unique indexes, each named for the constraint it exercises:

```ts
describe("payment_order constraints", () => {
  it("accepts an INBOUND receipt born PAID with a brand and an invoice", async () => {
    const order = await prisma.paymentOrder.create({
      data: {
        direction: "INBOUND", billingPeriodId: period.id, brandId: brand.id,
        invoiceId: invoice.id, amount: new Prisma.Decimal("117.70"),
        status: "PAID", paidAt: new Date(), reference: "BANK-REF-1",
        recordedById: adminUserId,
      },
    });
    expect(order.method).toBe("BANK_TRANSFER");
  });

  it("accepts an OUTBOUND instruction in DRAFT with a creator", async () => {
    const order = await prisma.paymentOrder.create({
      data: {
        direction: "OUTBOUND", billingPeriodId: period.id, creatorId: nino.id,
        amount: new Prisma.Decimal("230.00"), status: "DRAFT",
        payeeSnapshot: { payoutIban: "GE00TB0000000000000000" },
      },
    });

    expect(order.brandId).toBeNull();
    expect(order.invoiceId).toBeNull();
    expect(order.sentAt).toBeNull();
  });

  // The four direction constraints, each exercised by the exact row it
  // exists to refuse. Every other field stays valid, so a rejection can
  // only come from the constraint named in the title.
  it.each([
    ["INBOUND without a brand", "inbound_has_a_brand",
      { direction: "INBOUND", brandId: null, invoiceId: INVOICE, status: "PAID", paidAt: NOW }],
    ["INBOUND with a creator", "outbound_has_a_creator",
      { direction: "INBOUND", brandId: BRAND, creatorId: CREATOR, invoiceId: INVOICE, status: "PAID", paidAt: NOW }],
    ["OUTBOUND without a creator", "outbound_has_a_creator",
      { direction: "OUTBOUND", creatorId: null, status: "DRAFT" }],
    ["OUTBOUND with a brand", "inbound_has_a_brand",
      { direction: "OUTBOUND", creatorId: CREATOR, brandId: BRAND, status: "DRAFT" }],
    ["OUTBOUND with an invoice", "outbound_has_no_invoice",
      { direction: "OUTBOUND", creatorId: CREATOR, invoiceId: INVOICE, status: "DRAFT" }],
  ] as const)("refuses %s — %s", async (_name, _constraint, override) => {
    await expect(insertOrder(override)).rejects.toThrowError();
  });

  it("refuses an INBOUND order in DRAFT or SENT — inbound_is_a_receipt", async () => {
    // A receipt is recorded when the money arrived. "Expected" needs no
    // representation: it is already invoice.status = 'ISSUED'.
    for (const status of ["DRAFT", "SENT", "FAILED"] as const) {
      await expect(createInbound({ status })).rejects.toThrowError();
    }
  });

  it("refuses an INBOUND order with no invoice — inbound_is_a_receipt", async () => {
    await expect(
      insertOrder({ direction: "INBOUND", brandId: BRAND, invoiceId: null, status: "PAID", paidAt: NOW }),
    ).rejects.toThrowError();
  });

  it("refuses PAID without paidAt — paid_at_matches_status", async () => {
    await expect(insertOrder({ ...validOutbound, status: "PAID", sentAt: NOW, paidAt: null }))
      .rejects.toThrowError();
  });

  it.each(["DRAFT", "SENT", "FAILED", "CANCELLED"] as const)(
    "refuses a paidAt on a %s order",
    async (status) => {
      await expect(
        insertOrder({
          ...validOutbound, status, paidAt: NOW,
          sentAt: status === "DRAFT" || status === "CANCELLED" ? null : NOW,
          failedAt: status === "FAILED" ? NOW : null,
        }),
      ).rejects.toThrowError();
    },
  );

  it("refuses FAILED without failedAt — failed_at_matches_status", async () => {
    await expect(insertOrder({ ...validOutbound, status: "FAILED", sentAt: NOW, failedAt: null }))
      .rejects.toThrowError();
  });

  it.each(["DRAFT", "SENT", "PAID", "CANCELLED"] as const)(
    "refuses a failedAt on a %s order",
    async (status) => {
      await expect(insertOrder({ ...validOutbound, status, failedAt: NOW })).rejects.toThrowError();
    },
  );

  it("refuses an OUTBOUND order past DRAFT with no sentAt — outbound_sent_before_paid", async () => {
    for (const status of ["SENT", "PAID", "FAILED"] as const) {
      await expect(createOutbound({ status, sentAt: null })).rejects.toThrowError();
    }
  });

  it("refuses a zero or negative amount in either direction", async () => {
    for (const amount of ["0", "-1.00"]) {
      await expect(createOutbound({ amount })).rejects.toThrowError();
      await expect(createInbound({ amount })).rejects.toThrowError();
    }
  });

  it("refuses a second open payout for one creator — payment_order_one_open_payout_idx", async () => {
    await createOutbound({ creatorId: nino.id, status: "DRAFT" });
    await expect(createOutbound({ creatorId: nino.id, status: "DRAFT" })).rejects.toThrowError();
    await expect(createOutbound({ creatorId: nino.id, status: "SENT" })).rejects.toThrowError();
  });

  it("permits a new payout once the previous one is PAID or FAILED", async () => {
    const first = await createOutbound({ creatorId: nino.id, status: "SENT" });
    await markPaid(first.id);
    await expect(createOutbound({ creatorId: nino.id, status: "DRAFT" })).resolves.toBeDefined();
  });

  it("refuses a second recorded receipt for one invoice — payment_order_one_receipt_idx", async () => {
    await createInbound({ invoiceId: invoice.id, status: "PAID" });
    await expect(createInbound({ invoiceId: invoice.id, status: "PAID" })).rejects.toThrowError();
  });

  it("keeps payeeSnapshot as jsonb defaulting to an empty object", async () => {
    const order = await insertOrder({ ...validOutbound, payeeSnapshot: undefined });
    expect(order.payeeSnapshot).toEqual({});
  });
});
```

`insertOrder` is one helper over `prisma.paymentOrder.create` filling the same defaults every case needs — `billingPeriodId`, `amount: new Prisma.Decimal("230.00")`, `method: "BANK_TRANSFER"` — so each test differs from its neighbours only in the field under examination. `validOutbound` is `{ direction: "OUTBOUND", creatorId: CREATOR }`.

- [ ] **Step 2: Run, confirm failure, write the schema**

Transcribe R2 Appendix A.5 exactly, including every comment — the reasoning in that appendix is the reason the constraints are shaped as they are, and it belongs in the schema next to them.

Add the CHECK constraints and both partial unique indexes by hand, then close Phase 8's second deferred foreign key:

```sql
ALTER TABLE "ledger_entry"
  ADD CONSTRAINT ledger_entry_payment_order_fkey
  FOREIGN KEY (payment_order_id) REFERENCES payment_order(id) ON DELETE RESTRICT;
```

- [ ] **Step 3: Migrate, diff against A.5, run**

```bash
pnpm db:migrate --name phase_10_payments && pnpm db:migrate:test && pnpm test:integration
```

- [ ] **Step 4: Commit**

```bash
git add prisma src/modules/payments
git commit -m "feat: add payment orders with direction constraints in both directions"
```

---

### Task 2: Model the two lifecycles

**Files:**

- Create: `src/modules/payments/domain/payment-transitions.ts`, `payment-transitions.test.ts`
- Create: `src/modules/payments/domain/payee-snapshot.ts`, `payee-snapshot.test.ts`
- Create: `src/modules/payments/domain/payout-eligibility.ts`, `payout-eligibility.test.ts`

**Interfaces:**

- Consumes: `Money`
- Produces:
  - `nextPaymentStatus(direction, current, action): Result<PaymentStatus, "illegal_transition">` where `action` is `"RELEASE" | "MARK_PAID" | "MARK_FAILED" | "CANCEL"`
  - `payeeSnapshotOf(creator: { displayName; payoutBank; payoutIban; payoutName; taxId }): Record<string, string>`
  - `isPayoutEligible(input: { availableBalance: Money; minimum: Money; hasBankDetails: boolean }): { eligible: boolean; blocked: boolean; reason?: "below_minimum" | "no_bank_details" }`

- [ ] **Step 1: Write the failing transition test**

```ts
describe("nextPaymentStatus — OUTBOUND", () => {
  it.each([
    ["DRAFT", "RELEASE", "SENT"],
    ["DRAFT", "CANCEL", "CANCELLED"],
    ["SENT", "MARK_PAID", "PAID"],
    ["SENT", "MARK_FAILED", "FAILED"],
  ] as const)("%s + %s -> %s", (from, action, to) => {
    expect(nextPaymentStatus("OUTBOUND", from, action)).toEqual({ ok: true, value: to });
  });

  it.each([
    ["DRAFT", "MARK_PAID"],      // money cannot arrive before it was sent
    ["SENT", "RELEASE"],
    ["SENT", "CANCEL"],
    ["PAID", "MARK_FAILED"],
    ["PAID", "RELEASE"],
    ["FAILED", "MARK_PAID"],
    ["CANCELLED", "RELEASE"],
  ] as const)("refuses %s + %s", (from, action) => {
    expect(nextPaymentStatus("OUTBOUND", from, action)).toEqual({
      ok: false, error: "illegal_transition",
    });
  });
});

describe("nextPaymentStatus — INBOUND", () => {
  it("has no transitions at all: a receipt is born PAID", () => {
    for (const action of ["RELEASE", "MARK_PAID", "MARK_FAILED"] as const) {
      expect(nextPaymentStatus("INBOUND", "PAID", action).ok).toBe(false);
    }
  });

  it("permits cancelling a receipt recorded in error", () => {
    expect(nextPaymentStatus("INBOUND", "PAID", "CANCEL")).toEqual({ ok: true, value: "CANCELLED" });
  });
});
```

`SENT → FAILED → SENT` is not a transition: R2 §9 says a failed transfer is **redrafted next period**, not retried in place, so the failed row stays as the record of what happened.

- [ ] **Step 2: Write the failing snapshot test**

```ts
describe("payeeSnapshotOf", () => {
  it("captures the bank details as they stood", () => {
    expect(payeeSnapshotOf(nino)).toEqual({
      displayName: "Nino", payoutName: "Nino Beridze",
      payoutBank: "TBC Bank", payoutIban: "GE00TB0000000000000000", taxId: "12345678901",
    });
  });

  it("omits an absent tax id rather than writing null", () => {
    expect(payeeSnapshotOf({ ...nino, taxId: null })).not.toHaveProperty("taxId");
  });

  it("is a plain object, safe to store as jsonb and never re-read as a live join", () => {
    const snapshot = payeeSnapshotOf(nino);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});
```

- [ ] **Step 3: Write the failing eligibility test**

```ts
describe("isPayoutEligible", () => {
  const minimum = Money.of("20.00");

  it("is eligible at exactly the minimum", () => {
    expect(isPayoutEligible({ availableBalance: Money.of("20.00"), minimum, hasBankDetails: true }))
      .toEqual({ eligible: true, blocked: false });
  });

  it("is not eligible one tetri below", () => {
    expect(isPayoutEligible({ availableBalance: Money.of("19.99"), minimum, hasBankDetails: true }))
      .toEqual({ eligible: false, blocked: false, reason: "below_minimum" });
  });

  it("is not eligible at zero or negative", () => {
    for (const balance of ["0.00", "-5.00"]) {
      expect(isPayoutEligible({ availableBalance: Money.of(balance), minimum, hasBankDetails: true }).eligible)
        .toBe(false);
    }
  });

  it("drafts BLOCKED, not skipped, when the creator has no bank details", () => {
    // R2 §9: the payout is drafted and blocked in DRAFT, flagged in the
    // admin queue. The money stays AVAILABLE. Skipping it silently would
    // hide a creator who is owed money and cannot be paid.
    expect(isPayoutEligible({ availableBalance: Money.of("50.00"), minimum, hasBankDetails: false }))
      .toEqual({ eligible: true, blocked: true, reason: "no_bank_details" });
  });

  it("does not draft a blocked payout for a below-minimum balance", () => {
    expect(isPayoutEligible({ availableBalance: Money.of("5.00"), minimum, hasBankDetails: false }))
      .toEqual({ eligible: false, blocked: false, reason: "below_minimum" });
  });
});
```

- [ ] **Step 4: Run, confirm failure, implement all three, commit**

```bash
pnpm vitest run src/modules/payments/domain
git add src/modules/payments/domain
git commit -m "feat: model the payment lifecycles, payee snapshots and payout eligibility"
```

---

### Task 3: Record a brand payment and release the money

**Files:**

- Create: `src/modules/payments/domain/release-entries.ts`, `release-entries.test.ts`
- Create: `src/modules/payments/ports/payment-repository.ts`
- Create: `src/modules/payments/application/record-invoice-payment.ts`, and its test
- Create: `src/modules/payments/infrastructure/prisma-payment-repository.ts`
- Create: `scripts/record-payment.ts`

**Interfaces:**

- Consumes: the ledger and invoice repositories
- Produces:
  - `releaseEntries(input: { accruals: readonly { creatorId; amount: Money }[]; invoiceId; brandId; billingPeriodId }): EntryDraft[]` — the `−ACCRUED` / `+AVAILABLE` pairs
  - `recordInvoicePayment(deps)(actorId, invoiceId, { reference, receivedAt }): Promise<Result<{ released: Money }, RecordPaymentError>>`

- [ ] **Step 1: Write the failing release-entries test**

```ts
describe("releaseEntries", () => {
  it("writes a −ACCRUED and a +AVAILABLE row per creator, sharing the invoice id", () => {
    const entries = releaseEntries({
      accruals: [{ creatorId: "nino", amount: Money.of("11.44") }],
      invoiceId: "inv1", brandId: "b1", billingPeriodId: "period-current",
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ creatorId: "nino", bucket: "ACCRUED", kind: "RELEASE", invoiceId: "inv1" });
    expect(entries[0]?.amount.toStorageString()).toBe("-11.44");
    expect(entries[1]).toMatchObject({ creatorId: "nino", bucket: "AVAILABLE", kind: "RELEASE", invoiceId: "inv1" });
    expect(entries[1]?.amount.toStorageString()).toBe("11.44");
  });

  it("nets to exactly zero per (creator, invoice) — the R2 §8 release-pairing check", () => {
    const entries = releaseEntries({
      accruals: [
        { creatorId: "nino", amount: Money.of("11.44") },
        { creatorId: "dato", amount: Money.of("25.42") },
        { creatorId: "nino", amount: Money.of("3.00") },
      ],
      invoiceId: "inv1", brandId: "b1", billingPeriodId: "p",
    });

    for (const creatorId of ["nino", "dato"]) {
      const net = entries
        .filter((e) => e.creatorId === creatorId)
        .reduce((sum, e) => sum.plus(e.amount), Money.ZERO);
      expect(net.toStorageString()).toBe("0.00");
    }
  });

  it("collapses several accruals for one creator into one pair", () => {
    const entries = releaseEntries({
      accruals: [
        { creatorId: "nino", amount: Money.of("11.44") },
        { creatorId: "nino", amount: Money.of("3.00") },
      ],
      invoiceId: "inv1", brandId: "b1", billingPeriodId: "p",
    });

    expect(entries).toHaveLength(2);
    expect(entries[1]?.amount.toStorageString()).toBe("14.44");
  });

  it("nets a reversal into the release rather than releasing more than was owed", () => {
    const entries = releaseEntries({
      accruals: [
        { creatorId: "nino", amount: Money.of("11.44") },
        { creatorId: "nino", amount: Money.of("-11.44") },
      ],
      invoiceId: "inv1", brandId: "b1", billingPeriodId: "p",
    });

    // Nothing to release: the accrual and its reversal cancel.
    expect(entries).toEqual([]);
  });

  it("writes into the CURRENTLY OPEN period, not the invoice's period", () => {
    const entries = releaseEntries({
      accruals: [{ creatorId: "nino", amount: Money.of("11.44") }],
      invoiceId: "inv1", brandId: "b1", billingPeriodId: "period-current",
    });

    expect(entries.every((e) => e.billingPeriodId === "period-current")).toBe(true);
  });

  it("writes nothing for an invoice with no accruals", () => {
    expect(releaseEntries({ accruals: [], invoiceId: "i", brandId: "b", billingPeriodId: "p" }))
      .toEqual([]);
  });
});
```

- [ ] **Step 2: Write the failing record-payment test**

```ts
describe("recordInvoicePayment", () => {
  it("creates an INBOUND order born PAID, moves the invoice to PAID, and releases", async () => {
    const written: unknown[] = [];
    const result = await recordInvoicePayment(deps({ onWrite: (x) => written.push(x) }))(
      "admin-1", "inv1", { reference: "BANK-1", receivedAt: NOW },
    );

    expect(result.ok).toBe(true);
    expect(written).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "payment_order", direction: "INBOUND", status: "PAID" }),
      expect.objectContaining({ table: "invoice", status: "PAID", paidAt: NOW }),
      expect.objectContaining({ table: "ledger_entry", kind: "RELEASE" }),
    ]));
  });

  it("releases ONLY the entries that invoice covered", async () => {
    // Two brands accrued for Nino in the same period; only Aromashop pays.
    const released = await recordInvoicePayment(deps(twoBrandFixture))("admin-1", "inv-aromashop", payment);

    expect(released.ok && released.value.released.toStorageString()).toBe("11.44");
    const availableAfter = await balances("nino");
    expect(availableAfter.available.toStorageString()).toBe("11.44");
    expect(availableAfter.accrued.toStorageString()).toBe("25.42");   // Techno still owes
  });

  it("records recordedBy and the bank reference", async () => {
    const written: any[] = [];
    await recordInvoicePayment(deps({ onWrite: (x) => written.push(x) }))(
      "admin-1", "inv1", { reference: "BANK-1", receivedAt: NOW },
    );

    const order = written.find((w) => w.table === "payment_order");
    expect(order).toMatchObject({ recordedById: "admin-1", reference: "BANK-1", paidAt: NOW });
  });

  it("refuses to record a payment twice against one invoice", async () => {
    await recordInvoicePayment(deps())("admin-1", "inv1", payment);
    const second = await recordInvoicePayment(deps({ invoiceStatus: "PAID" }))("admin-2", "inv1", payment);

    expect(second).toEqual({ ok: false, error: "already_paid" });
  });

  it.each(["VOID", "DRAFT"] as const)(
    "refuses a %s invoice — only an ISSUED one can be paid",
    async (invoiceStatus) => {
      const result = await recordInvoicePayment(deps({ invoiceStatus }))("admin-1", "inv1", payment);
      expect(result).toEqual({ ok: false, error: "not_payable" });
    },
  );

  it("writes an audit event naming the actor and the reference", async () => {
    const events: any[] = [];
    await recordInvoicePayment(deps({ audit: async (e) => void events.push(e) }))(
      "admin-1", "inv1", { reference: "BANK-1", receivedAt: NOW },
    );

    expect(events[0]).toMatchObject({
      action: "invoice.paid",
      entityType: "invoice",
      entityId: "inv1",
      actorId: "admin-1",
      changes: { reference: "BANK-1" },
    });
  });

  it("rolls everything back if any part fails", async () => {
    const result = await recordInvoicePayment(deps({ failOn: "ledger_entry" }))("admin-1", "inv1", payment);

    expect(result.ok).toBe(false);
    expect(await invoiceStatus("inv1")).toBe("ISSUED");
    expect(await paymentOrderCount("inv1")).toBe(0);
  });
});
```

The two-brand test is R2 §11's named case, and it is the one that proves the release set is scoped to `(brand, period)` rather than to the creator.

- [ ] **Step 3: Implement, in one transaction**

The payment order insert, the invoice update, the release entries, and the audit event all commit together. R2 §5.3 requires it, and a partial write here would leave a creator's `AVAILABLE` balance out of step with the invoice that funded it.

- [ ] **Step 4: Write the operator's tool**

`scripts/record-payment.ts` takes an invoice number and a bank reference. R2 §1.3 risk 2 says settlement truth is operator-entered; the tool exists so the entering is at least consistent, and the admin console in Phase 11 replaces it as the primary path.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/payments scripts/record-payment.ts
git commit -m "feat: record a brand payment and release exactly what it covered"
```

---

### Task 4: Draft, release and settle payouts

**Files:**

- Create: `src/modules/payments/application/draft-payouts.ts`, `release-payout.ts`, `settle-payout.ts` and their tests
- Modify: `src/modules/invoicing/application/close-period.ts` (the `draftPayouts` port from Phase 9)
- Create: `scripts/release-payout.ts`

**Interfaces:**

- Consumes: `isPayoutEligible`, `payeeSnapshotOf`, `nextPaymentStatus`, the balances query
- Produces:
  - `draftPayouts(deps)(tx, { billingPeriodId, at }): Promise<{ drafted: number; blocked: number }>`
  - `releasePayout(deps)(actorId, paymentOrderId): Promise<Result<void, ReleaseError>>` — writes `−AVAILABLE`
  - `settlePayout(deps)(actorId, paymentOrderId, outcome: { kind: "PAID"; reference } | { kind: "FAILED"; reason }): Promise<Result<void, SettleError>>`

- [ ] **Step 1: Write the failing drafting test**

```ts
describe("draftPayouts", () => {
  it("drafts one order per eligible creator, for the full AVAILABLE balance", async () => {
    const drafted: unknown[] = [];
    await draftPayouts(deps({
      balances: [{ creatorId: "nino", available: Money.of("230.00") }],
      onDraft: (o) => drafted.push(o),
    }))(fakeTx, { billingPeriodId: "p-new", at: NOW });

    expect(drafted[0]).toMatchObject({
      direction: "OUTBOUND", creatorId: "nino", status: "DRAFT", billingPeriodId: "p-new",
    });
    expect(drafted[0].amount.toStorageString()).toBe("230.00");
  });

  it("drafts nothing below the minimum, and the balance rolls", async () => {
    const drafted: unknown[] = [];
    await draftPayouts(deps({
      balances: [{ creatorId: "nino", available: Money.of("19.99") }],
      onDraft: (o) => drafted.push(o),
    }))(fakeTx, { billingPeriodId: "p", at: NOW });

    expect(drafted).toEqual([]);
  });

  it("writes NO ledger entry at draft time — the debit lands on SENT", async () => {
    const entries: unknown[] = [];
    await draftPayouts(deps({ onLedgerWrite: (e) => entries.push(e) }))(fakeTx, request);
    expect(entries).toEqual([]);
  });

  it("snapshots the payee at draft time", async () => {
    const drafted: unknown[] = [];
    await draftPayouts(deps({ onDraft: (o) => drafted.push(o) }))(fakeTx, request);
    expect(drafted[0].payeeSnapshot).toMatchObject({ payoutIban: "GE00TB0000000000000000" });
  });

  it("drafts a blocked order for a creator with no bank details, and flags it", async () => {
    const drafted: unknown[] = [];
    const result = await draftPayouts(deps({
      creators: [{ id: "nino", available: Money.of("50.00"), hasBankDetails: false }],
      onDraft: (o) => drafted.push(o),
    }))(fakeTx, request);

    expect(result.blocked).toBe(1);
    expect(drafted[0]).toMatchObject({ status: "DRAFT", memo: expect.stringContaining("bank details") });
  });

  it("drafts nothing for a creator who already has an open payout", async () => {
    const result = await draftPayouts(deps({ openPayoutFor: ["nino"] }))(fakeTx, request);
    expect(result.drafted).toBe(0);
  });

  it("pays out of PREVIOUSLY COLLECTED invoices only", async () => {
    // The invoices this close run just issued have not been paid by anyone,
    // so they contribute nothing to AVAILABLE (R2 §5.5).
    await confirmOrderWorth("500.00");
    const result = await runCloseJob();

    expect(result.invoicesIssued).toBe(1);
    expect(result.payoutsDrafted).toBe(0);
  });

  it("drafts into the period that has just OPENED, not the one that closed", async () => {
    const drafted: unknown[] = [];
    await draftPayouts(deps({ onDraft: (o) => drafted.push(o) }))(fakeTx, { billingPeriodId: "p-new", at: NOW });
    expect(drafted[0].billingPeriodId).toBe("p-new");
  });
});
```

- [ ] **Step 2: Write the failing release and settle tests**

```ts
describe("releasePayout", () => {
  it("writes the −AVAILABLE entry on DRAFT -> SENT", async () => {
    const entries: unknown[] = [];
    await releasePayout(deps({ onLedgerWrite: (e) => entries.push(e) }))("admin-1", "po1");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: "PAYOUT", bucket: "AVAILABLE", paymentOrderId: "po1" });
    expect(entries[0].amount.toStorageString()).toBe("-230.00");
  });

  it("stamps sentAt", async () => {
    const updates: any[] = [];
    await releasePayout(deps({ onUpdate: (u) => updates.push(u) }))("admin-1", "po1");

    expect(updates[0]).toMatchObject({ id: "po1", status: "SENT", sentAt: NOW });
  });

  it("refuses to release a payout that is not DRAFT", async () => {
    for (const status of ["SENT", "PAID", "FAILED", "CANCELLED"] as const) {
      expect((await releasePayout(deps({ status }))("admin-1", "po1")).ok).toBe(false);
    }
  });

  it("refuses a blocked payout with no bank details", async () => {
    const result = await releasePayout(deps({ payeeSnapshot: {} }))("admin-1", "po1");
    expect(result).toEqual({ ok: false, error: "no_payee_details" });
  });

  it("writes an audit event naming the releasing admin", async () => {
    const events: any[] = [];
    await releasePayout(deps({ audit: async (e) => void events.push(e) }))("admin-1", "po1");

    expect(events[0]).toMatchObject({
      action: "payout.released",
      entityType: "payment_order",
      entityId: "po1",
      actorId: "admin-1",
    });
  });
});

describe("settlePayout", () => {
  it("writes NO ledger entry on SENT -> PAID — the debit already happened", async () => {
    const entries: unknown[] = [];
    await settlePayout(deps({ onLedgerWrite: (e) => entries.push(e) }))(
      "admin-1", "po1", { kind: "PAID", reference: "BANK-OUT-1" },
    );
    expect(entries).toEqual([]);
  });

  it("writes a PAYOUT_REVERSAL returning the exact amount on SENT -> FAILED", async () => {
    const entries: unknown[] = [];
    await settlePayout(deps({ onLedgerWrite: (e) => entries.push(e) }))(
      "admin-1", "po1", { kind: "FAILED", reason: "IBAN rejected" },
    );

    expect(entries[0]).toMatchObject({ kind: "PAYOUT_REVERSAL", bucket: "AVAILABLE" });
    expect(entries[0].amount.toStorageString()).toBe("230.00");
  });

  it("records the failure reason on the row", async () => {
    const updates: any[] = [];
    await settlePayout(deps({ onUpdate: (u) => updates.push(u) }))(
      "admin-1", "po1", { kind: "FAILED", reason: "IBAN rejected" },
    );

    expect(updates[0]).toMatchObject({
      status: "FAILED", failedAt: NOW, failureReason: "IBAN rejected",
    });
  });

  it("refuses to settle a DRAFT order — money that was never sent cannot arrive", async () => {
    for (const outcome of [
      { kind: "PAID", reference: "R" },
      { kind: "FAILED", reason: "x" },
    ] as const) {
      const result = await settlePayout(deps({ status: "DRAFT" }))("admin-1", "po1", outcome);
      expect(result).toEqual({ ok: false, error: "illegal_transition" });
    }
  });
});
```

- [ ] **Step 3: Write the integration proof that the debit lands at SENT**

```ts
it("debits AVAILABLE between DRAFT and SENT, not at PAID", async () => {
  const { payoutId, creatorId } = await seedDraftedPayout("230.00");

  expect((await balances(creatorId)).available.toStorageString()).toBe("230.00");

  await releasePayout(real)("admin-1", payoutId);
  expect((await balances(creatorId)).available.toStorageString()).toBe("0.00");

  await settlePayout(real)("admin-1", payoutId, { kind: "PAID", reference: "R" });
  expect((await balances(creatorId)).available.toStorageString()).toBe("0.00");
});

it("returns the exact amount on failure and redrafts at the next close", async () => {
  const { payoutId, creatorId } = await seedSentPayout("230.00");

  await settlePayout(real)("admin-1", payoutId, { kind: "FAILED", reason: "IBAN rejected" });
  expect((await balances(creatorId)).available.toStorageString()).toBe("230.00");

  await runCloseJob();
  const redrafted = await prisma.paymentOrder.findFirst({
    where: { creatorId, status: "DRAFT" },
  });
  expect(redrafted?.amount.toFixed(2)).toBe("230.00");
});

it("payeeSnapshot survives a later change to the creator's IBAN", async () => {
  const { payoutId, creatorId } = await seedSentPayout("230.00");
  const before = await readSnapshot(payoutId);

  await prisma.creator.update({
    where: { id: creatorId }, data: { payoutIban: "GE99NEW0000000000000" },
  });

  expect(await readSnapshot(payoutId)).toEqual(before);
});
```

- [ ] **Step 4: Wire the close job**

Replace Phase 9's stub `draftPayouts` port with the real one. The close job's step 3 now drafts real payouts, and its idempotency test — run twice, one draft — is enforced by the partial unique index rather than by the job's own logic.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/payments src/modules/invoicing scripts/release-payout.ts
git commit -m "feat: draft, release and settle creator payouts, debiting at SENT"
```

---

### Task 5: Wire the cancellation release state

**Files:**

- Create: `src/modules/ledger/infrastructure/release-state.ts`
- Modify: `src/modules/ledger/application/reverse-on-cancel.ts`
- Create: tests for both

**Interfaces:**

- Consumes: the ledger and payment repositories
- Produces: `releaseStateOf(deps)(attributionId): Promise<"not_released" | "released" | "paid_out">`

Phase 8 built `entriesForCancellation` to take this and always passed `not_released`. Now it can be computed.

- [ ] **Step 1: Write the failing test**

```ts
describe("releaseStateOf", () => {
  it("is not_released when the invoice covering the accrual is unpaid", async () => {
    expect(await releaseStateOf(real)(attributionWithUnpaidInvoice)).toBe("not_released");
  });

  it("is not_released when no invoice has been issued yet", async () => {
    expect(await releaseStateOf(real)(attributionInOpenPeriod)).toBe("not_released");
  });

  it("is released once the brand paid and the RELEASE pair was written", async () => {
    expect(await releaseStateOf(real)(attributionOnPaidInvoice)).toBe("released");
  });

  it("is paid_out once an OUTBOUND payout covering that money is SENT or PAID", async () => {
    expect(await releaseStateOf(real)(attributionAfterPayout)).toBe("paid_out");
  });

  it("is released, not paid_out, when the payout FAILED and the money came back", async () => {
    expect(await releaseStateOf(real)(attributionAfterFailedPayout)).toBe("released");
  });
});
```

Determining `paid_out` needs care: the ledger does not link an individual accrual to an individual payout, because a payout is drawn against a balance rather than against specific entries. The honest rule, and the one to implement: an attribution is `paid_out` when its `RELEASE` predates a `PAYOUT` for that creator that is still `SENT` or `PAID` and has not been reversed. Write that rule as a comment in the code — a future reader will otherwise assume a link exists.

- [ ] **Step 2: Wire it and see the block become reachable**

```ts
it("refuses to cancel an order whose commission was already paid out", async () => {
  const { conversionId } = await seedPaidOutOrder();

  await expect(cancelOrder(conversionId)).rejects.toThrowError(ClawbackPolicyUndecided);
  // Nothing partially written: the transaction rolled back.
  expect(await conversionStatus(conversionId)).toBe("CONFIRMED");
  expect(await ledgerEntryCount({ kind: "REVERSAL" })).toBe(0);
});
```

- [ ] **Step 3: Surface it to the operator**

The orders queue shows a `danger` `Banner` on that order rather than a failed button click: *"This order's commission has already been paid to the creator. Cancelling it needs a decision that has not been made — contact the operator."* Both locales. R2 §10.3 is a product decision, and the interface should say so rather than showing a stack trace.

- [ ] **Step 4: Run and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/ledger src/modules/conversions
git commit -m "feat: compute the cancellation release state and surface the blocked path"
```

---

### Task 6: Prove conservation at every step

**Files:**

- Create: `src/modules/payments/infrastructure/conservation.property.test.ts`
- Create: `scripts/seed-phase-10.ts`, `src/test/e2e/payments.spec.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: the whole money stack
- Produces: `verify:phase-10`

- [ ] **Step 1: Write the conservation property test**

R2 §11's headline test. Three checks, asserted after **every single step** of a randomised sequence:

```ts
async function assertConservation(step: number) {
  // 1. Release pairing: every RELEASE nets to zero per (creator, invoice).
  const unpaired = await prisma.$queryRaw<unknown[]>`
    SELECT creator_id, invoice_id, sum(amount) AS net
    FROM ledger_entry WHERE kind = 'RELEASE'
    GROUP BY creator_id, invoice_id HAVING sum(amount) <> 0
  `;
  expect(unpaired, `release pairing after step ${step}`).toEqual([]);

  // 2. Bucket conservation: per creator, ACCRUED + AVAILABLE equals the sum
  //    of every non-RELEASE kind.
  const drifted = await prisma.$queryRaw<unknown[]>`
    SELECT creator_id
    FROM ledger_entry GROUP BY creator_id
    HAVING sum(amount)
        <> sum(amount) FILTER (WHERE kind <> 'RELEASE')
         + sum(amount) FILTER (WHERE kind =  'RELEASE')
  `;
  expect(drifted, `bucket conservation after step ${step}`).toEqual([]);

  // 3. Payout agreement: per creator, −Σ(PAYOUT + PAYOUT_REVERSAL) equals
  //    Σ amount of OUTBOUND orders in SENT or PAID. This is the check that
  //    covers the window where money is in flight and belongs to neither
  //    AVAILABLE nor "paid to date".
  const disagreed = await prisma.$queryRaw<unknown[]>`
    SELECT c.id
    FROM creator c
    LEFT JOIN (
      SELECT creator_id, -sum(amount) AS ledgered
      FROM ledger_entry WHERE kind IN ('PAYOUT','PAYOUT_REVERSAL') GROUP BY creator_id
    ) l ON l.creator_id = c.id
    LEFT JOIN (
      SELECT creator_id, sum(amount) AS ordered
      FROM payment_order
      WHERE direction = 'OUTBOUND' AND status IN ('SENT','PAID') GROUP BY creator_id
    ) p ON p.creator_id = c.id
    WHERE COALESCE(l.ledgered, 0) <> COALESCE(p.ordered, 0)
  `;
  expect(disagreed, `payout agreement after step ${step}`).toEqual([]);
}

it("holds all three conservation checks after every step of a randomised sequence", async () => {
  const random = mulberry32(101010);
  await seedTwoBrandsThreeCreators();

  for (let step = 0; step < 300; step += 1) {
    const action = pick(random, [
      "confirm", "cancel", "close", "recordPayment", "releasePayout", "markPaid", "markFailed",
    ]);

    try {
      await perform(action, random);
    } catch (error) {
      // Illegal transitions and the undecided clawback are expected and
      // must change nothing. Anything else is a real failure.
      if (!(error instanceof IllegalTransition || error instanceof ClawbackPolicyUndecided)) throw error;
    }

    await assertConservation(step);
  }
});

it("keeps Σ AVAILABLE at or below cash collected less cash paid out, at every step", async () => {
  await runRandomisedSequence(300, async (step) => {
    const [{ available, collected, paid }] = await prisma.$queryRaw<SolvencyRow[]>`
      SELECT
        (SELECT COALESCE(sum(amount), 0) FROM ledger_entry WHERE bucket = 'AVAILABLE') AS available,
        (SELECT COALESCE(sum(amount), 0) FROM payment_order
          WHERE direction = 'INBOUND' AND status = 'PAID') AS collected,
        (SELECT COALESCE(sum(amount), 0) FROM payment_order
          WHERE direction = 'OUTBOUND' AND status IN ('SENT','PAID')) AS paid
    `;

    // The check that ends the company if it fails (R2 §8).
    expect(Number(available), `solvency after step ${step}`)
      .toBeLessThanOrEqual(Number(collected) - Number(paid));
  });
});
```

The solvency assertion uses the commission portion of collected invoices rather than `total_due`, since the fee and its VAT are SHUAMO's revenue and were never owed to a creator. Adjust the query accordingly and state the reasoning in a comment — getting this wrong makes the check pass when the company is insolvent.

- [ ] **Step 2: Write the browser journey**

```ts
test("@phase-10 the full money round trip", async ({ page }) => {
  await confirmSeededOrder();               // accrual
  await runCloseJob();                      // invoice
  await recordPaymentViaScript();           // release
  await runCloseJob();                      // payout draft
  await releasePayoutViaScript();           // −AVAILABLE at SENT
  await markPayoutPaidViaScript();

  await signInAsCreator(page, "en");
  await page.goto("/en/creator/earnings");

  await expect(page.getByText(/paid to date/i)).toBeVisible();
  await expect(page.getByText("230.00 ₾")).toBeVisible();
});
```

- [ ] **Step 3: Wire the gate and run it**

```json
{
  "seed:phase-10": "tsx scripts/seed-phase-10.ts",
  "verify:phase-10": "pnpm verify:phase-9 && pnpm db:migrate:test && pnpm test:integration && pnpm build && pnpm seed:phase-10 && pnpm test:e2e --grep @phase-10"
}
```

```bash
pnpm verify:phase-10
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/payments scripts src/test/e2e/payments.spec.ts package.json
git commit -m "test: prove ledger conservation and solvency after every step"
```

---

## Phase 10 completion checklist

- [ ] `pnpm verify:phase-10` passes.
- [ ] Every direction constraint in R2 §4.6 rejects the row it should — one test per constraint, each named for it.
- [ ] An `INBOUND` order cannot exist in `DRAFT`, `SENT` or `FAILED`, and cannot exist without an invoice.
- [ ] A second recorded receipt for one invoice fails **at the database**.
- [ ] A second open payout for one creator fails at the database; a new one is permitted once the previous is `PAID` or `FAILED`.
- [ ] Recording a payment releases **only** the entries that invoice covered — proved with two brands accruing for the same creator in the same period, one of which pays.
- [ ] `AVAILABLE` drops between `DRAFT` and `SENT`, and does not move again at `PAID` — asserted by reading the balance between the two transitions.
- [ ] `FAILED` returns the exact amount to `AVAILABLE`, and the creator is redrafted at the next close.
- [ ] `payeeSnapshot` is unchanged after the creator's IBAN changes.
- [ ] A creator with no bank details is drafted and blocked, flagged, with the money still `AVAILABLE`.
- [ ] The close job pays out of previously collected invoices only — a first close issues invoices and drafts no payouts.
- [ ] Release pairing, bucket conservation and payout agreement all hold after **every** step of a 300-step randomised sequence, including while a payout is `SENT` and not yet `PAID`.
- [ ] Solvency holds at every step: `Σ AVAILABLE` never exceeds the commission portion of collected invoices less cash paid out.
- [ ] Cancelling a paid-out order throws `ClawbackPolicyUndecided`, writes nothing, and the operator sees an explanation rather than an error.
- [ ] R2 §10.1 and §10.2 are recorded in `docs/runbook.md` with their answer status, and no real bank account is connected until both are answered.
