# Phase 6 — Conversions API & Order Lifecycle Implementation Plan

> **Corrected on 2026-09-01.** This future plan consumes the exact-link
> calculator delivered by mandatory Phase 4.5. It must not recreate the former
> multi-creator attribution model.

## Contract

The authenticated brand posts an idempotent order with one optional SHUAMO
click ID and its line items. Infrastructure resolves only that submitted click:

```ts
interface ResolvedConversionClick {
  readonly clickId: string;
  readonly brandId: string;
  readonly occurredAt: Date;
  readonly creatorId: string;
  readonly productId: string;
  readonly sku: string;
  readonly rate: Rate;
}
```

The resolver rejects absent, unknown, cross-brand, future, and expired clicks
as `UNATTRIBUTED`. A cited click recorded while its link was active remains
eligible after the link is disabled. Its `creditable` value, visitor cookie,
fingerprint, and every other click are irrelevant to creator selection
(`ATTR-003`, `ATTR-009`, `ATTR-010`).

The resolved database row maps to the calculator public contract exactly:

```ts
const link: CitedLinkTerms = {
  clickId: row.clickId,
  brandId: row.brandId,
  creatorId: row.creatorId,
  productId: row.productId,
  sku: row.sku,
  rate: row.commissionType === "PERCENT"
    ? Rate.percent(row.commissionValue)
    : Rate.fixed(row.commissionValue),
};
```

The calculator receives this one link plus line items. Only matching product
lines earn, and each matching conversion item receives at most one attribution
for the link creator, containing the full amount from the immutable link rate
(`ATTR-004`, `ATTR-005`, `ATTR-006`, `ATTR-007`). Infrastructure, not the pure
calculator, owns click lookup and the 30-day window.

## Persistence and lifecycle

- Preserve `(brand_id, order_id)` idempotency. The same payload returns the
  original result; a changed replay returns 409 (`ATTR-008`).
- Persist conversion, items, the zero-or-one attribution per item, and the cited
  click's first `converted_at` timestamp in one transaction.
- Attribution amounts are immutable after insert. Confirmation, cancellation,
  reporting, ledger, and payout code never recalculate them.
- `UNATTRIBUTED` conversions remain visible and contain no attribution rows.
- Keep authentication, timestamp validation, audit events, pending-order queue,
  confirmation, and cancellation behavior from the R1 design.

## Required tests

- `ATTR-003 attributes only the creator resolved from the submitted click`
- `ATTR-008 replays one shop order without another conversion or commission`
- `ATTR-009 attributes a recorded click after its link is disabled`
- `ATTR-010 does not reject the cited click when creditable is false`
- unknown, cross-brand, future, and expired clicks produce `UNATTRIBUTED`
- product-A click with only product B pays zero
- mixed cart pays only matching product-A lines
- existing click retains its snapshotted rate after the product rate changes
- every money assertion compares exact decimal storage strings
- database invariant: at most 1 attribution row per conversion item

## Completion gate

The API is complete when replay safety, exact-click resolution, immutable
amounts, lifecycle transitions, PostgreSQL invariants, route contracts, and
the end-to-end click-to-conversion journey pass without querying any other
visitor activity.

## Completion checklist

- [x] `pnpm verify:phase-6` passes, including every inherited phase gate.
- [x] Bearer authentication, `Origin` rejection, payload/timestamp validation,
      and every documented response status have route-contract coverage.
- [x] The immutable request fingerprint makes identical sequential and
      concurrent retries free while changed payloads, including `clickId`,
      return 409 independently of later brand VAT changes.
- [x] Exact submitted-click resolution covers absent, unknown, cross-brand,
      future, expired, disabled-link, and non-creditable cases.
- [x] Mixed carts commission only matching SKUs at the link's immutable rate;
      stored money is asserted as exact decimal strings.
- [x] Conversion, items, attributions, and the click's first `converted_at` are
      persisted atomically, with at most one attribution per item and immutable
      commission amounts.
- [x] Confirmation and cancellation obey the whole-order state table and write
      an audit event in the same transaction without recalculating money.
- [x] Both locales expose the brand queue, unattributed orders, pending-age
      escalation, and creator earnings; desktop and mobile Playwright journeys
      pass with zero WCAG 2.2 AA axe violations.
- [x] The 200-request conversion latency check passes: p95 **19.61ms** against
      the **200ms** budget on 2026-09-02.
- [x] Independent review and closure review report no remaining critical, high,
      or medium findings.
