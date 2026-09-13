# Simple invoices and manual payment recording

**Date:** 2026-09-13
**Status:** Product design approved by the user, including admin Products, Performance, and CSV downloads; implementation plan requested.
**Implementation plan:** [Simple manual finance](../plans/2026-09-13-simple-manual-finance-implementation.md).

## Purpose

Use the commissions the app already calculates to show what brands owe and what
creators are owed. Admin generates invoices on demand and records bank transfers
after managing them outside the app. These records reduce the appropriate
outstanding balance and appear on the brand or creator's main page.

Admin also has a platform-wide Performance page to review sales, commissions,
cash movements, and product results across every brand and creator.

The app does not initiate transfers, verify bank activity, or decide whether a
payment should happen. Admin is responsible for those decisions.

## Decisions confirmed in the conversation

- Generate invoices when admin clicks **Generate invoice**, not on a schedule.
- Reuse existing authentication and the `AppUser.isAdmin` capability.
- Add a dedicated admin login and a protected finance management page.
- Prefill payment amounts from outstanding balances, but allow admin to change
  them and record partial payments, prepayments, or overpayments.
- Allow creator payouts before any corresponding brand payment, and allow
  recording payments without invoices.
- Invoice generation does not change balances. Payment recording does.
- Preserve earned commission separately from the creator's remaining unpaid
  balance.
- Keep invoices and payment history visible to their owning brand or creator.
- Correct a payment record by reversing it and recording a replacement.
- Add admin Performance with Overview, Brands, Creators, and Products tabs,
  including product detail with trends and creator breakdowns.
- Provide dedicated Products and Performance navigation and CSV downloads of
  the displayed report scope across all matching rows.

## Relationship to previous plans

For this release, this design and its implementation plan replace the accounting
implementation scope in the August 29 R2 design and phases 8 through 11. Those
documents remain historical references, not prerequisites for this feature.

Keep the September 5 successful-sale behavior: confirmed successful sales earn
commission immediately, canonical attribution identifies the earning creator,
and cancellation removes commission from current earned totals.

Replace the future accounting requirements for billing periods, scheduled close,
brand invoice approval, funded commission release, accrued/available/in-transit
buckets, payout minimums, and payout instruction states. Do not implement any of
those restrictions for this release. Do not add fees, taxes, withholding, or new
commission calculations from the historical plans.

## Pages and actions

### Admin access

Use `/{locale}/admin/login`, with the existing Better Auth email/password form.
Successful admin login goes to `/{locale}/admin/finance`. Admin access is checked
on the server for every finance mutation and every admin read. An approved brand
or creator account with `isAdmin: true` also has admin access. Public registration
must never grant this capability.

A provisioning script can grant the capability to an existing authenticated
account. A separate local development seed creates a working demo administrator.
Do not assume a real administrator already exists just because the schema has
the flag; do not invent or publish real credentials.

### Finance management

One page has **Brands**, **Creators**, and **Transactions** tabs. Brand/creator
lists show name, current outstanding amount, and actions to open their account,
generate an invoice, or record a payment. Show all accounts to admin, regardless
of partnership or account approval status.

An account detail shows the all-time earned obligation, net recorded payments,
remaining balance, issued invoices, and transaction history. Admin can generate
an invoice or record a payment from here.

The payment form contains the selected account, an editable amount, transfer
date, optional bank reference, optional note, and optional invoice association.
Prefill a positive outstanding amount; if the balance is zero or a credit, leave
the amount empty. Default the transfer date to today in `Asia/Tbilisi`. Describe
the action as recording an external payment; submitting it sends no money.

### Admin performance

Admin navigation has **Finance**, **Products**, and **Performance**. Products
opens `/{locale}/admin/products`; Performance opens `/{locale}/admin/performance`.
Finance remains the login destination. All sections use the same admin capability;
Performance is a read-only report with links to financial account management.

The Performance page has **Overview**, **Brands**, **Creators**, and **Products**
tabs; the Products tab opens the dedicated Products page, reusing the same report
components and filters. Default the date range to the current month to date in `Asia/Tbilisi`.
Support a custom inclusive date range, brand and creator filters, and product
name/SKU search and status filters on the Products tab. Filters persist in the
URL. Sort and paginate results on the server, 25 rows per page.

