# XUAMO R2 — Accounting, Invoicing and Payouts

**Date:** 2026-08-29
**Status:** Approved for planning
**Depends on:** `2026-08-28-xuamo-r1-design.md` (the tracking spine). Section references bare of a
prefix — §6.3, §7.2 — point into that document. References into this one are written R2 §n.
**Scope:** The money stack only. Campaigns, domain verification, brand teams, the pixel path, key
rotation and rate history are also R2 in the R1 sequencing table and are not in this spec.

---

## 1. What changes

R1 measures. R2 settles.

In R1 the platform computes what is owed and hands both parties a CSV; the brand pays each creator
directly and XUAMO never touches the money. R2 puts XUAMO in the middle:

```
Brand ──invoiced fortnightly──▶ XUAMO ──pays out fortnightly──▶ Creator
```

The brand receives one invoice per fortnight covering every commission its orders generated, plus
XUAMO's platform fee. XUAMO collects that money and pays each creator. A creator now has a balance
with XUAMO rather than a claim against a brand.

### 1.1 What this has to prove

That every lari can be traced, in both directions, from the click that earned it to the bank
transfer that settled it — and that the total XUAMO owes creators never exceeds what it has
collected. R1's calculator decides *how much*. R2 decides *whose it is now, and where it is*.

### 1.2 What R2 reverses in R1

These are not refinements. Each one contradicts a load-bearing statement in the R1 document, and
that document should be read as superseded on these five points once R2 ships.

| R1 said | R2 |
| --- | --- |
| §3.3, §8 — "XUAMO moves none of it. Brand and creator settle off-platform against the CSV" | XUAMO invoices, collects, and pays out |
| §13.6 — the fund-handling licensing question "returns with R2 and must be answered before that release" | This is that release. It is now a blocking gate (R2 §10.1) |
| §13.3 — Georgian tax treatment of creator payouts, needed "even though the MVP moves no money" | Now determines whether XUAMO withholds. Also blocking (R2 §10.2) |
| §2 — "Approvals happen by seed script and direct database access. There is no admin UI" | Period close, invoice review and payment recording need real screens (R2 §7.3) |
| §7.4 — the monthly CSV is the settlement handoff | The CSV demotes to an export. Invoices and payment orders are the settlement record |

### 1.3 Accepted risks

1. **XUAMO holds third-party money.** Everything in R2 §10.1 must be answered before a single lari
   is collected. This is a legal precondition, not a launch task.
2. **Settlement truth is operator-entered.** No bank API (§8, permanently out of scope). An operator
   reads a bank statement and records that money arrived or left. A mistyped entry moves a creator's
   balance and nothing in the system can contradict it. The mitigations are the audit trail and the
   R2 §8 reconciliation checks, both of which detect a wrong entry after the fact — neither prevents
   one.
3. **A brand that never pays freezes its creators' money indefinitely.** By design: XUAMO never
   promises money it has not collected. Creators can see exactly which brand is holding things up,
   and that is the whole mitigation. There is no dunning, no collections, no
   suspension-for-non-payment.
4. **Post-payout clawback is undecided.** R2 §10.3. The ledger expresses every candidate policy, so
   this blocks the cancellation-after-payout path only, not the rest of the build.
5. **Payments are all-or-nothing.** An invoice is paid or it is not; a partial bank transfer has no
   representation. At pilot scale the operator chases the remainder rather than modelling it.
6. **A brand's credit can strand.** A cancellation after that brand's last-ever invoice leaves a
   credit with no future invoice to net against (R2 §5.4). Resolved by hand.
7. **The fee rate is snapshotted per invoice, not versioned.** Changing `Brand.platformFeeRate`
   affects the next invoice issued. Already-issued invoices never move. Same shape as §1.2 risk 3.

---

## 2. Scope boundary

**In scope:**

- Creator balance ledger: append-only, two buckets, signed entries
- Semi-monthly billing periods with an explicit close
- Brand invoices: commission pool + platform fee + fee VAT, sequentially numbered
- Payment orders in both directions, recorded by hand
- Automatic payout drafting at period close, above a minimum, released by an admin
- Creator earnings view: pending / accrued / available / paid, per brand and in total
- Per-period creator statement, down to the individual attribution
- Brand billing view: invoice history and a running current-period total
- Admin console: period close, invoice queue, payment order queue, adjustments
- Nightly reconciliation checks, including a solvency check
- `ka` and `en`, both complete, as in R1

**Deferred.**

| Cut | R2 substitute | Returns in |
| --- | --- | --- |
| Bank API connectivity, statement import | Operator records payment orders by hand | R4 |
| Dunning, overdue escalation, auto-suspension | The invoice queue shows an age; a human acts | R3 |
| Partial invoice payment, payment plans | Paid or unpaid | R3 |
| Tax withholding on creator payouts | Pay gross. A `WITHHOLDING` entry kind slots in without a migration | Pending R2 §10.2 |
| Creator-initiated withdrawal | Scheduled payout only — a wallet withdrawable on demand is out of scope at any release (§8) | Never |
| Multi-currency | GEL only | Never |
| Payout batches as a first-class entity | One payment order per creator per period | R3 |
| PDF rendering of invoices | HTML view plus CSV. A PDF is a rendering concern, not an accounting one | R3 |
| Emailed invoices and payout notices | In-app only; email is R3 in R1 §2 | R3 |
| Credit notes as their own document | A negative line on the next invoice (R2 §5.4) | R3 |

---

## 3. Decisions register

### 3.1 Money flow

