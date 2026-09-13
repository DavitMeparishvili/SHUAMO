# Simple Manual Finance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Work directly in the primary checkout; do not create a worktree. Do not start implementation merely because this planning document exists.

**Goal:** Let admin generate brand/creator invoices on demand, record externally managed transfers, show account balances and histories, and review platform-wide performance with statistics for every product and filtered CSV downloads.

**Architecture:** Add one `finance` module with immutable invoice snapshots and append-only payment/reversal records. Read existing canonical confirmed commissions for all-time obligations; subtract recorded payments to obtain balances. Reuse Better Auth, `AppUser.isAdmin`, the existing page shell, and existing design-system components. Add admin-scoped aggregate reporting in the conversions module, composed with finance summaries for the admin Performance page.

**Tech Stack:** Existing Next.js 16 App Router, React 19, TypeScript, Better Auth, Prisma 7/PostgreSQL, decimal.js, Zod, Vitest, and Playwright. Native HTML downloads and browser printing require no additional dependency.

**Approved design:** [Simple invoices and manual payment recording](../specs/2026-09-13-simple-manual-finance-design.md).

**Status:** Ready for implementation; all implementation checkboxes are intentionally unchecked.

---

## 1. Scope and precedence

This is the replacement implementation path for the approved simple release.
Do not execute the old phase 8 ledger, phase 9 period-close, phase 10 funded
release, or phase 11 reconciliation plans as prerequisites. Their invoice
approval, funds-availability, payout minimum, billing-period, and transfer-state
requirements do not apply here. Preserve the successful-sale and canonical
attribution behavior implemented on September 5.

Admin decides which external transfers to make and record. Permit partial
payments, prepayments, overpayments, payments without invoices, and creator
payouts before brand receipts. Do not check partnership approval, account approval,
available funds, invoice approval, transfer order, or the outstanding balance as a
condition of recording money. Keep normal authentication, ownership, type/range
validation, atomic writes, and submission idempotency.

The existing product calculates creator commission but has no platform fee model.
Use those commission amounts for both sides; introduce no fees, VAT calculation,
withholding, new rate, double-entry ledger, bank integration, scheduler, email
delivery, or server PDF renderer.

Invoices contain newly invoiced obligations and corrections. They do not create
another obligation. Payment association with an invoice is optional metadata;
there is no automatic allocation or invoice PAID status. Account balance is the
authoritative amount outstanding, including payments made before invoicing.

The approved extension adds `/{locale}/admin/performance` with Overview, Brands,
Creators, and Products tabs plus individual product performance. Admin can see
all products, including archived and zero-activity products. Reporting is
read-only and introduces no transfer allocation or extra financial restrictions.
Finance remains the admin login destination, with Performance alongside it.
Add a dedicated Products navigation entry at `/{locale}/admin/products`, using
the same product report as the Performance Products tab. Include CSV downloads
for overview, brands, creators, products, and one product's creator breakdown.

## 2. Existing code to reuse

| Existing path                                                             | Relevant behavior                                                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                    | `AppUser.isAdmin`, `Creator.payoutBank/payoutIban/payoutName`, exact `Attribution.commissionAmount`, `AuditEvent`; no invoice/payment models yet. |
| `src/modules/identity/infrastructure/auth.ts`                             | Better Auth and `currentViewer()`; viewer resolution rereads account capability.                                                                  |
| `src/modules/identity/application/resolve-viewer.ts`                      | Approved brand/creator viewers can also have `isAdmin: true`; a standalone admin has `kind: "admin"`.                                             |
| `src/modules/identity/http/require-viewer.ts`                             | Existing capability-guard pattern using `Result`.                                                                                                 |
| `src/modules/identity/ui/sign-in-form.tsx`                                | Supports a caller-supplied `returnTo`; reuse with a fixed admin destination.                                                                      |
| `app/[locale]/workspace/page.tsx`                                         | Standalone admins currently go to `coming-soon`; change only that destination.                                                                    |
| `src/modules/shell/ui/site-frame.tsx`                                     | Live navigation is built here; modifying `nav-model.ts` alone does not update the visible shell.                                                  |
| `src/modules/conversions/infrastructure/prisma-performance-repository.ts` | Existing reporting joins and canonical/confirmed commission semantics. Reports are filtered; do not use their totals as account balances.         |
| `app/[locale]/brand/page.tsx`, `app/[locale]/creator/page.tsx`            | Server-side home composition; load finance alongside existing report/catalog calls.                                                               |
| `src/modules/conversions/ui/insight-overview.tsx`                         | Active WorkspaceOverview export; add a finance composition slot here. The older workspace-overview.tsx is no longer the active home.              |
| `scripts/approve-account.ts`, `scripts/seed-phase-02.ts`                  | Existing account administration and Better Auth credential-seeding patterns.                                                                      |
| `src/test/fixtures/accounts.ts`                                           | `seedBrand`, `seedCreator`, and `seedLink` for integration tests.                                                                                 |
| `src/test/integration/setup.ts`                                           | Test-database guard and teardown already discover/truncate new tables.                                                                            |
| `scripts/verify-module-boundaries.mjs`                                    | Cross-module imports use public indexes; Prisma imports stay in infrastructure.                                                                   |

At planning time the primary checkout contains unrelated product-editor and
localization changes. Inspect `git status --short` before execution. Preserve
those edits and stage only the finance task's changes; never use `git add .`.

## 3. File map

Create these small units within `src/modules/finance/`:

```text
domain/finance.ts                         Shared party, money-summary, and document types
domain/finance-input.ts                   Exact payment amount/date validation
domain/balance.ts                         Net payments and outstanding arithmetic
domain/invoice-lines.ts                   Current amount minus previously invoiced amount
ports/finance-repository.ts               Persistence commands and view contracts
application/record-payment.ts             Admin-authorized payment entry
application/reverse-payment.ts            Admin-authorized record correction
application/preview-invoice.ts            Authorized preview using current source data
application/issue-invoice.ts              Admin-authorized snapshot issuance
application/read-finance.ts               Admin/account-owner read authorization
infrastructure/prisma-finance-source.ts   Existing commissions and document prefill
infrastructure/prisma-finance-reads.ts    Balances, lists, history, and owned invoices
infrastructure/prisma-payment-repository.ts Atomic payment/reversal/audit writes
infrastructure/prisma-invoice-repository.ts Atomic numbering/line snapshots/audit writes
infrastructure/finance-retry.ts           Bounded serializable transaction retries
infrastructure/finance-config.ts          Optional platform invoice defaults
http/invoice-download.ts                  Authenticated, private HTML download handler
ui/finance-copy.ts                        English/Georgian finance wording
ui/admin-finance.tsx                      Searchable account/transaction tables and tabs
ui/account-finance.tsx                    One account's balances and history
ui/payment-form.tsx                       Prefilled editable transfer form
ui/reversal-form.tsx                      Correction reason and submit state
ui/invoice-form.tsx                       Preview, party details, generate action
ui/invoice-document.tsx                   Onscreen/print invoice markup from saved data
ui/invoice-html.ts                        Escaped standalone HTML download document
ui/print-invoice-button.tsx               Browser print action
ui/finance-summary.tsx                    Compact home summary and recent records
index.ts                                 Public server/application/component exports
```

Colocate meaningful domain/application tests as `.test.ts`; repository tests as
`.integration.test.ts`; form tests as `.test.tsx` with jsdom. Add the specific
test paths named in each task rather than one test mirroring every file.

Create the integration points:

```text
src/infrastructure/finance-services.ts
app/[locale]/admin/login/page.tsx
app/[locale]/admin/(protected)/layout.tsx
app/[locale]/admin/(protected)/finance/page.tsx
app/[locale]/admin/(protected)/finance/[kind]/[id]/page.tsx
app/[locale]/admin/(protected)/finance/actions.ts
app/[locale]/brand/finance/page.tsx
app/[locale]/creator/finance/page.tsx
app/[locale]/finance/invoices/[id]/page.tsx
app/api/finance/invoices/[id]/download/route.ts
app/finance.css
scripts/grant-admin.ts
scripts/seed-finance.ts
src/test/fixtures/finance.ts
src/test/e2e/finance.spec.ts
src/test/e2e/admin-performance.spec.ts
docs/manual-finance.md
```

Add the performance extension through these focused files:

```text
src/modules/conversions/ports/admin-performance.ts
src/modules/conversions/application/admin-performance-query.ts
src/modules/conversions/application/read-admin-performance.ts
src/modules/conversions/infrastructure/prisma-admin-performance.ts
src/modules/finance/ports/admin-performance-finance.ts
src/modules/finance/infrastructure/prisma-admin-performance-finance.ts
src/modules/finance/ui/admin-performance.tsx
src/modules/finance/ui/admin-product-performance.tsx
src/modules/finance/ui/admin-performance-filters.tsx
src/modules/finance/ui/admin-performance-trend.tsx
src/modules/finance/application/admin-performance-csv.ts
src/modules/finance/http/admin-performance-export.ts
src/infrastructure/admin-performance-services.ts
app/[locale]/admin/(protected)/performance/page.tsx
app/[locale]/admin/(protected)/products/page.tsx
app/[locale]/admin/(protected)/products/[id]/page.tsx
app/api/admin/performance/export/route.ts
```

The `(protected)` route group must not wrap `/admin/login`, avoiding an
authentication redirect loop. All paths are localized except API routes; validate
`ka`/`en`, party kind, UUIDs, and query parameters at the boundary.

## 4. Data and operation contracts

### 4.1 Balances

```ts
export type FinanceParty =
  { kind: "brand"; id: string } | { kind: "creator"; id: string };

export interface FinanceBalance {
  earned: string;
  payments: string;
  outstanding: string;
}

export interface DocumentParty {
  name: string;
  identification: string;
  address: string;
  bank: string;
  iban: string;
}

export interface InvoiceCandidate {
  attributionId: string;
  orderId: string;
  description: string;
  occurredOn: string;
  currentAmount: string;
  invoicedAmount: string;
}

export interface InvoiceLineSnapshot {
  attributionId: string;
  orderId: string;
  description: string;
  occurredOn: string;
  amount: string;
}
```

Current eligible earnings use `Attribution.status = CANONICAL`,
`Conversion.status = CONFIRMED`, and the same real click/link relationship used
by existing reporting. Scope brands by `Conversion.brandId` and creators by
`Attribution.creatorId`. Preserve the reporting ownership consistency checks
between conversion, click, link, and product. Do not filter by current product,
tracking-link, account, or partnership status. Do not sum performance pages,
limit to recent dates, or multiply commission by order item count.