The overview shows attributed confirmed sales count and value, earned creator
commission, and a sales/commission trend. Sales value uses the existing
commissionable-net reporting definition for the attributed product, rather than
the whole order value or the product's current catalog price. Click counts use
creditable clicks, as existing reporting does. Cancellations remove the sale and
commission from those totals. No historical snapshot/as-of accounting is implied.

A separate **Platform payments** summary shows brand payments received and creator
payouts for the selected transfer dates. These platform-wide cash totals ignore
brand/creator/product filters; label that scope explicitly. Corrections net against
the original transfer date, so recording a reversal today corrects the affected
historical period. Do not label collected brand payments as platform revenue.

**Current platform balances** shows all-time positive brand outstanding and unpaid
creator amounts, with credits/creator overpayments separately visible. These
figures ignore performance filters and the date selection. Never offset one
account's debt against another account's credit when presenting the amount to
collect or pay.

Brand rows show name, attributed sales, earned commission, period payments
received, and current account outstanding. Creator rows show name, attributed
sales, commission earned, period payouts, and current unpaid balance. Clicking a
name filters the admin report to that account, with a separate link to its finance
account. Each row's cash and balance fields cover the whole account, including
when another performance filter narrows its attributed sales. Label the financial
columns as account-wide; do not infer pairwise brand-to-creator funding.

The Products tab covers the entire catalog by default, including products with
no links, no sales, disabled links, and archived products. It shows product,
brand, status, creditable clicks, attributed confirmed sales, sales value, and
creator commission. Admin can filter by brand, creator, date, or product status,
search product name/SKU, and sort by sales count, sales value, clicks, or commission.
With a creator filter, include products that creator has a tracking link for,
even if the link has no activity or is disabled. Other products remain visible
when that filter is cleared. Account/partnership approval does not hide history.

Clicking a product opens `/{locale}/admin/products/{id}`, showing the
product identity/status, selected-period metrics, a sales/commission trend, and
results per creator. Include linked creators with zero activity. Brand, creator,
date, search, sort, and pagination state survive navigation back to the product
list. Archived products remain readable. An unknown product is a 404.

Payments and balances do not appear as product metrics: this release does not
allocate transfers to products. Product and account reports introduce no new
financial mutation, transfer rule, or admin permission category.

### Admin CSV downloads

Provide **Download CSV** on the Performance overview, brand/creator breakdowns,
Products page, and product detail. Overview exports the summary; other views
export their tabular rows, including product detail's creator breakdown. A brand
filter on Products lets admin download product performance for a particular brand.

Exports preserve selected dates, brand/creator filters, product status, search,
and sort. Export every matching row, not only the visible page. Product downloads
include product/brand identifiers, names, SKU, status, clicks, attributed sales,
sales value, commission, and the selected reporting dates. Brand/creator exports
include the respective account identifiers, commercial metrics, period account
payments, and all-time account balance with explicit column labels. Overview
exports distinguish filtered commercial metrics, platform period cash, and
current platform balances. Do not include bank details, private notes, or any
inferred product payment allocation.

Use UTF-8 with a BOM so Georgian names open correctly in spreadsheet software,
stable English column headings, exact two-decimal GEL values, proper quoting,
and spreadsheet-formula protection for user-provided text. Admin authorization
also applies to direct export requests; mark responses private and noncacheable.
Use a 10,000-row limit with a clear request to narrow filters when exceeded;
never silently truncate a download or export only the current page.

### Invoice generation

Admin previews and generates an invoice for one brand or one creator. A brand
invoice describes the brand's obligation to the platform. A creator invoice
describes the platform's obligation to the creator, not a request for the creator
to pay the platform.

The preview includes the account, commission lines not previously invoiced,
total in GEL, invoice date, and editable document party/payment details. Prefill
available account names and creator payout details. Platform payment details
come from optional server configuration and can be completed in the preview.
Missing bank details do not prevent recording a payment.

Issuing stores a fixed snapshot, a unique readable invoice number, issue time,
and issuing admin. Later profile edits, payments, or cancellations do not change
that issued document. Each account has an independent invoicing history: issuing
a brand invoice does not consume the creator's invoice lines.

V1 provides an authenticated invoice detail, a self-contained HTML invoice
download, and browser **Print / Save as PDF**. There is no new server PDF service,
document storage service, or automatic email delivery.