| Decision | Value |
| --- | --- |
| Model | XUAMO invoices the full commission pool, collects it, and pays creators |
| Fee | Markup on top. The creator receives 100% of `Attribution.commissionAmount` |
| Fee basis | `round(commissionTotal × Brand.platformFeeRate, 0.01)`, rate snapshotted at issue |
| Fee VAT | Platform-level 18% on the fee line when XUAMO is VAT-registered. Never on the commission pool (R2 §10.2) |
| Currency | GEL only |
| Balance model | Append-only signed ledger, two buckets. Never updated, never deleted |
| Payable trigger | `ACCRUED` on brand confirmation → `AVAILABLE` on receipt of the brand's payment |
| Credit risk | XUAMO carries none. No creator is paid from money that has not arrived |
| Period | Semi-monthly: 1–15 and 16–end of month, Asia/Tbilisi |
| Period assignment | The period **open when the entry was written**, not `confirmedAt` (R2 §4.3) |
| Invoice | One per `(brand, period)`. Totals stored, not derived |
| Invoice numbering | Gapless `XU-YYYY-NNNNNN` from a locked counter row (R2 §5.2) |
| Payment recording | Manual. One `PaymentOrder`, `direction INBOUND` or `OUTBOUND` |
| Payout drafting | Automatic at period close, above a configurable minimum. Released by an admin |
| Payout execution | By hand, at a bank. XUAMO records the reference |
| Partial payment | Not represented |

### 3.2 What is derived and what is stored

R1's rule 1 was "nothing derivable is stored." R2 keeps it, and names the three places it bends:

| Stored | Why it is not derived |
| --- | --- |
| `LedgerEntry` itself | It is not a cache of the attributions. An adjustment, a write-off or a fee waiver has no attribution behind it, and the first one of those forces the table into existence anyway — after money has moved, which is the worst possible time to add it |
| `Invoice` totals | An invoice is a legal document. It must still say what it said on the day it was issued, even after a later cancellation moves the underlying figures. Identical argument to §4.2's `Attribution.commissionAmount` |
| `LedgerEntry.brandId` | Denormalised. Invoicing groups entries by brand; without the column that is `Attribution → ConversionItem → Conversion`, three joins on the largest money table. Identical argument to §4.2's `Click.brand` |

And the place it does not bend: **there is no `InvoiceLine` table.** Because every entry lands in
the period that was open when it was written, a closed period's entry set is frozen forever, so the
per-creator breakdown on an invoice is derivable *and* stable. Pending commission is likewise absent
from the ledger — "the brand has not confirmed yet" stays a query over `Attribution ⋈ Conversion`.
The ledger holds only money someone has actually earned, which is what keeps
`Σ ACCRUAL = Σ confirmed attributions` a checkable equality rather than a hope.

---

## 4. Domain model

Four new tables, one counter, two altered. Notation as §4.1: `→X` foreign key, `?` nullable,
`✦` unique, `ts` = `timestamptz`, `gel` = `numeric(12,2)`.

### 4.1 New tables

```
BillingPeriod  label:text✦  startsAt:ts✦  endsAt:ts  status:PeriodStatus  closedAt:ts?

LedgerEntry    creator:→Creator  billingPeriod:→BillingPeriod  bucket:LedgerBucket
               amount:gel signed  kind:LedgerKind  brand:→Brand?
               attribution:→Attribution?  invoice:→Invoice?  paymentOrder:→PaymentOrder?
               memo:text  createdBy:→User?

Invoice        brand:→Brand  billingPeriod:→BillingPeriod  number:text✦
               issuedAt:ts  dueAt:ts
               commissionTotal:gel  feeRate:numeric(9,4)  feeAmount:gel
               feeVatAmount:gel  totalDue:gel
               status:InvoiceStatus  paidAt:ts?              ✦(brand,billingPeriod)

PaymentOrder   direction:PaymentDirection  billingPeriod:→BillingPeriod
               brand:→Brand?  creator:→Creator?  invoice:→Invoice?
               amount:gel  status:PaymentStatus  method:text  reference:text?
               payeeSnapshot:jsonb  memo:text
               recordedBy:→User?  sentAt:ts?  paidAt:ts?  failedAt:ts?  failureReason:text?

InvoiceCounter year:int pk  nextSeq:int          gapless numbering, one row per year
```

### 4.2 Altered tables

```
Brand    + legalName:text  taxId:text  platformFeeRate:numeric(9,4)  netTermsDays:int

Creator  + taxId:text?
         payoutBank / payoutIban / payoutName are now read. R1 §2 collected them unused
```

`Brand.vatRegistered` is unchanged and keeps its R1 meaning — it derives *line* VAT inside the
attribution calculator (§6.3). XUAMO's own VAT status is platform configuration, not a brand column,
because it is the same for every invoice XUAMO issues.

### 4.3 The ledger, in detail

Every creator has exactly two buckets. A balance is `SUM(amount)` filtered by bucket.

| Bucket | Means | May go negative |
| --- | --- | --- |
| `ACCRUED` | Brand confirmed the order. Earned, awaiting the brand's money | No |
| `AVAILABLE` | The brand's invoice was paid. XUAMO owes this now | Open — R2 §10.3 |

Moving money writes two rows rather than editing one, so no amount is ever destroyed:

| Kind | Trigger | Entries written |
| --- | --- | --- |
| `ACCRUAL` | `Conversion PENDING → CONFIRMED` | `+ACCRUED`, one per `Attribution` on the order |
| `RELEASE` | `Invoice → PAID` | `−ACCRUED` and `+AVAILABLE`, one pair per covered `ACCRUAL` |
| `PAYOUT` | outbound `PaymentOrder → SENT` | `−AVAILABLE` |
| `PAYOUT_REVERSAL` | outbound `PaymentOrder → FAILED` | `+AVAILABLE` |
| `REVERSAL` | `Conversion → CANCELLED` after accrual | `−ACCRUED`, or `−AVAILABLE` if already released |
| `ADJUSTMENT` | Admin, memo mandatory, `createdBy` mandatory | ± either bucket |

**Period assignment is the load-bearing rule.** `LedgerEntry.billingPeriodId` is always *the period
that was open at the moment the row was written* — never one derived from `confirmedAt` or
`occurredAt`. This is §7.4's reasoning taken to its conclusion. A brand that confirms an order two
months late produces an accrual in today's period; a closed period can therefore never re-populate,
and an invoice already sent can never need reissuing. It also makes invoicing one indexed query
instead of a date-range argument.