Use a direct commission aggregate and independent payment aggregate, then
combine them. Joining attributions to many payment rows before summing would
multiply both amounts.

### 4.2 Tables

Use these four new Prisma models and named PostgreSQL tables. Existing `Brand`,
`Creator`, `AppUser`, and `Attribution` gain inverse relation fields.

| Model/table                                         | Fields and constraints                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FinancePayment` / `finance_payment`                | UUID `id`; unique UUID `requestKey`; `requestHash` char(64); `kind` PAYMENT/REVERSAL; exactly one nullable UUID `brandId` or `creatorId` FK; `amount` Decimal(12,2), positive; `transferredOn` date; optional `bankReference` varchar(160), `note` varchar(1000); `partySnapshot` JSON; nullable `invoiceId` FK; nullable unique self-FK `reversesId`; `recordedById` AppUser FK; `recordedAt` timestamptz. |
| `FinanceInvoice` / `finance_invoice`                | UUID `id`; unique UUID `requestKey`; `requestHash` char(64); `previewHash` char(64); unique `number`; exactly one `brandId` or `creatorId` FK; `payerSnapshot` JSON; `payeeSnapshot` JSON; signed `total` Decimal(18,2); `currency` fixed GEL; `issuedById` AppUser FK; `issuedAt` timestamptz.                                                                                                             |
| `FinanceInvoiceLine` / `finance_invoice_line`       | UUID `id`; `invoiceId` FK; `attributionId` FK; signed nonzero `amount` Decimal(12,2); `snapshot` JSON holding order ID, description, and occurrence date; unique `(invoiceId, attributionId)`.                                                                                                                                                                                                              |
| `FinanceInvoiceCounter` / `finance_invoice_counter` | `kind` BRAND/CREATOR, `year` integer, `lastValue` integer; composite primary key `(kind, year)`.                                                                                                                                                                                                                                                                                                            |

Use `onDelete: Restrict` for financial record relations, including actors and
attributions. Do not cascade-delete financial history when an account is deleted.
Add party/date indexes for payment lists, party/issue-date indexes for invoice
lists, an `attributionId` index for invoicing history, and `invoiceId` indexes
for associated payments and lines. Use the existing snake_case mapping style.

Require a reversal row to have `reversesId` and a nonblank note; ordinary payments
must not have `reversesId`. A reversal copies the original party, amount,
transfer date, bank reference, invoice association, and party snapshot. Check
this under the original payment's row lock. Never accept those copied values
from a reversal form. Do not reverse a reversal.

### 4.3 Command interfaces

Define these application input types in `ports/finance-repository.ts`. Money and
dates are serialized strings at boundaries; Prisma objects do not leave the
infrastructure layer.

```ts
export interface RecordPaymentInput {
  requestKey: string;
  party: FinanceParty;
  amount: string;
  transferredOn: string;
  bankReference: string;
  note: string;
  invoiceId?: string;
}

export interface ReversePaymentInput {
  requestKey: string;
  paymentId: string;
  reason: string;
}

export interface IssueInvoiceInput {
  requestKey: string;
  party: FinanceParty;
  previewHash: string;
  payer: DocumentParty;
  payee: DocumentParty;
}

export interface InvoicePreview {
  party: FinanceParty;
  previewHash: string;
  payer: DocumentParty;
  payee: DocumentParty;
  lines: InvoiceLineSnapshot[];
  total: string;
  balance: FinanceBalance;
}

export type FinanceError =
  | "unauthenticated"
  | "wrong_capability"
  | "not_found"
  | "invalid_input"
  | "invoice_party_mismatch"
  | "request_conflict"
  | "nothing_to_invoice"
  | "preview_changed"
  | "invalid_reversal"
  | "retry_later";

export interface FinanceCommands {
  recordPayment(actorId: string, input: RecordPaymentInput): Promise<string>;
  reversePayment(actorId: string, input: ReversePaymentInput): Promise<string>;
  issueInvoice(actorId: string, input: IssueInvoiceInput): Promise<string>;
}
```

Application factories take the repository as a dependency and return functions
with `(viewer: Viewer, input)` parameters. Guard admin capability before executing
commands. Return the existing `Result<{ id: string }, FinanceError>` pattern.
Represent expected repository errors with a typed `FinanceOperationError`
carrying `FinanceError`; map only that class into `Result`. Unexpected database
errors remain server errors and are logged without exposing bank details.

Read methods are `listAccounts(kind, { query, page })`,
`listTransactions({ party?, query, page })`, `getAccount(party, { page })`,
`getSummary(party)`, `previewInvoice(party)`, and `getInvoice(id)`.
`listAccounts` returns `{ items, page, pageSize, total }` with party, name,
and `FinanceBalance` per item. History uses the same pagination envelope with
payment or invoice view rows. Pages contain 25 rows; summaries contain five
payments and five invoices. Return ISO date strings and exact decimal strings.
`getAccount` returns party/name/balance plus both paginated histories;
`getSummary` returns party/name/balance plus recent payments/invoices.
`getInvoice` returns the stored party IDs, document snapshots, line snapshots,
number, total, currency, issuedAt, and issuing admin display name.

Read view rows include the persisted public fields above plus a `reversed` flag
on original payment rows and the recording admin's display name. Do not return
credential/session data, internal audit changes, or other parties' bank details.
Ordinary-owner read functions resolve `FinanceParty` from `Viewer`; they never
trust a requested owner ID. Invoice authorization checks the stored owner before
rendering or downloading, and unauthorized owners receive the same 404 as an
unknown invoice.

### 4.4 Invoice source and concurrency

For one party, load the union of eligible attributions and attributions previously
invoiced to that party. For each attribution, `currentAmount` is its eligible
commission or zero; `invoicedAmount` is the sum of its saved signed invoice lines
for that party. The next line is their difference. Skip zero differences.

An attribution's brand and creator invoicing histories are separate. Issuing a
brand document must not affect the creator preview. Payments never enter this
line calculation. If an attribution ceases to be eligible after invoicing,
its next difference is a negative correction. Repeating the preview after that
correction yields zero, so it cannot be credited twice.

Preview hash = SHA-256 of a deterministic JSON encoding of the party and source
candidates sorted by attribution ID, including current amount, already invoiced
amount, order/description/date snapshots. Normalize decimal strings to two places.
Exclude current payment balance and editable document details from this hash;
recording a payment does not invalidate an earnings preview. Issuance uses the
submitted document details after validation, and recomputes candidates/hash in
its database transaction. If the hash changed, return `preview_changed` and
refresh the preview before another explicit generate action.

Run issuance at Serializable isolation. Lock the selected existing brand/creator
row, recheck the idempotency key, compute candidates, upsert/increment that
party-kind/year counter, and insert invoice, lines, and audit event in one
transaction. Format numbers `XU-B-2026-000001` / `XU-C-2026-000001`, using the
issue year in `Asia/Tbilisi`. Keep counter updates inside the transaction.
Concurrent generation from the same preview produces one document and one
stale-preview response, or the same document if the request key is identical.

Retry Prisma serialization/deadlock error `P2034` at most three total attempts.
After exhaustion return `retry_later` with no partial write. On unique
idempotency-key conflicts (`P2002` for that key), read the committed row and
compare the request hash. Do not treat arbitrary unique violations as retries.
Canonical request hashes include operation, authenticated actor, and normalized
submitted fields. Same key/same content returns the saved ID; same key/different
content returns `request_conflict`.

### 4.5 Admin performance contracts

Create a separate admin report contract instead of adding an optional owner ID
or an "all accounts" escape hatch to existing brand/creator report functions.
Keep their authorization and report behavior unchanged. Define the following
in `src/modules/conversions/ports/admin-performance.ts` and export through that
module's public index:

```ts
export interface AdminPerformanceQuery {
  tab: "overview" | "brands" | "creators" | "products";
  from: string;
  to: string;
  brandId?: string;
  creatorId?: string;
  productStatus: "ALL" | "ACTIVE" | "ARCHIVED";
  q: string;
  sort: "sales_count" | "sales_value" | "clicks" | "commission" | "name";
  direction: "asc" | "desc";
  page: number;
}

export interface AdminPerformanceMetrics {
  clicks: number;
  salesCount: number;
  salesValue: string;
  commission: string;
}

export interface AdminPerformanceRow extends AdminPerformanceMetrics {
  id: string;
  name: string;
  kind: "brand" | "creator" | "product";
  brandId?: string;
  brandName?: string;
  sku?: string;
  status?: "ACTIVE" | "ARCHIVED";
}

export interface AdminPerformanceReport {
  query: AdminPerformanceQuery;
  totals: AdminPerformanceMetrics;
  trend: Array<{
    from: string;
    to: string;
    salesValue: string;
    commission: string;
  }>;
  rows: {
    items: AdminPerformanceRow[];
    page: number;
    pageSize: 25;
    total: number;
  };
}