Invoices describe newly invoiced commission, not a second balance calculation.
If a payment was recorded before invoicing, show the current account balance
alongside the invoice list/detail as separate live information; do not silently
allocate that payment or change the invoice's commission total. An optional
invoice link on a payment is a reference, not an automatic settlement workflow.
There is no invoice paid/unpaid state in this version.

### Main pages

Add to the active brand and creator home layouts a money summary, the five most
recent transactions, and the five most
recent invoices, with links to full paginated histories. These finance totals
are all-time and independent of the performance dashboard's date/product filters.
The active `WorkspaceOverview` export currently lives in `insight-overview.tsx`;
the older coming-soon panel in `workspace-overview.tsx` is not the active home.

Brands see **Amount outstanding**, **Payments received**, and **Credit** when
appropriate. Creators see **Unpaid earnings**, **Paid to you**, and **Paid above
current earnings** when appropriate. Historical earnings remain available in the
existing performance view.

## Amount and history rules

All amounts use exact GEL decimals. Define:

```text
earned obligation = sum of eligible confirmed canonical commission snapshots
net recorded payments = sum of payment records - sum of their reversals
outstanding = earned obligation - net recorded payments
```

Calculate this per brand or creator across all time. A negative outstanding
amount is a visible credit or overpayment, never clamped to zero. No minimum,
brand-funding, account-status, or sufficient-balance rule limits payment entry.

Example: brand obligation 1,000 GEL, recorded receipt 600 GEL, outstanding 400
GEL. Creator obligation 300 GEL, recorded payout 200 GEL, unpaid 100 GEL. Invoice
generation leaves these figures unchanged. Reversing the creator payment restores
unpaid earnings to 300 GEL without deleting the original payment.

Cancellation automatically affects the current obligation through existing sale
status. It neither deletes nor automatically reverses a real payment. If the
earning was previously invoiced, the next invoice includes a negative correction
line; if it was never invoiced, it contributes no line. Preserve credits after
cancellation, including cancellation after a payout. Admin manages any real
recovery outside the app.

For invoice lines, use the difference between the current eligible amount for
an attribution and the sum already invoiced for that attribution to this account.
This avoids duplicate invoicing and preserves prior documents. Signed correction
lines and zero/negative totals are allowed when there are actual new lines. An
empty preview shows **Nothing new to invoice** instead of creating a document.

## Record integrity and permissions

Admin responsibility does not remove authentication, account ownership checks,
valid decimal/date formats, or protection against duplicate form submissions.
Accept any positive representable payment amount. References are optional and
not unique: two real transfers can have the same amount and bank reference.

A payment records its account, amount, transfer date, bank reference, note,
recorded time, and admin. A reversal is a separate row linked to one original
payment, copies its account and amount, and requires a correction reason. Reverse
each original at most once. A reversal corrects the app record; it is not a new
bank transfer. Both rows stay visible.

Store record changes and their audit event in one database transaction. Replayed
submissions return the original result; reusing a submission key with different
input reports a conflict. Concurrent invoice generation must not invoice the
same outstanding lines twice.

Brand/creator reads are scoped from the authenticated account, including invoice
downloads. Do not expose other creators' bank details to brands or other brands'
details to creators. A transaction note is visible to the account owner; label the
admin field accordingly. Internal audit payloads remain admin-only.

## Verification

Cover exact balances, partial payments, prepayments, overpayments, payouts before
brand receipts, payment without invoice, reversal, cancellation before/after
invoice and payment, immutable documents, independent brand/creator invoicing,
submission retries, concurrent invoice generation, and cross-account access.
Check the complete admin-to-brand-to-creator journey in English and Georgian on
desktop and mobile, including downloaded/printed invoice content.

Verify admin performance across multiple brands/creators, zero-activity and
archived products, attribution/cancellation semantics, date boundaries, sorting,
pagination, product creator breakdowns, and regular-user access denial. Product
totals must not multiply when a product has multiple links, clicks, or order
items. Verify the explicit separation of filtered performance, account-wide
payments, and current platform balances.
Verify filtered CSVs contain all matching rows across pages, preserve Georgian
text and numeric precision, escape spreadsheet formulas, and reject nonadmins.

Implementation must work in the primary checkout and preserve unrelated work,
as required by the repository's `AGENTS.md`.