**Debits carry the bucket they leave.** A `RELEASE` writes `−ACCRUED` and `+AVAILABLE` as two rows
sharing an `invoiceId`, so the pair is recoverable and the release-pairing check in R2 §8 is a
`GROUP BY (creator, invoice)` asserting zero.

### 4.4 Enums

```
PeriodStatus       OPEN · CLOSED
LedgerBucket       ACCRUED · AVAILABLE
LedgerKind         ACCRUAL · RELEASE · PAYOUT · PAYOUT_REVERSAL · REVERSAL · ADJUSTMENT
InvoiceStatus      DRAFT · ISSUED · PAID · VOID
PaymentDirection   INBOUND · OUTBOUND
PaymentStatus      DRAFT · SENT · PAID · FAILED · CANCELLED
```

There is no `OVERDUE` invoice status. Overdue is `status = ISSUED AND dueAt < now()` — a query, not
a state, and inventing the state would mean a job whose only purpose is to transition into it.

### 4.5 Relationships

```
BillingPeriod ─┬─< LedgerEntry
               ├─< Invoice
               └─< PaymentOrder

Creator ─< LedgerEntry
Brand   ─< LedgerEntry              denormalised; null on PAYOUT and ADJUSTMENT
Brand   ─< Invoice ─< PaymentOrder  (INBOUND, exactly one once PAID)
Creator ─< PaymentOrder             (OUTBOUND)

Attribution  ─1:1─ LedgerEntry (ACCRUAL)     the earning
Invoice      ─<    LedgerEntry (RELEASE)     what that payment released
PaymentOrder ─<    LedgerEntry (PAYOUT)      what left
```

Every `LedgerEntry` points at whatever caused it. `ACCRUAL` and `REVERSAL` name an attribution,
`RELEASE` names an invoice, `PAYOUT` and `PAYOUT_REVERSAL` name a payment order, `ADJUSTMENT` names
a user and a memo. An entry with no cause is a bug, and both a CHECK constraint (A.4) and a
reconciliation query (R2 §8) look for one.

### 4.6 Invariants

- `LedgerEntry` rows are inserted and never updated or deleted. No exception, including corrections
  — a correction is an `ADJUSTMENT`
- No `LedgerEntry` may reference a `BillingPeriod` whose `status = CLOSED`
- `Σ ACCRUED` for any creator is never negative
- Every `ACCRUAL` entry has exactly one `Attribution`, and every `Attribution` on a `CONFIRMED`
  conversion has exactly one `ACCRUAL` entry, of equal amount
- `Invoice.commissionTotal = Σ amount` over `ACCRUAL` and `REVERSAL` entries for that
  `(brand, billingPeriod)` — negative reversals net down, which is what makes a brand credit fall
  out automatically (R2 §5.4)
- `Invoice.totalDue = commissionTotal + feeAmount + feeVatAmount`
- `Invoice.paidAt` is set if and only if `status = PAID`, and if and only if an `INBOUND`
  `PaymentOrder` referencing it has `status = PAID`
- An `INBOUND` payment order has a brand and an invoice and never a creator; an `OUTBOUND` one has a
  creator and never a brand or an invoice
- `PaymentOrder.amount > 0` in both directions. Direction carries the sign, not the amount
- A creator has at most one `OUTBOUND` payment order in a non-terminal state at any time
- `Σ ACCRUED` across all creators equals the commission portion of all `ISSUED` unpaid invoices
- `Σ AVAILABLE` across all creators never exceeds cash collected less cash paid out

### 4.7 Indexes and retention

```
UNIQUE  BillingPeriod (label)
UNIQUE  BillingPeriod (startsAt)
UNIQUE  Invoice (brandId, billingPeriodId)     one invoice per brand per period, and the
                                               idempotency guard on a re-run close job
UNIQUE  Invoice (number)
UNIQUE  LedgerEntry (attributionId) where kind = 'ACCRUAL'      one accrual per attribution
UNIQUE  PaymentOrder (creatorId) where direction = 'OUTBOUND'
                                   and status in ('DRAFT','SENT')
UNIQUE  PaymentOrder (invoiceId) where direction = 'INBOUND'
                                   and status = 'PAID'          one receipt per invoice

INDEX   LedgerEntry (creatorId, bucket)                         balances — R2 §7.1
INDEX   LedgerEntry (billingPeriodId, brandId, kind)            invoicing — R2 §6
INDEX   LedgerEntry (creatorId, billingPeriodId)                statements — R2 §7.1
INDEX   LedgerEntry (invoiceId)                                 what a payment released
INDEX   Invoice (status, dueAt)                                 the overdue query
INDEX   PaymentOrder (billingPeriodId, direction, status)       the admin queues
```

Nothing in this section is ever hard-deleted, aggregated or rolled up. `Click` is retained thirteen
months and aggregated thereafter (§4.5); the ledger, the invoices and the payment orders are
retained permanently, because they are the accounting record and a click is not.

---

## 5. Money lifecycle

### 5.1 Accrual

A brand confirms an order in the R1 orders queue (§7.1). In the same transaction that sets
`Conversion.status = CONFIRMED` and stamps `confirmedAt`, one `ACCRUAL` entry is written per
`Attribution` on that order, into the currently open period.

`PENDING → CANCELLED` writes nothing: there was never an accrual to reverse.

### 5.2 Invoicing

At period close (R2 §6) each brand with a non-zero entry total for the closed period is issued one
invoice.

```
commissionTotal = Σ amount over ACCRUAL and REVERSAL entries for (brand, period)
feeAmount       = round(commissionTotal × Brand.platformFeeRate, 0.01)
feeVatAmount    = platformVatRegistered ? round(feeAmount × 0.18, 0.01) : 0
totalDue        = commissionTotal + feeAmount + feeVatAmount
dueAt           = issuedAt + Brand.netTermsDays
```

`feeRate` is written onto the invoice as a snapshot. Changing a brand's rate later never moves an
issued invoice.