export interface AdminProductPerformanceReport extends AdminPerformanceReport {
  product: {
    id: string;
    title: string;
    sku: string;
    brandId: string;
    brandName: string;
    status: "ACTIVE" | "ARCHIVED";
  };
}
```

On product detail, `rows.items` contains creators linked to that product. Add
repository methods `report(query)` and `productReport(productId, query)` returning
these contracts; an unknown product returns `undefined`. Application readers
take `(viewer, query)` or `(viewer, productId, query)` and call `requireAdmin`
before the repository. Anonymous/regular users never reach an unrestricted
report query. UUID scope filters narrow admin results but do not grant access.

Query parser `parseAdminPerformanceQuery(searchParams, now)` defaults to this
month to date in `Asia/Tbilisi`, tab overview, status ALL, empty search, sort
sales_value descending, page 1. Custom dates must be real, inclusive calendar
dates in ascending order. Invalid dates/UUIDs/sorts return `invalid_input`,
rather than silently broadening a requested account filter. Page is a positive
safe integer; search is trimmed to 120 characters. Product status/search apply
only on the Products tab; brand/creator and dates apply to commercial metrics
on all tabs. Changing a filter resets page to 1. SQL order columns come from a
fixed allowlist, never a raw query string.

Use the existing click/attribution reporting definitions with independent
aggregates. Creditably tracked clicks use click occurrence time. Confirmed
canonical sales and commission use conversion occurrence time. Count distinct
conversion IDs, and sum commission once per attribution. Sales value sums the
commissionable net of the attributed product's matching SKU items once per
canonical attribution, following the current single-link model. Aggregate those
items before any click/link joins. Never multiply sales by link count or use
current product prices. Product sums reconcile with filtered overview sums.

Convert the inclusive date range to a half-open Tbilisi timestamp interval for
clicks/sales. Group daily for ranges up to 93 days and monthly for longer ranges;
zero-fill missing buckets and include the entire requested range. The existing
`performanceTrendStart` caps history at 90 days, so do not reuse it to truncate
this report silently. Return exact money strings and deterministic name/ID tie
breakers for pagination.

Product queries start from `Product`, then left join separately aggregated click
and sale metrics. Default to all statuses and show zero rows. With creatorId,
require a tracking link for that creator but retain zero activity and disabled
links. Product detail ignores the list's name/status filter when resolving the
requested product, so an archived or renamed product is still readable; retain
those filters only for the back link. Brand/creator date filters still constrain
its displayed metrics. Do not require a current approved partnership to read
historical results. Apply the same zero-activity principle to brand/creator lists.

Define the finance companion view in
`src/modules/finance/ports/admin-performance-finance.ts`:

```ts
export interface AdminPerformanceFinance {
  period: {
    from: string;
    to: string;
    brandReceipts: string;
    creatorPayouts: string;
  };
  current: {
    brandOutstanding: string;
    brandCredits: string;
    creatorUnpaid: string;
    creatorOverpayments: string;
  };
  brands: Array<{ id: string; periodReceipts: string; outstanding: string }>;
  creators: Array<{ id: string; periodPayouts: string; unpaid: string }>;
}
```

`readAdminPerformanceFinance(viewer, { from, to, brandIds, creatorIds })` checks
admin capability and returns platform-wide period cash and current balances,
plus account-wide finance fields for the requested table rows. Platform cash
uses `transferredOn` with PAYMENT minus REVERSAL; reversal retains the original
transfer date. It ignores commercial filters and is labeled **Platform payments
for selected dates**. Current balances ignore all report filters and sum each
account's positive outstanding separately from credit/overpayment magnitude.
Never let a credit at one brand reduce another brand's outstanding amount.

Brand/creator row payments honor the date range and row owner, but do not infer
product or opposite-party allocations. Label them **Account payments (period)**
and **Account balance (all time)**. The product table/detail contains no paid,
unpaid, available, or outstanding metric. This deliberately avoids implying that
an account-level transfer has been allocated to a product or partnership.

### 4.6 CSV export contract

`GET /api/admin/performance/export` takes the same validated report query plus
`scope=overview|brands|creators|products|product_creators`. The last scope requires
a valid existing `productId`. `scope` sets the report tab; `page` is ignored.
Use `scope=products&brandId=...` for a brand's product results. Generate export
links with `URLSearchParams` from the normalized report state, not hand-built
query fragments. The frontend labels all actions **Download CSV**.

Authorize the session with `requireAdmin` before any query. Return 401 for
anonymous, 403 for a regular account, 400 for invalid input, 404 for unknown
product detail, and 422 `export_too_large` with `total`/`limit` when more than
10,000 rows match. Match/sort the same aggregate rows as the onscreen table;
do not stitch together paginated UI calls or export raw clicks as product rows.
Fetch at most 10,001 aggregate rows to detect overflow; return no partial CSV.
An empty result produces a header-only file. Success is UTF-8 BOM CSV with CRLF
rows, content-disposition attachment, `private, no-store`, and `nosniff` headers.

Use these stable English columns in both locales; preserve Georgian field values:

| Scope            | Columns                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| products         | From, To, Product ID, Product, SKU, Status, Brand ID, Brand, Clicks, Attributed sales, Sales value (GEL), Creator commission (GEL)                                                                                                                                                                                                                                                       |
| brands           | From, To, Brand ID, Brand, Clicks, Attributed sales, Sales value (GEL), Creator commission (GEL), Account payments received in period (GEL), Account outstanding all time (GEL)                                                                                                                                                                                                          |
| creators         | From, To, Creator ID, Creator, Clicks, Attributed sales, Sales value (GEL), Commission earned (GEL), Account payouts in period (GEL), Account unpaid all time (GEL)                                                                                                                                                                                                                      |
| product_creators | From, To, Product ID, Product, Brand ID, Brand, Creator ID, Creator, Clicks, Attributed sales, Sales value (GEL), Creator commission (GEL)                                                                                                                                                                                                                                               |
| overview         | From, To, Brand filter ID, Creator filter ID, Filtered clicks, Filtered attributed sales, Filtered sales value (GEL), Filtered commission (GEL), Platform receipts in period (GEL), Platform payouts in period (GEL), Current platform brand outstanding (GEL), Current platform brand credits (GEL), Current platform creator unpaid (GEL), Current platform creator overpayments (GEL) |

All amount cells come from trusted normalized decimals with two places, and
count cells from validated integers. Quote every cell and double embedded quotes.
For user-provided text, prefix an apostrophe if its first non-whitespace character
is `=`, `+`, `-`, or `@`, or if it starts with a tab/CR/LF. Keep negative numeric
balances as numeric decimal cells; do not convert them to protected text. Reuse
the existing performance CSV's encoding/limit conventions, but do not modify the
existing owner-scoped export or assume its private helper is publicly exported.
Include no bank account data or internal audit/transaction notes.

## 5. Implementation tasks

### Task 1: Add the admin capability guard and provisioning path

**Files:**

- Modify: `src/modules/identity/http/require-viewer.ts`
- Modify: `src/modules/identity/http/require-viewer.test.ts`
- Modify: `src/modules/identity/index.ts`
- Create: `scripts/grant-admin.ts`

- [ ] **Step 1: Add capability cases to the existing guard tests.**

```ts
it("allows an admin capability on a creator account", () => {
  expect(
    requireAdmin({
      kind: "creator",
      userId: "u1",
      creatorId: "c1",
      displayName: "Nino",
      isAdmin: true,
    }),
  ).toEqual({ ok: true, value: { userId: "u1" } });
});

it("rejects a regular creator", () => {
  expect(
    requireAdmin({
      kind: "creator",
      userId: "u1",
      creatorId: "c1",
      displayName: "Nino",
      isAdmin: false,
    }),
  ).toEqual({ ok: false, error: "wrong_capability" });
});
```

Also cover anonymous, standalone admin, admin brand, and regular brand viewers.
Run `pnpm test:unit src/modules/identity/http/require-viewer.test.ts`; expect the
new cases to fail before implementation.

- [ ] **Step 2: Add and export the capability guard.**

```ts
export function requireAdmin(
  viewer: Viewer,
): Result<{ userId: string }, ViewerRejection> {
  if (viewer.kind === "anonymous") return err("unauthenticated");
  if (viewer.kind === "admin" || viewer.isAdmin) {
    return ok({ userId: viewer.userId });
  }
  return err("wrong_capability");
}
```

Do not change `resolveViewer` priority: dual-role users retain their usual
brand/creator workspace and gain an additional admin destination.

- [ ] **Step 3: Add the explicit operator provisioning script.**

```ts
import "dotenv/config";

Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? "development" });
const { prisma } = await import("@/src/infrastructure/db/client");
const [email] = process.argv.slice(2);
if (!email)
  throw new Error("Usage: pnpm exec tsx scripts/grant-admin.ts <email>");
try {
  const account = await prisma.appUser.findUnique({ where: { email } });
  if (!account) throw new Error("Create the authentication account first.");
  if (!account.isAdmin) {
    await prisma.$transaction(async (tx) => {
      await tx.appUser.update({
        where: { id: account.id },
        data: { isAdmin: true },
      });
      await tx.auditEvent.create({
        data: {
          action: "identity.admin_granted",
          entityType: "app_user",
          entityId: account.id,
          changes: { source: "grant-admin-script" },
        },
      });
    });
  }
  console.log("Admin access is enabled for the requested account.");
} finally {
  await prisma.$disconnect();
}
```

Use an existing normal authentication account or register one through the existing
sign-up endpoint before granting. A brand/creator profile is not required for a
standalone administrator. Do not expose a web form to self-grant access.

- [ ] **Step 4: Run the guard tests and `pnpm verify:boundaries`.** Expect passing tests and clean boundaries. Stage only these files and commit `feat: add admin finance capability guard`.

### Task 2: Add finance persistence and integrity constraints

**Files:**

- Modify: `prisma/schema.prisma`
- Create: the CLI-generated `simple_manual_finance` migration's `migration.sql` under `prisma/migrations/`
- Create: `src/modules/finance/infrastructure/schema.integration.test.ts`
- Create: `src/test/fixtures/finance.ts`

- [ ] **Step 1: Define the four models and inverse relations from section 4.2.** Use Prisma enums `FinancePaymentKind { PAYMENT REVERSAL }` and `FinanceInvoicePartyKind { BRAND CREATOR }`. Use named self-relations for payment reversals and named actor relations on `AppUser` to avoid ambiguity.
- [ ] **Step 2: Generate a forward-only migration for review.**

```powershell
pnpm exec prisma migrate dev --name simple_manual_finance --create-only
```

Add these constraints to the generated SQL using the actual mapped names:

```sql
ALTER TABLE finance_payment
  ADD CONSTRAINT finance_payment_one_party
    CHECK ((brand_id IS NOT NULL)::int + (creator_id IS NOT NULL)::int = 1),
  ADD CONSTRAINT finance_payment_positive CHECK (amount > 0),
  ADD CONSTRAINT finance_payment_reversal_shape CHECK (
    (kind = 'PAYMENT' AND reverses_id IS NULL) OR
    (kind = 'REVERSAL' AND reverses_id IS NOT NULL
      AND note IS NOT NULL AND length(btrim(note)) > 0)
  ),
  ADD CONSTRAINT finance_payment_not_self_reversal CHECK (reverses_id <> id);

ALTER TABLE finance_invoice
  ADD CONSTRAINT finance_invoice_one_party
    CHECK ((brand_id IS NOT NULL)::int + (creator_id IS NOT NULL)::int = 1),
  ADD CONSTRAINT finance_invoice_currency CHECK (currency = 'GEL');

ALTER TABLE finance_invoice_line
  ADD CONSTRAINT finance_invoice_line_nonzero CHECK (amount <> 0);
```

Use the timestamped directory generated by the command above. No destructive
reset or data reseed is needed for this migration; existing commissions become
queryable finance sources directly.

- [ ] **Step 3: Add a `financeFixture()` helper using `seedLink()` and the existing Prisma client.** Create a confirmed conversion, one matching click/item/canonical attribution with commission `300.00`, and a standalone `AppUser.isAdmin = true` auth user. Return `{ brand, creator, admin, attribution, conversion }`. Reuse this fixture throughout repository tests. Creating an auth `User` triggers the existing atomic `AppUser` insert; update that row rather than inserting a duplicate.
- [ ] **Step 4: Add constraint tests using real inserts.**

```ts
it("rejects a payment without an owner", async () => {
  const { admin } = await financeFixture();
  await expect(
    prisma.financePayment.create({
      data: {
        requestKey: crypto.randomUUID(),
        requestHash: "a".repeat(64),
        kind: "PAYMENT",
        amount: "10.00",
        transferredOn: new Date("2026-09-13"),
        partySnapshot: {},
        recordedById: admin.id,
      },
    }),
  ).rejects.toThrow();
});
```

Cover two owners, zero/negative payment, duplicate request key, duplicate reversal
target, missing reversal reason, orphan FK, signed invoice correction, and
attempted account deletion with financial history. Signed invoice totals must
remain permitted.

- [ ] **Step 5: Apply to the development/test databases and generate the client.**

```powershell
pnpm db:migrate:deploy
pnpm db:migrate:test
pnpm db:generate
pnpm test:integration src/modules/finance/infrastructure/schema.integration.test.ts
```

Expect successful forward migration and passing constraints. Commit only schema,
the new migration, and fixture/tests: `feat: persist manual finance records`.

### Task 3: Implement exact amounts, dates, balances, and invoice differences

**Files:**

- Create: `src/modules/finance/domain/finance.ts`
- Create: `src/modules/finance/domain/finance-input.ts`
- Create: `src/modules/finance/domain/balance.ts`
- Create: `src/modules/finance/domain/invoice-lines.ts`
- Create: `src/modules/finance/domain/finance.test.ts`
- Create: `src/modules/finance/ports/finance-repository.ts`

- [ ] **Step 1: Add arithmetic and unrestricted-recording test cases.**

```ts
it("keeps an overpayment as a negative outstanding balance", () => {
  expect(financeBalance("300.00", "400.00", "0.00")).toEqual({
    earned: "300.00",
    payments: "400.00",
    outstanding: "-100.00",
  });
});
it("a reversal restores the unpaid amount", () => {
  expect(financeBalance("300.00", "200.00", "200.00").outstanding).toBe(
    "300.00",
  );
});
it("records a cancellation as the next document's negative difference", () => {
  expect(
    invoiceLines([
      {
        attributionId: "a1",
        orderId: "ORDER-1",
        description: "Commission",
        occurredOn: "2026-09-13",
        currentAmount: "0.00",
        invoicedAmount: "300.00",
      },
    ])[0]?.amount,
  ).toBe("-300.00");
});
```

Also test `0.10 + 0.20`, repeat invoicing producing no lines, cancellation after
correction producing no lines, and mixed positive/negative lines with zero total.
Run `pnpm test:unit src/modules/finance/domain/finance.test.ts`; expect failure
before adding the functions.

- [ ] **Step 2: Implement the pure decimal functions.**

```ts
import Decimal from "decimal.js";
import type { FinanceBalance } from "./finance";

export function financeBalance(
  earned: string,
  paid: string,
  reversed: string,
): FinanceBalance {
  const payments = new Decimal(paid).minus(reversed);
  return {
    earned: new Decimal(earned).toFixed(2),
    payments: payments.toFixed(2),
    outstanding: new Decimal(earned).minus(payments).toFixed(2),
  };
}
```

```ts
import Decimal from "decimal.js";
import type { InvoiceCandidate, InvoiceLineSnapshot } from "./finance";

export function invoiceLines(
  candidates: InvoiceCandidate[],
): InvoiceLineSnapshot[] {
  return candidates.flatMap((candidate) => {
    const amount = new Decimal(candidate.currentAmount).minus(
      candidate.invoicedAmount,
    );
    if (amount.isZero()) return [];
    return [
      {
        attributionId: candidate.attributionId,
        orderId: candidate.orderId,
        description: candidate.description,
        occurredOn: candidate.occurredOn,
        amount: amount.toFixed(2),
      },
    ];
  });
}
```

- [ ] **Step 3: Validate payment input without policy restrictions.**

```ts
import Decimal from "decimal.js";

export function paymentAmount(value: string): string {
  const text = value.trim();
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(text))
    throw new RangeError("invalid_input");
  const amount = new Decimal(text);
  if (amount.lte(0) || amount.gt("9999999999.99"))
    throw new RangeError("invalid_input");
  return amount.toFixed(2);
}

export function transferDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError("invalid_input");
  if (value.startsWith("0000-")) throw new RangeError("invalid_input");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new RangeError("invalid_input");
  }
  return value;
}
```

Reject hexadecimal, exponents, Infinity, numeric JSON amounts, excessive decimal
places, invalid calendar dates, and amounts outside the database representation.
Do not restrict an otherwise valid date to today/past or limit amounts against
the balance. Add Zod input schemas in the application boundary for UUIDs, party
kind, field lengths, and document strings. Names are required on generated
documents; identification/address/bank/IBAN are optional strings. This is document
formatting, not a bank-account verification rule.

- [ ] **Step 4: Define the section 4 types/repository interfaces and run the domain tests plus `pnpm verify:boundaries`.** Expect exact string results and no infrastructure imports in domain code. Commit `feat: define manual finance calculations`.

### Task 4: Read finance sources and account balances

**Files:**

- Create: `src/modules/finance/infrastructure/prisma-finance-source.ts`
- Create: `src/modules/finance/infrastructure/prisma-finance-reads.ts`
- Create: `src/modules/finance/infrastructure/finance-config.ts`
- Create: `src/modules/finance/infrastructure/reads.integration.test.ts`
- Create: `src/modules/finance/application/read-finance.ts`
- Create: `src/modules/finance/application/read-finance.test.ts`
- Create: `src/modules/finance/index.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add integration cases against the real source data.** Assert fixture earnings `300.00`, cancellation earnings `0.00`, canonical-only inclusion, brand/creator ownership, and totals independent of current product/partnership status. Insert multiple payment rows and verify commission is not multiplied. Add an old sale outside the performance filter and prove it still contributes to the finance balance.
- [ ] **Step 2: Implement source and payment aggregation as separate queries.** The core payment aggregate is:

```sql
SELECT
  COALESCE(SUM(amount) FILTER (WHERE kind = 'PAYMENT'), 0) AS paid,
  COALESCE(SUM(amount) FILTER (WHERE kind = 'REVERSAL'), 0) AS reversed
FROM finance_payment
WHERE brand_id = $1::uuid;
```

Use `creator_id` for creator reads and parameterized `Prisma.sql`/tagged queries,
never string interpolation of IDs. Group by party for list pages so loading 25
accounts does not make 25 separate aggregate round trips. Keep zero-earning
accounts visible with left joins/coalesced zero totals. Read one summary in a
RepeatableRead transaction so earnings and payment totals share a snapshot.

- [ ] **Step 3: Implement source candidates from section 4.4 and document prefill.** Return original snapshot descriptions for an attribution that is no longer eligible but needs a credit. Default platform name to `Xurjin`, and other platform document values to empty strings. Read optional `FINANCE_PLATFORM_NAME`, `FINANCE_PLATFORM_IDENTIFICATION`, `FINANCE_PLATFORM_ADDRESS`, `FINANCE_PLATFORM_BANK`, and `FINANCE_PLATFORM_IBAN` in `finance-config.ts`; document them in `.env.example`. Do not make global app startup depend on invoice configuration.
- [ ] **Step 4: Scope ordinary-owner reads from their session.**

```ts
function ownParty(viewer: Viewer): FinanceParty | undefined {
  if (viewer.kind === "brand") return { kind: "brand", id: viewer.brandId };
  if (viewer.kind === "creator")
    return { kind: "creator", id: viewer.creatorId };
  return undefined;
}
```

Implement `readOwnFinance(viewer, query)` without an owner argument and
`readAdminFinance(viewer, party, query)` with `requireAdmin`. An invoice reader
allows admin capability or the matching stored party; otherwise return
`not_found`. Include regular users attempting forged owner/invoice IDs in tests.

- [ ] **Step 5: Run the new read unit/integration files and commit `feat: read account finance balances`.** Expected: all-time exact totals, no cross-account rows, and no query dependence on invoice generation.

### Task 5: Record external payments and audited corrections

**Files:**

- Create: `src/modules/finance/application/record-payment.ts`
- Create: `src/modules/finance/application/reverse-payment.ts`
- Create: `src/modules/finance/application/payments.test.ts`
- Create: `src/modules/finance/infrastructure/prisma-payment-repository.ts`
- Create: `src/modules/finance/infrastructure/finance-retry.ts`
- Create: `src/modules/finance/infrastructure/payments.integration.test.ts`
- Modify: `src/modules/finance/index.ts`

- [ ] **Step 1: Write the real-database payment scenarios before the implementation.** Instantiate the command repository as `payments` in the test file and use the fixture from Task 2.

```ts
it("records a creator payout before any brand payment or invoice", async () => {
  const { creator, admin } = await financeFixture();
  const input: RecordPaymentInput = {
    requestKey: crypto.randomUUID(),
    party: { kind: "creator", id: creator.id },
    amount: "400.00",
    transferredOn: "2026-09-13",
    bankReference: "",
    note: "",
  };
  const id = await payments.recordPayment(admin.id, input);
  expect(await payments.recordPayment(admin.id, input)).toBe(id);
  const records = await prisma.financePayment.findMany({
    where: { creatorId: creator.id },
  });
  expect(records).toHaveLength(1);
  expect(records[0]?.amount.toFixed(2)).toBe("400.00");
  expect(await prisma.financeInvoice.count()).toBe(0);
});
```

Add scenarios for two separate transfers with identical amount/reference but
different keys; concurrent requests with the same key; the same key with a changed
amount; missing/deleted owner; suspended owner; optional same-owner invoice;
cross-owner invoice rejection; partial payment; and rollback when audit creation
fails. The absence of a brand receipt or positive balance must never be an error.

- [ ] **Step 2: Implement a typed operation error and bounded transaction retry.**

```ts
import { Prisma } from "@/src/generated/prisma/client";

export async function retryFinanceTransaction<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (!retryable) throw error;
      if (attempt === 2) throw new FinanceOperationError("retry_later");
    }
  }
  throw new FinanceOperationError("retry_later");
}
```

Define/import `FinanceOperationError` from the repository contract file specified
in section 4.3. Idempotency-key conflict resolution is outside this generic retry
helper and follows section 4.4.