**Numbering is gapless.** `XU-YYYY-NNNNNN`, allocated from a single counter row taken under
`SELECT … FOR UPDATE` inside the same transaction that inserts the invoice. A Postgres sequence is
the obvious choice and the wrong one: sequences gap on rollback, and a tax authority asking why
invoice `XU-2026-000418` does not exist will not be satisfied by an explanation about non-
transactional counters. The close job runs twenty-four times a year, so lock contention is not a
consideration.

### 5.3 Release

An operator sees the brand's payment on a bank statement and records it: one `INBOUND`
`PaymentOrder`, created directly in `PAID`, carrying the bank reference and `recordedBy`. In the
same transaction the invoice moves to `PAID` and, for every `ACCRUAL` entry that invoice covered, a
`RELEASE` pair is written — `−ACCRUED` and `+AVAILABLE` for that creator.

The set of covered entries is exactly `(brand, billingPeriod)` from the invoice. This is what lets a
creator's view name the brand holding up their money, rather than showing an undifferentiated wait.

### 5.4 Cancellation

`CONFIRMED → CANCELLED` (§7.1 already permits it) writes a `REVERSAL` per attribution, negative,
into the **currently open** period. Which bucket it debits depends on where the money got to:

| State at cancellation | Entry | Result |
| --- | --- | --- |
| Invoice not yet paid | `−ACCRUED` | Nets down the brand's next invoice automatically |
| Invoice paid, creator not yet paid out | `−AVAILABLE` | Creator's payable balance drops; brand credited on its next invoice |
| Creator already paid out | `−AVAILABLE`, driving the bucket negative | **Open — R2 §10.3** |