- [ ] **Step 3: Implement payment insertion in one Serializable database transaction.** Normalize the input and hash it with the authenticated actor before entering the transaction. Check an existing request key first. Verify the selected party exists without consulting approval status. If `invoiceId` is provided, check its stored owner matches the party. Insert one PAYMENT and one `AuditEvent` with action `finance.payment_recorded`, `entityType: "finance_payment"`, and `actorId`. Capture the account display name at entry in `partySnapshot`. Do not infer a verified destination bank account from a profile field.

Use the following write shape after the checks, with `input`, `actorId`,
`requestHash`, and `partyName` defined from this operation:

```ts
const row = await tx.financePayment.create({
  data: {
    requestKey: input.requestKey,
    requestHash,
    kind: "PAYMENT",
    ...(input.party.kind === "brand"
      ? { brandId: input.party.id }
      : { creatorId: input.party.id }),
    amount: input.amount,
    transferredOn: new Date(`${input.transferredOn}T00:00:00.000Z`),
    bankReference: input.bankReference || null,
    note: input.note || null,
    invoiceId: input.invoiceId ?? null,
    partySnapshot: { name: partyName },
    recordedById: actorId,
  },
});
await tx.auditEvent.create({
  data: {
    actorId,
    action: "finance.payment_recorded",
    entityType: "finance_payment",
    entityId: row.id,
    changes: { amount: input.amount, party: input.party },
  },
});
return row.id;
```

- [ ] **Step 4: Implement full record reversal under a row lock in a Serializable transaction.** Lock the original `finance_payment` row with a parameterized `SELECT id FROM finance_payment WHERE id = $1::uuid FOR UPDATE`. Verify kind PAYMENT. If a reversal already exists, return that reversal ID without creating another; for a repeated request key, first enforce its input hash. Copy the original account, positive amount, original transfer date, optional invoice, reference, and party snapshot; set `kind: REVERSAL`, `reversesId`, current `recordedAt`, current admin, and submitted reason as `note`. Insert `finance.payment_reversed` audit event atomically. Reject missing records and reversing a reversal with `not_found`/`invalid_reversal`.

```ts
it("reversal restores balance and keeps both rows", async () => {
  const { creator, admin } = await financeFixture();
  const party: FinanceParty = { kind: "creator", id: creator.id };
  const paymentId = await payments.recordPayment(admin.id, {
    requestKey: crypto.randomUUID(),
    party,
    amount: "200.00",
    transferredOn: "2026-09-13",
    bankReference: "BANK-1",
    note: "",
  });
  await payments.reversePayment(admin.id, {
    requestKey: crypto.randomUUID(),
    paymentId,
    reason: "Wrong amount entered",
  });
  expect((await reads.getSummary(party)).balance.outstanding).toBe("300.00");
  expect(
    await prisma.financePayment.count({ where: { creatorId: creator.id } }),
  ).toBe(2);
});
```

Instantiate `reads` from Task 4 in this test file. Add two-admin concurrent
reversal coverage and cancellation-after-payout coverage: a cancellation changes
earned obligation, keeps the real payment, and allows negative outstanding.

- [ ] **Step 5: Wrap commands in authorized application factories.** Unit-test that anonymous/regular-brand/regular-creator calls never reach the repository; standalone/dual-role admins do. Parse/validate before persistence, derive actor from the viewer, and map only expected errors to `Result`.
- [ ] **Step 6: Run `pnpm test:unit src/modules/finance/application/payments.test.ts` and `pnpm test:integration src/modules/finance/infrastructure/payments.integration.test.ts`.** Expect all scenarios, including overpayment and payout-before-receipt, to pass. Commit `feat: record external payments and reversals`.

### Task 6: Generate immutable invoices on demand

**Files:**

- Create: `src/modules/finance/application/preview-invoice.ts`
- Create: `src/modules/finance/application/issue-invoice.ts`
- Create: `src/modules/finance/application/invoices.test.ts`
- Create: `src/modules/finance/infrastructure/prisma-invoice-repository.ts`
- Create: `src/modules/finance/infrastructure/invoices.integration.test.ts`
- Modify: `src/modules/finance/index.ts`

- [ ] **Step 1: Add issuance tests proving invoices do not move money.** Instantiate `invoices` with the repository commands and `reads` with Task 4's queries; construct `IssueInvoiceInput` from each preview.

```ts
it("issues independent brand and creator documents without changing balances", async () => {
  const { creator, brand, admin } = await financeFixture();
  for (const party of [
    { kind: "brand", id: brand.id },
    { kind: "creator", id: creator.id },
  ] as FinanceParty[]) {
    const before = await reads.getSummary(party);
    const preview = await reads.previewInvoice(party);
    await invoices.issueInvoice(admin.id, {
      requestKey: crypto.randomUUID(),
      party,
      previewHash: preview.previewHash,
      payer: preview.payer,
      payee: preview.payee,
    });
    expect((await reads.getSummary(party)).balance).toEqual(before.balance);
    expect((await reads.previewInvoice(party)).lines).toEqual([]);
  }
  expect(await prisma.financeInvoice.count()).toBe(2);
  expect(await prisma.financePayment.count()).toBe(0);
});
```

Add invoice-after-prepayment, source/profile changes after issuance, duplicate
submissions, simultaneous issuance from two admin sessions, a new sale between
preview and generation, cancellation between preview and generation, and
cancellation after invoice/payout. A cancellation after invoice produces one
negative line on the next document; the prior invoice remains unchanged.

- [ ] **Step 2: Implement preview and issuance per section 4.4.** Empty candidates return `nothing_to_invoice`; signed or zero totals with nonempty lines are allowed. Use Decimal for line summation, validate the aggregate fits Decimal(18,2), and freeze original strings/party data in JSON. The request fingerprint includes the submitted document details so an identical request key cannot issue different bank instructions.

The counter increment is one atomic upsert in the same transaction:

```ts
const counter = await tx.financeInvoiceCounter.upsert({
  where: { kind_year: { kind, year } },
  create: { kind, year, lastValue: 1 },
  update: { lastValue: { increment: 1 } },
});
const number = `XU-${kind === "BRAND" ? "B" : "C"}-${year}-${String(counter.lastValue).padStart(6, "0")}`;
```

Here `kind` is BRAND/CREATOR derived from `input.party.kind`, and `year` comes
from the issuance clock in `Asia/Tbilisi`. The number is for display and lookup;
use the UUID for internal relations. Insert invoice, nested line snapshots, and
`finance.invoice_issued` audit event atomically. Do not modify conversions,
attributions, payment rows, or balances during generation.

- [ ] **Step 3: Preserve immutable documents and independent credits.** Reads/downloads use stored lines and stored payer/payee data only. Current account balance is a separately labeled live panel outside the invoice document. Do not add automatic payment matching or a paid badge to an invoice merely because the account balance reaches zero.
- [ ] **Step 4: Run the invoice unit/integration tests and the full finance integration directory.**

```powershell
pnpm test:unit src/modules/finance/application/invoices.test.ts
pnpm test:integration src/modules/finance/infrastructure
```

Expected: one write per request, stable documents, independent streams, exact
credits, unchanged balances after invoicing, and no payment-policy rejection.
Commit `feat: generate manual brand and creator invoices`.

### Task 7: Add admin login, protected management, and payment forms

**Files:**

- Create: `src/infrastructure/finance-services.ts`
- Create: `app/[locale]/admin/login/page.tsx`
- Create: `app/[locale]/admin/(protected)/layout.tsx`
- Create: `app/[locale]/admin/(protected)/finance/page.tsx`
- Create: `app/[locale]/admin/(protected)/finance/[kind]/[id]/page.tsx`
- Create: `app/[locale]/admin/(protected)/finance/actions.ts`
- Create: `src/modules/finance/ui/admin-finance.tsx`
- Create: `src/modules/finance/ui/account-finance.tsx`
- Create: `src/modules/finance/ui/payment-form.tsx`
- Create: `src/modules/finance/ui/reversal-form.tsx`
- Create: `src/modules/finance/ui/invoice-form.tsx`
- Create: `src/modules/finance/ui/finance-copy.ts`
- Create: `src/modules/finance/ui/payment-form.test.tsx`
- Create: `app/finance.css`
- Modify: `app/[locale]/workspace/page.tsx`
- Modify: `src/modules/shell/ui/site-frame.tsx`
- Modify: `src/modules/shell/ui/nav-model.ts`
- Modify: `src/modules/shell/ui/nav-model.test.ts`
- Modify: `src/modules/localization/messages/en.json`
- Modify: `src/modules/localization/messages/ka.json`
- Modify: `src/modules/finance/index.ts`

- [ ] **Step 1: Wire the application factories in `finance-services.ts`.** Export `recordFinancePayment`, `reverseFinancePayment`, `previewFinanceInvoice`, `issueFinanceInvoice`, `readOwnFinance`, `readAdminFinance`, and `readFinanceInvoice`, using module-public exports. Supply the real clock to invoice issuance. Pages/actions import these services; client components receive serializable props and action callbacks, not database/repository objects.
- [ ] **Step 2: Add the dedicated login and protected layout.** Reuse `SignInForm` with `mode="sign-in"` and fixed `returnTo={`/${locale}/admin/finance`}`. Standalone or dual-role admins visiting login go directly to finance. An authenticated nonadmin may see **This account does not have admin access**; never loop login back to the protected page. Keep a link to their ordinary workspace and the existing sign-out control.

The protected layout check is:

```ts
const viewer = await currentViewer();
const access = requireAdmin(viewer);
if (!access.ok) {
  if (access.error === "unauthenticated") redirect(`/${locale}/admin/login`);
  notFound();
}
```

Validate locale before this code. Change the standalone-admin workspace redirect
from `coming-soon` to `/admin/finance`. In `SiteFrame`, recognize admin finance
routes for both standalone and dual-role admins, hide the workspace chrome on
admin login, and render finance navigation instead of creator/product links.
Dual-role users get an **Admin finance** link from their normal workspace. Replace
the historical periods/invoices/payouts/adjustments destinations in `nav-model.ts`
with finance, keeping useful public discovery destinations.

- [ ] **Step 3: Build the finance index and account detail.** The finance index query contract is `?tab=brands|creators|transactions&q=<search>&page=<positive integer>`. Use regular links for tabs so refresh/back behavior is stable. Account detail uses `kind=brand|creator` and a UUID. Render a name search, 25-row pagination, exact outstanding amount, invoice action, and payment action. Reuse `WorkspaceShell`, `DataTable`, `Field`, `Button`, `MoneyAmount`, and existing tokens. Import `app/finance.css` from finance layouts/pages; avoid changes to unrelated global styles.
- [ ] **Step 4: Build the payment form with editable prefill.** Amount comes from positive outstanding, date defaults to a Tbilisi calendar date, and optional invoice choices are limited to that party's documents. The label is **Record payment received** for brands and **Record payout made** for creators. Note label explains it is visible to that account owner. Submit has pending/error/success states and retains entered values on failure.

Pass a UUID from the server to the form as its initial submission key, retain it
for network retries, and rotate it only after a successful new operation or when
opening a fresh form. Do not generate a different SSR/client hidden-input value.
The user-entered amount wins even if another transfer changes the balance while
the form is open. A balance change is not a policy error or a reason to alter
the transfer amount silently.

```ts
it("submits the admin's edited amount rather than the prefill", async () => {
  const submit = vi.fn().mockResolvedValue({ ok: true, value: { id: "payment-1" } });
  render(<PaymentForm
    party={{ kind: "creator", id: "22000000-0000-4000-8000-000000000002" }}
    outstanding="300.00" today="2026-09-13" locale="en" invoices={[]}
    requestKey="33000000-0000-4000-8000-000000000001" onSubmit={submit}
  />);
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("Amount (GEL)"));
  await user.type(screen.getByLabelText("Amount (GEL)"), "400.00");
  await user.click(screen.getByRole("button", { name: "Record payout made" }));
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({ amount: "400.00" }));
});
```

Define those exact props on `PaymentForm`; `onSubmit` consumes
`RecordPaymentInput` and returns the command `Result`. Add tests for empty
prefill on credit, retry retaining its key, error retaining input, and duplicate
clicks producing one pending submission. Do not add policy warnings or disabled
payout buttons based on brand funding.

- [ ] **Step 5: Build invoice preview and record correction.** The preview includes frozen-source candidate lines, total, editable payer/payee name/identification/address/bank/IBAN fields, and **Generate invoice**. Creator documents prefill creator as payee and platform as payer; brand documents use the reverse direction. A stale preview shows **Earnings changed. Review the updated invoice before generating it.** and requires a new generate click. No rows shows **Nothing new to invoice**. Reversal asks for a reason and clearly states that it corrects the app record without sending/recovering money.
- [ ] **Step 6: Add server actions with fresh authorization and revalidation.** Every action validates locale/input and calls the corresponding service with `await currentViewer()`; never accept an actor ID from the form. Successful commands revalidate admin finance, the affected account detail, and that party's home/full history in both locales. Use concrete paths and then refresh the submitting client.

```ts
for (const language of ["ka", "en"] as const) {
  revalidatePath(`/${language}/admin/finance`);
  revalidatePath(`/${language}/admin/finance/${party.kind}/${party.id}`);
  revalidatePath(`/${language}/${party.kind}`);
  revalidatePath(`/${language}/${party.kind}/finance`);
}
```

Derive `party` from the successful persisted result/read after a reversal,
rather than trusting an extra form field. Revalidation and refresh do not add
real-time polling; another user's open browser sees changes on its next navigation
or refresh.

- [ ] **Step 7: Run form/nav tests, typecheck, and module boundaries.** Preserve existing Georgian/English keys and uncommitted edits when adding finance navigation labels. Expect accessible labels and working error/pending states. Commit `feat: add admin finance management` using only this task's changes.

### Task 8: Add private invoice detail, download, and printing

**Files:**

- Create: `src/modules/finance/ui/invoice-document.tsx`
- Create: `src/modules/finance/ui/invoice-html.ts`
- Create: `src/modules/finance/ui/print-invoice-button.tsx`
- Create: `src/modules/finance/ui/invoice-html.test.ts`
- Create: `src/modules/finance/http/invoice-download.ts`
- Create: `src/modules/finance/http/invoice-download.test.ts`
- Create: `app/[locale]/finance/invoices/[id]/page.tsx`
- Create: `app/api/finance/invoices/[id]/download/route.ts`
- Modify: `app/finance.css`
- Modify: `src/modules/finance/index.ts`

- [ ] **Step 1: Create a document view model from the saved invoice.** Display invoice number, issue date, **Payable by** and **Payable to**, their supplied details, reference number, signed commission/correction lines, and **Invoice total (GEL)**. Use the stored document and line snapshots, not joins to current profile fields. Negative totals are labeled as credit adjustments. Include issuing admin display name outside the printable bank details if useful, without exposing their email. Keep the separately fetched live account balance outside the printable document.
- [ ] **Step 2: Implement escaped, standalone HTML output.** `renderInvoiceHtml(invoice, locale)` in `ui/invoice-html.ts` uses the same stored view fields and localized labels as `InvoiceDocument`. Escape every user-supplied string, including names, notes, references, and bank details. Use no raw profile HTML, external CSS, remote images, or scripts. Include UTF-8 charset, `lang`, a descriptive title, inline document CSS, responsive line items, and print rules for table headers/page breaks.

```ts
export function escapeInvoiceText(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]!);
}
```

Test `<script>`/quote-containing names, Georgian text preservation, exact signed
totals, and zero live profile dependencies. Avoid adding a server browser or PDF
package. Downloaded HTML is portable; PDF output uses the browser print dialog.

- [ ] **Step 3: Implement the authorized download handler and route.** The route accepts a UUID and an optional `locale=ka|en` query; default to Georgian. Resolve `currentViewer`, authorize through `readFinanceInvoice`, and only then render. Map anonymous requests to 401 and unknown/foreign invoices to 404. Set private/no-store headers for success and error responses. A successful result is:

```ts
return new Response(renderInvoiceHtml(invoice, locale), {
  status: 200,
  headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Disposition": `attachment; filename="${invoice.number}.html"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  },
});
```

Invoice numbers are server-generated from the fixed format in Task 6. The
localized detail page uses the same ownership service, normal React rendering,
**Download invoice**, and **Print / Save as PDF**. Do not publicly upload invoice
files or use guessable unauthenticated storage links.

- [ ] **Step 4: Add the tiny browser print control and print CSS.**

```tsx
"use client";
export function PrintInvoiceButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="finance-print-control"
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}
```

Use the existing `Button` component when styling the actual control. Print styles
hide shell/sidebar/buttons and the live balance panel, preserve invoice content,
repeat table headings, and avoid splitting totals. Do not treat a print dialog
opening as proof a PDF was saved; test print media layout separately.

- [ ] **Step 5: Run download/HTML tests.**

```powershell
pnpm test:unit src/modules/finance/http/invoice-download.test.ts src/modules/finance/ui/invoice-html.test.ts
```

Expected: admin and owning account succeed; a different brand, creator, and
anonymous session do not receive the document. Script-like names remain text.
Commit `feat: add private invoice downloads and printing`.

### Task 9: Show finances on brand and creator home pages

**Files:**

- Create: `src/modules/finance/ui/finance-summary.tsx`
- Create: `src/modules/finance/ui/finance-summary.test.tsx`
- Create: `app/[locale]/brand/finance/page.tsx`
- Create: `app/[locale]/creator/finance/page.tsx`
- Modify: `app/[locale]/brand/page.tsx`
- Modify: `app/[locale]/creator/page.tsx`
- Modify: `src/modules/conversions/ui/insight-overview.tsx`
- Modify: `src/modules/finance/index.ts`
- Modify: `app/finance.css`

- [ ] **Step 1: Add a composition slot to `WorkspaceOverview`.** Add optional `finance?: ReactNode` to its props and render it after the existing overview metrics, preserving the current insight layout. The home pages pass the `FinanceSummary` element shown in Step 2; the conversions module does not fetch finance or import finance persistence. This keeps the existing performance report unchanged.
- [ ] **Step 2: Fetch finance in parallel with existing server reads.** Use the authenticated owner service. Supply the all-time summary, five recent transactions, five recent invoices, locale, and a full-history link to `FinanceSummary`. Do not pass performance filters to the finance query.

The relevant composition shape is:

```tsx
<WorkspaceOverview
  state={state}
  locale={locale}
  name={name}
  report={report}
  products={products}
  discover={discover}
  finance={<FinanceSummary summary={financeSummary} locale={locale} />}