The brand-side credit needs no separate document: because `commissionTotal` sums `ACCRUAL` *and*
`REVERSAL` for the period, a reversal simply reduces the next invoice. If it exceeds that invoice's
accruals, the invoice issues with a negative `totalDue` and is carried — the §7.1 rule ("carried
onto the next CSV as a negative line") with somewhere real to live. If the brand has no next
invoice, the credit strands and an operator resolves it by hand (risk 6).

### 5.5 Payout

At period close, for each creator whose `AVAILABLE` balance is at or above the configured minimum
(default 20 ₾), an `OUTBOUND` `PaymentOrder` is drafted for the full balance, snapshotting the
creator's bank details into `payeeSnapshot`. Below the minimum, the balance simply stays where it is
and rolls into the next period; nothing is written.

```
DRAFT ──admin releases──▶ SENT ──operator records receipt──▶ PAID
                            │
                            └──bank rejects──▶ FAILED
```

The `−AVAILABLE` entry is written on `DRAFT → SENT`, not on `PAID`. Debiting at release is what
makes it impossible to draft a second payout against money already committed to a transfer in
flight; the partial unique index in R2 §4.7 is the belt to that braces. `SENT → FAILED` writes a
`PAYOUT_REVERSAL` returning the money to `AVAILABLE`.

Drafting pays out of *previously collected* invoices only. The invoices issued by this same close
run have not been paid by anyone yet and contribute nothing to `AVAILABLE`.

---

## 6. The close job

The worker (§11, already a scheduler) gains one job, at 00:00 Asia/Tbilisi on the 1st and the 16th.

```
1  transaction: BillingPeriod.status = CLOSED, closedAt = now()
                insert the next period, status = OPEN
   ← every entry written after this commit lands in the new period. Steps 2 and 3
     read only the closed one, so a confirmation arriving mid-run cannot be
     half-counted

2  for each brand with entries in the closed period:
       issue one Invoice (R2 §5.2)

3  for each creator with AVAILABLE >= payoutMinimumGel:
       draft one OUTBOUND PaymentOrder (R2 §5.5)

4  AuditEvent for the close, for every invoice, and for every draft
```

**The job is idempotent.** Re-running it after a partial failure issues no duplicate invoice —
`UNIQUE (brandId, billingPeriodId)` refuses — and drafts no duplicate payout, which the partial
unique index on open outbound orders refuses. An admin can also run it by hand from the console,
which is the recovery path when the scheduler misses a window.

Step 1 being its own transaction, committed before steps 2 and 3, is deliberate. The alternative —
one transaction for the whole job — holds write locks across every invoice in the run, and a brand
confirming an order during that window blocks rather than simply landing in the next period.

---

## 7. Views

### 7.1 Creator — earnings

Four numbers — five while a payout is in flight — in total and broken down per brand. This is the
view the whole spec exists to serve.

```
Pending        412.60 ₾   awaiting Aromashop's confirmation
Accrued        847.22 ₾   confirmed — invoiced to Aromashop, due 8 Sep
Available      230.00 ₾   payable now, in your 16 Sep payout
In transit     180.00 ₾   sent to your bank on 16 Sep
Paid to date 3 110.44 ₾
```

| Figure | Source |
| --- | --- |
| Pending | `Σ Attribution.commissionAmount` where `Conversion.status = PENDING`. Not in the ledger |
| Accrued | `Σ LedgerEntry.amount where bucket = ACCRUED` |
| Available | `Σ LedgerEntry.amount where bucket = AVAILABLE` |
| In transit | `Σ PaymentOrder.amount where direction = OUTBOUND and status = SENT`. Shown only when non-zero |
| Paid to date | `Σ PaymentOrder.amount where direction = OUTBOUND and status = PAID` |

Four numbers rather than one because they answer four different questions, and because the gap
between accrued and available is the single most useful thing a creator can know: it names the brand
that has not paid.

**In transit exists because the ledger debits on `SENT`** (R2 §5.5). Between the transfer leaving
and the operator confirming it, that money is in neither `AVAILABLE` nor "paid to date", and a
creator watching their balance drop with nothing to show for it would be right to be alarmed. It is
the same window R2 §8's payout-agreement check covers.

The per-link counters in §7.2 are unchanged and remain the answer to "how much traffic did I
generate."

**Statement.** Per period, per creator: every ledger entry with its cause — order, brand, product,
attribution amount — and the invoice or payment order that moved it. "Why is this number what it is"
is answered by rows on a screen, not by trust in the arithmetic.

### 7.2 Brand — billing

Invoice history with status and due date; the current period's running commission total with the fee
it will attract, labelled an estimate because the period is still open; and per invoice, the
per-creator breakdown derived from that period's frozen entries.

### 7.3 Admin console

New in R2, and the reason §2's "there is no admin UI" no longer holds. Four screens:

- **Periods** — the open period, its running totals, and a manual close
- **Invoices** — issued and unpaid, sorted by age; record a payment, creating the `INBOUND` order
- **Payouts** — drafted orders to review and release; mark sent orders paid or failed
- **Adjustments** — write an `ADJUSTMENT` entry. Memo required, `createdBy` recorded, audit-logged

R1's brand and creator approvals stay on the seed script. This console exists because money moves
through it, not because approvals were inconvenient.

### 7.4 Exports

The §7.4 CSV survives as an export rather than a settlement mechanism, joined by two more: an
invoice CSV per brand per period, and a payout CSV per period for the operator to work a bank run
from.

---

## 8. Reconciliation

Seven checks, run nightly by the worker and available on demand in the admin console. Each is a
query that returns zero rows in a healthy system; any row is an alert.

| Check | Assertion |
| --- | --- |
| Accrual completeness | Every `Attribution` on a `CONFIRMED` conversion has exactly one `ACCRUAL` entry of equal amount, and no `ACCRUAL` exists without one |
| Release pairing | Every `RELEASE` nets to exactly zero per `(creator, invoice)`: the `−ACCRUED` row and the `+AVAILABLE` row are equal and opposite |
| Bucket conservation | Per creator: `Σ ACCRUED + Σ AVAILABLE` equals `Σ (ACCRUAL + REVERSAL + ADJUSTMENT + PAYOUT + PAYOUT_REVERSAL)` — which holds only if every `RELEASE` pairing does |
| Payout agreement | Per creator: `−Σ (PAYOUT + PAYOUT_REVERSAL)` equals `Σ PaymentOrder.amount` for `OUTBOUND` orders in `SENT` or `PAID`. The ledger and the payment orders must tell the same story |
| Trial balance | Platform-wide: `Σ ACCRUED` equals the commission portion of all `ISSUED` unpaid invoices |
| Solvency | `Σ AVAILABLE` never exceeds cash collected less cash paid out. XUAMO never owes more than it holds |
| Invoice and orphan integrity | Each invoice's `commissionTotal` still equals the sum of its period's entries and `totalDue` still equals its three components; no entry lacks a cause; no entry references a closed period |

Conservation is split into three checks rather than stated as one equation, because the single
equation people reach for — "buckets plus paid out equals earned" — is *false* here. A payout debits
`AVAILABLE` at `SENT` but is not "paid out" until the transfer is confirmed, so money in flight
belongs to neither side of it. Payout agreement is the check that covers that window, and it is
exactly where a mis-keyed bank entry shows up.

The solvency check is the one that matters. The other six detect a bookkeeping error; that one
detects the failure that ends the company.

---

## 9. Error handling

| Case | Behaviour |
| --- | --- |
| Order confirmed after its period closed | Accrual lands in the currently open period. Closed periods never re-populate |
| Order cancelled before accrual (`PENDING → CANCELLED`) | Nothing written |
| Order cancelled after accrual, invoice unpaid | `−ACCRUED`; nets down the brand's next invoice |
| Order cancelled after the brand paid | `−AVAILABLE`; brand credited on its next invoice |
| Order cancelled after the creator was paid | Open — R2 §10.3. Nothing may be built on this path until it is decided |
| Reversal exceeds the next invoice's accruals | Invoice issues with a negative `totalDue`, carried |
| Brand has no next invoice to absorb a credit | Stranded; resolved by hand (risk 6) |
| Brand pays part of an invoice | Not representable. The operator chases the remainder; nothing is recorded until it is whole |
| Brand pays two invoices with one transfer | One `INBOUND` order per invoice, sharing a reference |
| Brand overpays | Recorded as the invoice amount; the excess is an `ADJUSTMENT` with a memo |
| Creator balance below the payout minimum | No order drafted. The balance rolls to the next period |
| Creator has no bank details | The payout is drafted and blocked in `DRAFT`, flagged in the admin queue. The money stays `AVAILABLE` |
| Bank rejects a transfer | `SENT → FAILED`, `PAYOUT_REVERSAL` returns the money to `AVAILABLE`, redrafted next period |
| Creator's IBAN changes after a payout was sent | `payeeSnapshot` preserves what was actually paid to |
| Close job fails halfway | Re-runnable. Unique constraints refuse every duplicate |
| Close job misses its window | An admin runs it by hand; period boundaries are dates, not run times |
| Brand fee rate changed mid-period | The rate at issue applies to the whole period (risk 7) |
| Two admins record the same payment | The second fails: an invoice already `PAID` rejects a second `INBOUND` order |
| An amount was recorded wrong | Never edited. An `ADJUSTMENT` with a memo, and the original stays visible |
| Invoice issued in error | `VOID`, and a compensating `ADJUSTMENT` if any entry was released against it |

---

## 10. Open items

### 10.1 Licensing — blocking, legal

Does receiving brand money and paying it to creators make XUAMO a payment service provider under
Georgian law? This must be answered before a single lari is collected. It determines whether client
money must be segregated, whether the account structure needs to change, and whether R2 is shippable
at all in this shape. §13.6 deferred the question to R2; this is R2.

### 10.2 Creator tax treatment — blocking, tax

Two questions. Must XUAMO withhold on payouts to individuals, and at what rate? And is XUAMO's VAT
base the fee alone (agent) or the whole invoice (principal)? This spec assumes fee-only VAT and
gross payouts, and the ledger takes a `WITHHOLDING` kind without a migration if the answer differs —
but the assumption needs signing off by someone qualified, not by this document.

### 10.3 Post-payout clawback — open, product

An order cancelled after the creator has been paid drives `AVAILABLE` negative. Three candidate
policies, none chosen:

1. **Offset against future earnings.** The balance stays negative and absorbs into the creator's
   next earnings. XUAMO never asks for money back. If the creator never earns again it is written
   off, visibly
2. **Hold-back.** Commission becomes `AVAILABLE` only N days after release, so most returns surface
   first. This narrows the window rather than closing it, and delays every honest creator
3. **Absorb.** XUAMO eats it. Simplest, and an open-ended loss

All three are rules over the same ledger, so this blocks the cancellation-after-payout path and
nothing else in the build. What must be decided before implementing that path is narrow: **may
`Σ AVAILABLE` go negative for a creator?** Everything else follows from the answer.

### 10.4 Non-blocking

- The platform fee rate itself, and whether it is uniform across pilot brands
- Net terms: 7 days is assumed
- The payout minimum: 20 ₾ is assumed
- Who operates the close, and what happens when that person is on holiday
- Whether the §7.4 CSV is still wanted once statements exist

---

## 11. Testing strategy

The ledger is built test-first, for the same reason §10 gives for the calculator: it is where the
money is. The calculator decides the amount; the ledger decides whose it is and where it went, and
an error there is invisible in every dashboard until a bank transfer is wrong.

**Property tests:**

- Conservation. For a random sequence of confirmations, cancellations, invoice payments, payouts and
  failures, all three of R2 §8's conservation checks — release pairing, bucket conservation and
  payout agreement — hold after every single step, including at the moment a payout is `SENT` and
  not yet `PAID`
- `Σ ACCRUED` for a creator is never negative under any legal sequence
- No sequence of operations ever updates or deletes a `LedgerEntry` row
- Invoice totals: `totalDue` equals its three components exactly, for random rates and pools,
  including a rate of zero, a pool of zero, and a negative pool

**Ledger:**

- Accrual on confirm writes exactly one entry per attribution, of exactly that amount
- `PENDING → CANCELLED` writes nothing
- A confirmation arriving after its period closed lands in the open period, never the closed one
- Every entry kind is rejected against a `CLOSED` period
- Release moves exactly the entries the paying invoice covered and no others — proved with two
  brands accruing for the same creator in the same period, only one of which pays

**Invoicing:**

- Numbering is gapless across a rolled-back close job
- Fee and fee VAT rounding at 0.01, including a commission total that puts the fee on a half-tetri
- A reversal nets down the next invoice; a reversal exceeding it produces a negative `totalDue`
- A brand with no entries in a period is issued no invoice
- The close job is idempotent: run twice, one invoice and one payout draft

**Payouts:**

- A balance below the minimum drafts nothing and rolls
- The debit lands on `DRAFT → SENT`, not on `PAID` — asserted by reading `AVAILABLE` between the two
- A second draft is refused while one is open
- `FAILED` returns the exact amount to `AVAILABLE`, and the creator is redrafted next period
- `payeeSnapshot` survives a later change to the creator's IBAN

**Payment orders:**

- Every direction constraint in R2 §4.6 rejects the row it should
- An `INBOUND` order may only be `PAID` or `CANCELLED`, and must carry an invoice
- Recording a payment twice against one invoice fails

**Reconciliation:**

- Each of the seven R2 §8 checks returns zero rows against a healthy seeded fixture, and returns the
  offending row against a fixture deliberately corrupted for it

**End-to-end**, extending the §10 scenario: seeded brand → product → approved partnership → link →
simulated click → simulated postback → attribution → confirm → close → invoice → record payment →
release → close → payout draft → release → mark paid, asserting the ledger, both balances and the
trial balance at every step.

---

## 12. Deployment

No new services. The worker gains the close job and the nightly reconciliation run; both are
schedules, and nothing in a request path waits on either.

- XUAMO's VAT registration status and rate, the payout minimum, and the default net terms are
  environment configuration, not columns
- The close job holds no lock across the run (R2 §6) and must be safe to run against live traffic
- `pg_dump` already covers the new tables. Given that these are the accounting record, verify a
  restore before the first invoice is issued rather than after
- Every state transition in R2 §5 writes an `AuditEvent`, which R1 already has
- The database role used by the application should hold no `UPDATE` or `DELETE` grant on
  `ledger_entry` (A.7)

---

## Appendix A — PostgreSQL schema

Conventions as R1 Appendix A: `snake_case`, `id uuid primary key default gen_random_uuid()` and
`created_at timestamptz not null default now()` unless stated, money `numeric(12,2)`.

### A.1 Enums

```sql
CREATE TYPE period_status     AS ENUM ('OPEN','CLOSED');
CREATE TYPE ledger_bucket     AS ENUM ('ACCRUED','AVAILABLE');
CREATE TYPE ledger_kind       AS ENUM ('ACCRUAL','RELEASE','PAYOUT','PAYOUT_REVERSAL',
                                       'REVERSAL','ADJUSTMENT');
CREATE TYPE invoice_status    AS ENUM ('DRAFT','ISSUED','PAID','VOID');
CREATE TYPE payment_direction AS ENUM ('INBOUND','OUTBOUND');
CREATE TYPE payment_status    AS ENUM ('DRAFT','SENT','PAID','FAILED','CANCELLED');
```

### A.2 Altered tables

```sql
ALTER TABLE brand
  ADD COLUMN legal_name        text          NOT NULL DEFAULT '',
  ADD COLUMN tax_id            text          NOT NULL DEFAULT '',
  -- A fraction, as with product.commission_value. 0.15, never 15.
  ADD COLUMN platform_fee_rate numeric(9,4)  NOT NULL DEFAULT 0
    CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 1),
  ADD COLUMN net_terms_days    integer       NOT NULL DEFAULT 7
    CHECK (net_terms_days >= 0);

-- payout_bank / payout_iban / payout_name were collected and unused in R1 (§2).
-- They are read from here on. tax_id supports R2 §10.2 if withholding is required.
ALTER TABLE creator
  ADD COLUMN tax_id text;
```

### A.3 Periods and numbering

```sql
-- Half-open [starts_at, ends_at) in Asia/Tbilisi. Exactly one row is OPEN at any time.
-- That is enforced in the close transaction rather than by a partial unique index,
-- because the index would forbid the instant inside that transaction when the next
-- period has been inserted and the old one not yet marked CLOSED.
CREATE TABLE billing_period (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text          NOT NULL UNIQUE,          -- '2026-08-H2'
  starts_at  timestamptz   NOT NULL UNIQUE,
  ends_at    timestamptz   NOT NULL,
  status     period_status NOT NULL DEFAULT 'OPEN',
  closed_at  timestamptz,
  created_at timestamptz   NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CONSTRAINT closed_at_matches_status CHECK ((status = 'CLOSED') = (closed_at IS NOT NULL))
);

-- Gapless invoice numbering. A sequence is the obvious choice and the wrong one:
-- sequences gap on rollback, and the gap is not explicable to a tax authority
-- (R2 §5.2). Taken under SELECT … FOR UPDATE in the same transaction as the insert.
CREATE TABLE invoice_counter (
  year     integer PRIMARY KEY,
  next_seq integer NOT NULL DEFAULT 1 CHECK (next_seq >= 1)
);
```

### A.4 Invoices

```sql
-- Totals are stored, not derived: an invoice must still say what it said on the day
-- it was issued, even after a later cancellation moves the underlying figures.
-- fee_rate is a snapshot of brand.platform_fee_rate at issue.
-- commission_total may be negative — a carried credit (R2 §5.4).
CREATE TABLE invoice (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          uuid           NOT NULL REFERENCES brand(id)          ON DELETE RESTRICT,
  billing_period_id uuid           NOT NULL REFERENCES billing_period(id) ON DELETE RESTRICT,
  number            text           NOT NULL UNIQUE,          -- XU-2026-000418
  issued_at         timestamptz    NOT NULL,
  due_at            timestamptz    NOT NULL,
  commission_total  numeric(12,2)  NOT NULL,
  fee_rate          numeric(9,4)   NOT NULL CHECK (fee_rate >= 0 AND fee_rate <= 1),
  fee_amount        numeric(12,2)  NOT NULL,
  fee_vat_amount    numeric(12,2)  NOT NULL,
  total_due         numeric(12,2)  NOT NULL,
  status            invoice_status NOT NULL DEFAULT 'DRAFT',
  paid_at           timestamptz,
  created_at        timestamptz    NOT NULL DEFAULT now(),
  UNIQUE (brand_id, billing_period_id),   -- one per period; the close job's idempotency guard
  CHECK (due_at >= issued_at),
  CONSTRAINT totals_add_up CHECK (total_due = commission_total + fee_amount + fee_vat_amount),
  CONSTRAINT paid_at_matches_status CHECK ((status = 'PAID') = (paid_at IS NOT NULL))
);
CREATE INDEX invoice_overdue_idx ON invoice (status, due_at);
```

### A.5 Payment orders

```sql
-- One table, two directions, and constraints rather than goodwill keeping the unused
-- half of each row empty.
--
-- An INBOUND order is a RECEIPT: created at the moment an operator records that the
-- brand's money arrived, born PAID. "Expected" needs no representation here — it is
-- already exactly invoice.status = 'ISSUED'.
-- An OUTBOUND order is an INSTRUCTION, with the full DRAFT → SENT → PAID | FAILED
-- lifecycle, and it is the row that debits AVAILABLE on release to SENT.
--
-- amount is always positive. Direction carries the sign, not the number.
--
-- billing_period_id is the period OPEN when the row was created, on the same rule as
-- the ledger (R2 §4.3): the period a receipt was RECORDED in, not the period of the
-- invoice it settles. A payout drafted by the close job therefore belongs to the
-- period that has just opened, not the one that just closed.
CREATE TABLE payment_order (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction         payment_direction NOT NULL,
  billing_period_id uuid              NOT NULL REFERENCES billing_period(id) ON DELETE RESTRICT,
  brand_id          uuid              REFERENCES brand(id)    ON DELETE RESTRICT,
  creator_id        uuid              REFERENCES creator(id)  ON DELETE RESTRICT,
  invoice_id        uuid              REFERENCES invoice(id)  ON DELETE RESTRICT,
  amount            numeric(12,2)     NOT NULL CHECK (amount > 0),
  status            payment_status    NOT NULL DEFAULT 'DRAFT',
  method            text              NOT NULL DEFAULT 'BANK_TRANSFER',
  reference         text,
  -- The payee's bank details as they stood when the money was sent. A later change to
  -- creator.payout_iban must never rewrite what was actually paid to.
  payee_snapshot    jsonb             NOT NULL DEFAULT '{}',
  memo              text              NOT NULL DEFAULT '',
  recorded_by       uuid              REFERENCES app_user(id) ON DELETE SET NULL,
  sent_at           timestamptz,
  paid_at           timestamptz,
  failed_at         timestamptz,
  failure_reason    text,
  created_at        timestamptz       NOT NULL DEFAULT now(),

  CONSTRAINT inbound_has_a_brand    CHECK ((direction = 'INBOUND')  = (brand_id   IS NOT NULL)),
  CONSTRAINT outbound_has_a_creator CHECK ((direction = 'OUTBOUND') = (creator_id IS NOT NULL)),
  CONSTRAINT inbound_is_a_receipt   CHECK (
    direction = 'OUTBOUND'
    OR (status IN ('PAID','CANCELLED') AND invoice_id IS NOT NULL)
  ),
  CONSTRAINT outbound_has_no_invoice CHECK (direction = 'INBOUND' OR invoice_id IS NULL),
  CONSTRAINT paid_at_matches_status   CHECK ((status = 'PAID')   = (paid_at   IS NOT NULL)),
  CONSTRAINT failed_at_matches_status CHECK ((status = 'FAILED') = (failed_at IS NOT NULL)),
  CONSTRAINT outbound_sent_before_paid CHECK (
    direction = 'INBOUND' OR status IN ('DRAFT','CANCELLED') OR sent_at IS NOT NULL
  )
);
-- One open payout per creator. Belt to the braces of debiting AVAILABLE at SENT.
CREATE UNIQUE INDEX payment_order_one_open_payout_idx ON payment_order (creator_id)
  WHERE direction = 'OUTBOUND' AND status IN ('DRAFT','SENT');
-- One recorded receipt per invoice.
CREATE UNIQUE INDEX payment_order_one_receipt_idx ON payment_order (invoice_id)
  WHERE direction = 'INBOUND' AND status = 'PAID';
CREATE INDEX payment_order_queue_idx ON payment_order (billing_period_id, direction, status);
```

### A.6 The ledger

```sql
-- Append-only. Nothing here is ever UPDATEd or DELETEd; a correction is an ADJUSTMENT.
-- amount is signed: a debit is a negative row, never an edit to a positive one.
--
-- brand_id is denormalised. Invoicing groups entries by brand, and without the column
-- that is Attribution → ConversionItem → Conversion, three joins on the largest money
-- table (R2 §3.2). It is null on PAYOUT, PAYOUT_REVERSAL and ADJUSTMENT, which are not
-- brand-caused.
--
-- billing_period_id is always the period OPEN when the row was written — never one
-- derived from confirmed_at. This is what freezes a closed period (R2 §4.3).
CREATE TABLE ledger_entry (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        uuid          NOT NULL REFERENCES creator(id)        ON DELETE RESTRICT,
  billing_period_id uuid          NOT NULL REFERENCES billing_period(id) ON DELETE RESTRICT,
  bucket            ledger_bucket NOT NULL,
  amount            numeric(12,2) NOT NULL CHECK (amount <> 0),
  kind              ledger_kind   NOT NULL,
  brand_id          uuid          REFERENCES brand(id)         ON DELETE RESTRICT,
  attribution_id    uuid          REFERENCES attribution(id)   ON DELETE RESTRICT,
  invoice_id        uuid          REFERENCES invoice(id)       ON DELETE RESTRICT,
  payment_order_id  uuid          REFERENCES payment_order(id) ON DELETE RESTRICT,
  memo              text          NOT NULL DEFAULT '',
  created_by        uuid          REFERENCES app_user(id)      ON DELETE SET NULL,
  created_at        timestamptz   NOT NULL DEFAULT now(),

  -- Every entry names its cause. An entry with none is a bug (R2 §8).
  CONSTRAINT entry_has_a_cause CHECK (
    CASE kind
      WHEN 'ACCRUAL'         THEN attribution_id   IS NOT NULL AND brand_id IS NOT NULL
      WHEN 'REVERSAL'        THEN attribution_id   IS NOT NULL AND brand_id IS NOT NULL
      WHEN 'RELEASE'         THEN invoice_id       IS NOT NULL AND brand_id IS NOT NULL
      WHEN 'PAYOUT'          THEN payment_order_id IS NOT NULL
      WHEN 'PAYOUT_REVERSAL' THEN payment_order_id IS NOT NULL
      WHEN 'ADJUSTMENT'      THEN created_by       IS NOT NULL AND memo <> ''
    END
  ),
  -- Signs are not a matter of opinion. RELEASE writes one row of each sign and is
  -- therefore unconstrained here; its pairing is checked in R2 §8 instead.
  CONSTRAINT entry_sign CHECK (
    CASE kind
      WHEN 'ACCRUAL'         THEN amount > 0 AND bucket = 'ACCRUED'
      WHEN 'REVERSAL'        THEN amount < 0
      WHEN 'PAYOUT'          THEN amount < 0 AND bucket = 'AVAILABLE'
      WHEN 'PAYOUT_REVERSAL' THEN amount > 0 AND bucket = 'AVAILABLE'
      ELSE true
    END
  )
);
CREATE UNIQUE INDEX ledger_accrual_once_idx ON ledger_entry (attribution_id)
  WHERE kind = 'ACCRUAL';
CREATE INDEX ledger_balance_idx   ON ledger_entry (creator_id, bucket);
CREATE INDEX ledger_invoicing_idx ON ledger_entry (billing_period_id, brand_id, kind);
CREATE INDEX ledger_statement_idx ON ledger_entry (creator_id, billing_period_id);
CREATE INDEX ledger_invoice_idx   ON ledger_entry (invoice_id) WHERE invoice_id IS NOT NULL;
```

`ledger_entry` references `invoice` and `payment_order`, so it is created after both — hence the
ordering of A.4 through A.6. Prisma Migrate resolves this on its own; the generated migration is
diffed against this appendix before it is applied, as in §11.

### A.7 What the schema cannot enforce

As with R1 A.6, these need application code and, more importantly, tests — R2 §11 is where they
actually live.

| Invariant | Why not a constraint |
| --- | --- |
| `ledger_entry` is append-only | Needs a trigger, or a database role without `UPDATE`/`DELETE` grants (R2 §12) |
| No entry against a `CLOSED` period | Cross-table |
| `Σ ACCRUED` per creator is never negative | Cross-row aggregate |
| Every confirmed `Attribution` has an `ACCRUAL` of equal amount | Cross-table aggregate |
| `invoice.commission_total` equals its period's entry sum | Cross-table aggregate against a value frozen at issue |
| `invoice.paid_at` set iff an `INBOUND` order for it is `PAID` | Cross-table, written in one transaction instead |
| A `RELEASE` pair debits and credits the same creator and amount | Cross-row |
| Exactly one `billing_period` is `OPEN` | True between transactions, briefly false inside the close |
| Solvency: `Σ AVAILABLE` never exceeds cash held | Spans three tables and the real world |

The last one is the only entry on this list that ends the company, and it is a nightly check rather
than a constraint because no constraint can see a bank account.