/>
```

Use each page's existing `name`, `products`, and `discover` expressions; do not
replace its catalog/report logic. Define `FinanceSummary` props from the view
contract in section 4.3 and export the component through the finance index.

- [ ] **Step 3: Render balance semantics and history.** Brand labels: **Amount outstanding**, **Payments received**, and **Credit**. Creator labels: **Unpaid earnings**, **Paid to you**, and **Paid above current earnings**. Display the magnitude for a credit with its explicit label, while retaining the signed decimal in the underlying view. Show all-time earned commission separately from the remaining balance. Payment rows show date, amount, reference/note if present, and recording admin display name. Original reversed rows are marked **Reversed**; the correction row says **Payment record reversed** so it cannot be mistaken for another transfer.
- [ ] **Step 4: Add full account histories at `/brand/finance` and `/creator/finance`.** Reuse the account finance component in read-only mode. Resolve owner from the session, paginate both histories, and include invoice/detail/download links. Do not render admin action forms or expose party selectors to ordinary users. Empty accounts show zero balances and **No payments recorded yet** / **No invoices yet**, without a blocked or pending state.
- [ ] **Step 5: Test meaningful summary states.** Cover a creator with earned `300.00`, paid `200.00`, unpaid `100.00`; brand credit; reversed payment labels; invoice link ownership route; and empty history. Assert that changing performance filters does not change the all-time summary in the browser journey. Run the finance-summary tests and existing performance dashboard tests, then commit `feat: show invoices and payments in account workspaces`.

### Task 10: Add admin-wide commercial reporting and financial summaries

**Files:**

- Create: `src/modules/conversions/ports/admin-performance.ts`
- Create: `src/modules/conversions/application/admin-performance-query.ts`
- Create: `src/modules/conversions/application/admin-performance-query.test.ts`
- Create: `src/modules/conversions/application/read-admin-performance.ts`
- Create: `src/modules/conversions/application/read-admin-performance.test.ts`
- Create: `src/modules/conversions/infrastructure/prisma-admin-performance.ts`
- Create: `src/modules/conversions/infrastructure/admin-performance.integration.test.ts`
- Create: `src/modules/finance/ports/admin-performance-finance.ts`
- Create: `src/modules/finance/infrastructure/prisma-admin-performance-finance.ts`
- Create: `src/modules/finance/infrastructure/admin-performance-finance.integration.test.ts`
- Modify: `src/modules/conversions/index.ts`
- Modify: `src/modules/finance/index.ts`

- [ ] **Step 1: Add the section 4.5 types and parser tests.** The parser returns the existing `Result<AdminPerformanceQuery, "invalid_input">` shape. Keep brand/creator/product IDs in their own fields, and enforce only supported status/sort/tab values. Define this default-date regression:

```ts
it("defaults to the Tbilisi month to date across a UTC month boundary", () => {
  const result = parseAdminPerformanceQuery(
    {},
    new Date("2026-08-31T21:00:00Z"),
  );
  expect(result).toMatchObject({
    ok: true,
    value: {
      tab: "overview",
      from: "2026-09-01",
      to: "2026-09-01",
      productStatus: "ALL",
      page: 1,
      sort: "sales_value",
      direction: "desc",
    },
  });
});
```

Test invalid dates and reversed ranges, forged IDs, unrecognized sort columns,
array-valued scalar query parameters, and stable custom ranges. Run
`pnpm test:unit src/modules/conversions/application/admin-performance-query.test.ts`
before implementing the parser; expect the missing/new behavior to fail.

- [ ] **Step 2: Implement independent aggregate queries for commercial metrics.** Use SQL CTEs for eligible canonical sale rows, matching-SKU item totals, and creditable click totals; group each by target before joining to the product/brand/creator list. Product lists begin at `product`, not tracking links or attributions, so a new product appears with zero metrics. Creator filtering uses `EXISTS` on a tracking link and separately narrows each metric aggregate; do not require link status ACTIVE. Bind values with `Prisma.sql`. Use a fixed map from section 4.5 sort keys to SQL expressions and add `name, id` as tie breakers.
- [ ] **Step 3: Add the product detail query and trends.** Resolve the product independently of list search/status, return `undefined` only when the ID does not exist, aggregate its linked creators including zero-activity creators, and reuse the exact commercial source CTEs for totals/trends. Count conversions and sum canonical amounts once. Preserve current cancellation semantics for historical ranges. Generate all daily/monthly buckets for the requested interval and merge query results with zero buckets; do not reuse the 90-day trend cap.
- [ ] **Step 4: Add commercial integration fixtures across at least two brands and creators.** Include an unlinked active product, archived product, disabled link, duplicate noncreditable click, confirmed sale, cancelled sale, and multiple same-SKU order items. Assert the following outcomes:

```ts
expect(
  report.rows.items.find((row) => row.id === unlinkedProduct.id),
).toMatchObject({
  clicks: 0,
  salesCount: 0,
  salesValue: "0.00",
  commission: "0.00",
});
expect(
  report.rows.items.find((row) => row.id === archivedProduct.id)?.status,
).toBe("ARCHIVED");
expect(
  productReport.rows.items.find((row) => row.id === linkedCreator.id),
).toBeDefined();
expect(report.totals.commission).toBe(expectedCanonicalCommission);
```

Define these fixture variables in the test using `seedLink` and explicit
conversion/item/attribution inserts, following `performance.integration.test.ts`.
Also test first/last Tbilisi day boundaries, stable pagination, ascending and
descending sort, overview/product reconciliation, and a range beyond 90 days.

- [ ] **Step 5: Implement the admin financial companion query.** Compute per-party all-time balance first, then sum positive and negative magnitudes separately. Period payments use transfer dates and PAYMENT minus REVERSAL. Expose the authorized reader defined in section 4.5; export repository functions through the finance index for composition. Cover a 100 GEL receivable and separate 50 GEL credit: platform outstanding is 100, credits are 50, not a net 50. Cover a payment entered in October with a September transfer date and its later reversal: both correct September's net cash. Brand/creator row cash remains account-wide under opposite-party commercial filters.
- [ ] **Step 6: Add application authorization tests and run the report suites.** Assert the repository is not called for anonymous/regular viewers, and standalone/dual-role admins can read every product without impersonating its brand.

```powershell
pnpm test:unit src/modules/conversions/application/admin-performance-query.test.ts src/modules/conversions/application/read-admin-performance.test.ts
pnpm test:integration src/modules/conversions/infrastructure/admin-performance.integration.test.ts src/modules/finance/infrastructure/admin-performance-finance.integration.test.ts
pnpm verify:boundaries
```

Expected: complete catalog results, correct grouped metrics/cash, no owner endpoint
regression, and clean module boundaries. Commit `feat: add admin performance reporting`.

### Task 11: Add Products and Performance pages for admin

**Files:**

- Create: `src/infrastructure/admin-performance-services.ts`
- Create: `src/modules/finance/ui/admin-performance.tsx`
- Create: `src/modules/finance/ui/admin-product-performance.tsx`
- Create: `src/modules/finance/ui/admin-performance-filters.tsx`
- Create: `src/modules/finance/ui/admin-performance-trend.tsx`
- Create: `src/modules/finance/ui/admin-performance.test.tsx`
- Create: `app/[locale]/admin/(protected)/performance/page.tsx`
- Create: `app/[locale]/admin/(protected)/products/page.tsx`
- Create: `app/[locale]/admin/(protected)/products/[id]/page.tsx`
- Modify: `src/modules/shell/ui/site-frame.tsx`
- Modify: `src/modules/shell/ui/nav-model.ts`
- Modify: `src/modules/shell/ui/nav-model.test.ts`
- Modify: `src/modules/finance/ui/finance-copy.ts`
- Modify: `src/modules/localization/messages/en.json`
- Modify: `src/modules/localization/messages/ka.json`
- Modify: `src/modules/finance/index.ts`
- Modify: `app/finance.css`

- [ ] **Step 1: Compose authorized reporting services.** `loadAdminPerformance(viewer, query)` returns `{ report, finance }` using Task 10's readers, asking finance for only the brand/creator IDs present in the current table plus platform totals. `loadAdminProductPerformance(viewer, productId, query)` returns the product report without product cash metrics. Check admin capability before querying either source. No Prisma values reach client components. Do not add an admin role to the existing owner performance APIs.
- [ ] **Step 2: Add the three admin navigation entries.** Finance links to `/admin/finance`, Products to `/admin/products`, and Performance to `/admin/performance`, each locale-prefixed. Keep login landing on Finance. The Performance Products tab links to `/admin/products` with the current report filters. The dedicated Products page forces `tab: "products"` and renders the same table component as the report. Preserve an explicit Overview tab for returning to platform metrics. Standalone and dual-role admins see the same links; regular users see none.
- [ ] **Step 3: Build the report UI.** Performance overview shows attributed sales count/value and earned commission, then the full-range trend, then separately labeled platform payments and current balances. Brand/creator tabs show their section 4.5 columns with links to the narrowed admin report and respective finance account. Use clear **Account payments (period)** and **Account balance (all time)** column labels and explain that commercial filters do not allocate those account transfers. Do not suggest collected payments are platform revenue.
- [ ] **Step 4: Build the all-product list and product detail.** Products shows product name/SKU, brand, status, clicks, attributed sales, sales value, and creator commission. Include search, date, brand, creator, and status controls plus sortable metric headers and 25-row pagination. No activity means numeric zeros; archived status remains visible. Detail shows identity/status, metrics, trend, and per-creator results, with direct links to creator/brand admin reports and a back link retaining list state. Do not send an admin to owner-only brand product routes for inspection. Products is read-only in this scope; no product editing, ownership transfer, or catalog moderation is introduced.
- [ ] **Step 5: Add contextual CSV links.** Use the section 4.6 scope appropriate to each tab/page; include normalized filters and sort, exclude page. Product detail uses `scope=product_creators` and its ID. Show download pending/error state if fetching via a client button; a failed request must show the localized server error rather than saving an error payload as a CSV. The overview button exports one summary row; Products exports all matching product rows.
- [ ] **Step 6: Verify UI scope labels and navigation.** Add component cases for archived/zero products, missing report rows, explicit credit totals, account-wide payment headings, no product payout column, and generated export URLs retaining filters. Run new UI/nav tests, `pnpm typecheck`, and `pnpm verify:boundaries`. Commit `feat: add admin products and performance pages`.

### Task 12: Add admin CSV report downloads

**Files:**

- Create: `src/modules/finance/application/admin-performance-csv.ts`
- Create: `src/modules/finance/application/admin-performance-csv.test.ts`
- Create: `src/modules/finance/http/admin-performance-export.ts`
- Create: `src/modules/finance/http/admin-performance-export.test.ts`
- Create: `app/api/admin/performance/export/route.ts`
- Modify: `src/modules/conversions/ports/admin-performance.ts`
- Modify: `src/modules/conversions/infrastructure/prisma-admin-performance.ts`
- Modify: `src/modules/conversions/infrastructure/admin-performance.integration.test.ts`
- Modify: `src/infrastructure/admin-performance-services.ts`
- Modify: `src/modules/conversions/index.ts`
- Modify: `src/modules/finance/index.ts`

- [ ] **Step 1: Add export readers using the same source queries.** Define `exportRows(scope, query, productId?)` with typed scope and `{ rows, total, limit: 10000 }` output. It selects all matching sorted aggregate rows, ignoring page, with overflow detection at 10,001 rows. Compute the actual matching `total` with `COUNT(*) OVER()` before the limit (zero for an empty result), rather than reporting the capped fetched length as the total. The overview uses the report summary and platform finance companion, not a table export. For brand/creator export, batch the companion finance values for exported account IDs rather than issuing a query per row. Product exports never fetch IBANs, notes, or account allocations.
- [ ] **Step 2: Add a typed CSV cell renderer and the exact headers in section 4.6.** Define `adminPerformanceCsv(headers, rows)` with cells `{ value: string; numeric?: boolean }`; numeric cells are supplied only from validated report decimals/counts. Use this text-safe quoting function:

```ts
function csvReportCell(cell: { value: string; numeric?: boolean }): string {
  const unsafeText =
    !cell.numeric &&
    (/^[\t\r\n]/.test(cell.value) || /^[\s\uFEFF]*[=+\-@]/.test(cell.value));
  const value = unsafeText ? `'${cell.value}` : cell.value;
  return `"${value.replaceAll('"', '""')}"`;
}

export function adminPerformanceCsv(
  headers: readonly string[],
  rows: readonly (readonly { value: string; numeric?: boolean }[])[],
): string {
  const header = headers.map((value) => csvReportCell({ value })).join(",");
  const body = rows.map((row) => row.map(csvReportCell).join(","));
  return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
}
```

Test commas, quotes, multiline names, Georgian text, a name starting with
`=HYPERLINK`, whitespace-prefixed formulas, trusted `-50.00` credit, header-only
empty results, and exact date/money column placement. Header order is part of
the export contract and should not depend on localized UI column labels.

- [ ] **Step 3: Implement a dependency-injected export handler and thin GET route.** Guard admin, validate scope/query, load the matching report, enforce the row limit, and map it to the explicit columns. On success return:

```ts
return new Response(csv, {
  headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="xurjin-admin-${scope}-${query.from}-${query.to}.csv"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  },
});
```

`scope`, `from`, and `to` must be the validated enum/date values. On failures
return the section 4.6 status and JSON error with `private, no-store`; never a
partial export. Record no financial mutation when generating or downloading CSV.

- [ ] **Step 4: Verify all-row exports and direct endpoint authorization.** With 26 matching products and page 2 selected, the CSV contains 26 rows in requested sort order, not one row. A brand-filtered product download excludes other brands. Product detail export contains only that product's linked creators, including zero activity. Test 10,000 rows succeeding and 10,001 producing a 422 with no CSV attachment. A regular brand/creator and anonymous direct caller cannot download admin data; dual-role admins can.

```powershell
pnpm test:unit src/modules/finance/application/admin-performance-csv.test.ts src/modules/finance/http/admin-performance-export.test.ts
pnpm test:integration src/modules/conversions/infrastructure/admin-performance.integration.test.ts
pnpm verify:boundaries
```

Expect exact filtered exports, preserved text/numbers, bounded results without
silent truncation, and no change to the existing owner CSV endpoint. Commit
`feat: export admin performance as CSV`.

### Task 13: Add reproducible local setup and verify complete journeys

**Files:**

- Create: `scripts/seed-finance.ts`
- Create: `src/test/e2e/finance.spec.ts`
- Create: `src/test/e2e/admin-performance.spec.ts`
- Create: `docs/manual-finance.md`
- Modify: `docs/local-development.md`
- Modify: `package.json`

- [ ] **Step 1: Add deterministic finance fixtures for browser testing.** Use the existing Better Auth password-hashing/credential pattern from `scripts/seed-phase-02.ts`. Create a standalone development admin `finance-admin@example.test`, a dedicated brand, a dedicated creator, and attributed commission fixtures for this feature. Use a clearly development-only password documented only as a demo credential. Set `isAdmin` through the seed, not registration input. Refuse `NODE_ENV=production` and any database host outside loopback/local Docker services. Limit reset/cleanup to the fixture's fixed UUIDs inside the local development database; never truncate application tables. Remove only that fixture's finance audit/line/payment/invoice rows in FK-safe order when an explicit test reset is requested, leaving shared invoice counters monotonic.

Provide separate admin/brand/creator browser contexts and unique fixture accounts
per locale/project journey, or reset only this fixture before each journey.
Tests must run independently on desktop and mobile without inheriting a prior
test's payments. Add `"seed:finance": "tsx scripts/seed-finance.ts"` to package
scripts. The seed's default rerun is idempotent and does not erase recorded demo
payments; only the explicit local test reset may clear its own rows.

Extend the dedicated fixture namespace with two brands/creators and at least
26 products, including an unlinked product, an archived product, disabled links,
and known confirmed/cancelled sale amounts. Include a transfer whose entered
date differs from its recorded month. Keep the base finance journey's 300 GEL
obligation unchanged; use separate fixed fixture accounts for report tests.

- [ ] **Step 2: Write the main `@finance` browser journey in English and Georgian.** Use a fixture obligation of `300.00` on both sides and assert each checkpoint:

| Action                                             | Brand outstanding | Creator unpaid | Expected history                              |
| -------------------------------------------------- | ----------------- | -------------- | --------------------------------------------- |
| Start                                              | 300.00            | 300.00         | No invoices or payments.                      |
| Admin generates brand invoice                      | 300.00            | 300.00         | One brand invoice; no payment.                |
| Admin generates creator invoice                    | 300.00            | 300.00         | One creator invoice; payable to creator.      |
| Admin records creator payout 200 before brand pays | 300.00            | 100.00         | Creator sees payout 200.                      |
| Admin records brand receipt 100                    | 200.00            | 100.00         | Brand sees receipt 100.                       |
| Admin reverses the receipt                         | 300.00            | 100.00         | Original receipt and reversal remain visible. |
| Admin records brand receipt 350                    | -50.00            | 100.00         | Brand sees credit 50.                         |
| Admin records another creator payout 150           | -50.00            | -50.00         | Creator sees paid-above-earnings 50.          |

Reload each ordinary account after admin saves; assert its earned commission
remains `300.00` while its unpaid amount changes. Visit another account/invoice
ID and assert no disclosure. Log in a dual-role admin and verify admin finance
remains reachable without losing its regular workspace.

- [ ] **Step 3: Verify downloads, print layout, and small screens.** Use Playwright's download event to assert the `.html` filename and content, then verify UTF-8 Georgian labels and escaped account names. Use `page.emulateMedia({ media: "print" })` to confirm invoice visibility and hidden management controls. Run Axe checks on admin form, account summary, and invoice page; test keyboard form submission and mobile width without horizontal page overflow. Check no client/server console errors during these journeys.
- [ ] **Step 3a: Add the `@admin-performance` browser journeys in both locales/projects.** Log in as admin and verify Finance, Products, and Performance navigation. Check overview metrics, full date-range trend, explicitly scoped cash/current balances, and brand/creator account links. Products must show archived/zero-activity rows with default filters, honor brand/creator/status/date/search controls, sort deterministically, and paginate. Open a product and check creator rows and the back link's retained filters. Download product CSV from page 2 and prove it contains all 26 matching rows; then filter one brand and prove only that brand's products remain. Exercise overview, brand, creator, and product-detail CSV downloads, including Georgian names and exact GEL values. Direct regular-user page and export requests must fail. Run Axe/mobile overflow checks for report and product pages.
- [ ] **Step 4: Write the operator/developer guide.** Document local seed command, granting admin to an existing account, `/ka/admin/login` and `/en/admin/login`, optional platform invoice environment fields, generating both invoice directions, HTML download and browser PDF saving, recording external transfers, reversing a mistaken record, credits/overpayments, visible transaction notes, and the fact that linking an invoice does not allocate/pay it automatically. Include the exact formulas and the absence of automatic bank activity. Explain that invoice history is immutable and cancellation appears as a later correction. Link this guide from `docs/local-development.md`.

Also document `/admin/products`, `/admin/performance`, product creator breakdowns,
default/all-status catalog scope, reporting date semantics, account-wide versus
filtered performance metrics, and CSV download scopes/columns/10,000-row limit.
Explain that payment dates determine cash periods and that no per-product paid
balance is calculated. Describe the read-only nature of admin product inspection.

- [ ] **Step 5: Run the scoped and repository checks once the implementation is complete.**

```powershell
pnpm db:migrate:test
pnpm db:generate
pnpm test:unit
pnpm test:integration
pnpm typecheck
pnpm lint
pnpm verify:boundaries
pnpm verify:attribution-model
pnpm format:check
pnpm build
pnpm seed:finance
pnpm test:e2e src/test/e2e/finance.spec.ts
pnpm test:e2e src/test/e2e/admin-performance.spec.ts
```

Use the existing production-build Playwright configuration. Ensure any reused
server actually serves this build before treating the browser result as valid;
do not stop an unrelated local service to claim a clean run. Existing integration
tests use the guarded `_test` database. Do not use an environment switch to run
their truncation against the development database.

Expected: all checks pass, existing successful-sale behavior remains intact, and
the new browser journeys pass for both configured Playwright projects. If an
unrelated pre-existing checkout failure blocks a broad check, record the exact
failure separately, keep the finance-scoped evidence, and do not describe the
broad check as passed. Do not launch any bank transfer or deployment as part of
verification.

- [ ] **Step 6: Review the final diff and commit the fixture/guide/tests.** Use `git diff --check`, inspect the staged paths, and commit `test: verify manual finance journeys`. Report implemented behavior and actual test outcomes; do not report any planned test as executed.

## 6. Acceptance and handoff checklist

- [ ] Admin can sign in through its dedicated page; regular users cannot manage finance.
- [ ] Existing dual-role admin capability is honored on every read and mutation.
- [ ] Admin can generate a brand and creator invoice independently, on demand.
- [ ] Issued invoice contents remain fixed and have unique readable numbers.
- [ ] Owner/admin can download HTML and print/save the invoice as PDF.
- [ ] Payment forms prefill positive outstanding amounts and allow any positive representable replacement amount.
- [ ] Partial payments, prepayments, overpayments, no-invoice payments, and creator payouts before brand receipts are recorded successfully.
- [ ] Recording money reduces the right balance; generating invoices does not.
- [ ] Reversals restore balance exactly, retain history, and cannot be applied twice.
- [ ] Cancellation updates current earnings without deleting payments or rewriting invoices; later invoice corrections occur once.
- [ ] Duplicate submissions and concurrent issuance cannot duplicate financial effects.
- [ ] Home summaries remain independent of performance filters and link to full histories.
- [ ] Owner scoping covers account pages, invoice pages, and downloads.
- [ ] Admin navigation exposes Finance, Products, and Performance, with Finance remaining the login destination.
- [ ] Admin can inspect every product, including archived, unlinked, and zero-activity products, and open per-product creator breakdowns.
- [ ] Performance supports the approved date/brand/creator/product filters, stable sorts, pagination, and full-range trends without multiplying sales/commission.
- [ ] Period cash uses transfer dates; platform/account financial scopes are clearly labeled and never allocated to products.
- [ ] CSV downloads cover overview, brand, creator, product, and product-creator scopes, preserve filters/sort across all matching pages, and enforce the explicit size limit without silent truncation.
- [ ] Exported Georgian text, exact money, quoted values, and formula protection are verified, and direct nonadmin CSV requests are denied.
- [ ] English/Georgian desktop/mobile journeys and meaningful repository checks pass.
- [ ] No obsolete accounting business restrictions, worktree, unrelated refactor, or automatic bank action was introduced.

**Planning self-review:** Each approved behavior is covered by a task above.
The data model uses exact decimals and separates financial records from document
snapshots. The plan explicitly handles previously paid earnings, independent
invoice streams, concurrent generation, reversal, cancellation, and admin
capability on brand/creator viewers. Tasks 10 through 12 cover admin-wide product
and performance reporting, separate Products navigation, and filtered CSV exports;
Task 13 verifies the complete experience. This document authorizes no execution
by itself; implementation begins when requested.
