# Single-Link Attribution Design

**Status:** Approved design

**Decision date:** 2026-09-01

**Scope:** Corrects the attribution and agreed-rate model in the R1 design, delivery roadmap, and Phases 3–6 before Phase 5 is implemented.

## 1. Decision

SHUAMO uses direct, single-link attribution.

A tracking link permanently identifies one brand, one creator, one product, and the commission rate accepted when the link was created. Any number of creators may hold active links for the same product. There is no creator cap at the product, brand, or platform level.

The conversion flow is:

```text
creator's product link
  -> SHUAMO records a click
  -> SHUAMO redirects to the product's shop URL with ?xu=<clickId>
  -> customer purchases
  -> shop posts the successful sale with that click ID
  -> SHUAMO credits the link's creator for matching units of the link's product
```

Only the creator identified through the submitted click earns commission. The creator receives the full commission calculated from the link's agreed rate. Commission is never split with other creators who previously sent the same visitor.

If the submitted order does not contain the product connected to the link, the conversion is recorded but earns no commission.

## 2. Business rules

The following identifiers are stable and must be used in the R1 spec, roadmap, implementation plans, and test names.

| ID | Rule |
| --- | --- |
| `ATTR-001` | Any number of approved creators may promote the same product. |
| `ATTR-002` | One tracking link belongs to exactly one brand, creator, and product. |
| `ATTR-003` | The click ID submitted by the shop identifies the only creator eligible for that conversion. |
| `ATTR-004` | Only order lines for the tracking link's product earn commission. |
| `ATTR-005` | The eligible creator receives the full commission calculated from the agreed rate; commission is not split. |
| `ATTR-006` | A tracking link snapshots its commission type and value when created, and those terms are immutable. |
| `ATTR-007` | Changing a product's advertised rate affects new links only and never changes an existing link's rate. |
| `ATTR-008` | Replaying the same shop order cannot create a second conversion or a second commission. |
| `ATTR-009` | Disabling a link stops future redirects but does not invalidate a click already recorded while the link was active. |
| `ATTR-010` | Visitor cookies, fingerprints, other clicks, and click creditability do not select or add earning creators. |

## 3. Link authorization and rate agreement

The existing brand–creator partnership remains the simple authorization boundary. An `APPROVED` partnership allows that creator to create a link for an active product belonging to the brand. It does not automatically mint links for the brand's entire catalog.

The product's current commission type and value are the brand's offered terms. A creator accepts those terms by creating the product link. Link creation copies those values onto the new tracking link. The link row is therefore the durable agreement record; R1 does not need a separate campaign, negotiation, or rate-history subsystem.

An existing link never silently adopts a later product rate. To use newly agreed terms, the old link is disabled and a new link is created. Historical links remain stored so their clicks and attributions remain auditable.

At most one `ACTIVE` tracking link may exist for a given `(productId, creatorId)` pair, but any number of disabled historical links may exist for that pair. This is an active-link uniqueness rule, not a lifetime limit.

## 4. Data model correction

`Product.commissionType` and `Product.commissionValue` remain the currently advertised terms used when creating new links.

`TrackingLink` gains immutable snapshots:

```text
commissionType  RateType       NOT NULL
commissionValue numeric(9,4)  NOT NULL
```

The existing lifetime `UNIQUE (product_id, creator_id)` constraint is replaced by a PostgreSQL partial unique index covering active links:

```sql
CREATE UNIQUE INDEX tracking_link_one_active_product_creator
ON tracking_link (product_id, creator_id)
WHERE status = 'ACTIVE';
```

The forward migration backfills existing tracking links from their products before making the snapshot columns non-null. Existing migrations are not rewritten.

`Attribution` continues to store `clickId`, `creatorId`, `productId`, and the immutable calculated amount. One conversion item has at most one attribution row under this model.

`Conversion.splitDegraded` is removed. Cookie availability cannot degrade exact-link attribution because the cited click already identifies the earning link.

## 5. Runtime behavior

### 5.1 Link creation

Creating a link must verify:

- the brand and creator accounts are approved;
- their partnership is `APPROVED`;
- the product belongs to that brand and is active;
- no active link already exists for the creator and product; and
- the offered product rate is valid.

The write copies the product rate onto the new tracking link in the same transaction. Concurrent duplicate requests produce one active link.

### 5.2 Redirect and click recording

The redirect remains `GET /r/:code`. An active link records a click tied to that exact tracking link and redirects to the product's backlink URL with `?xu=<clickId>`.

The visitor cookie and fingerprint may remain for analytics and click deduplication. They do not participate in conversion attribution. A cited click remains attributable even if its click row is marked non-creditable by the redirect deduplication rule.

Disabling a link prevents later redirects. A click successfully recorded before disablement remains usable for the existing 30-day attribution window.

### 5.3 Conversion webhook

The authenticated brand posts an idempotent order containing the SHUAMO click ID and line items. Intake resolves:

```text
click -> tracking link -> creator + product + immutable rate
```

The click must belong to the authenticated brand, must exist, and must be no more than 30 days older than the reported sale. An absent, unknown, cross-brand, future, or expired click produces an `UNATTRIBUTED` conversion.

For an eligible click, the calculator examines only order lines matching the linked product within the authenticated brand's catalog. Other products are recorded as conversion items with zero commission and no attribution.

For each matching line:

```text
commissionable net = max(0, unit price * quantity - line discount - line VAT)

PERCENT commission = commissionable net * link commission value
FIXED commission   = link commission value * quantity
```

The line commission is rounded to 0.01 GEL using the existing exact-decimal money rules. The full result is assigned to the link's creator. There is no division or remainder distribution.

The calculated attribution is recorded when the successful sale webhook is accepted. Its amount is immutable. The existing confirmation, cancellation, ledger, and payout lifecycle may determine when that recorded amount becomes payable; it must never recalculate the link's agreed rate.

## 6. Pure calculator boundary

Phase 5 becomes a direct calculator whose conceptual input is:

```text
(citedLinkTerms, lineItems, linkedProduct) -> CalculationResult
```

It performs no I/O and decides only:

- which lines match the linked product;
- the commissionable net;
- the full commission from the link's immutable rate; and
- the single attribution for the link's creator.

It does not accept or select candidate clicks. Creator selection occurs before calculation by resolving the submitted click ID to its one tracking link.

## 7. Removed behavior

The following concepts are superseded and must be removed from active specifications, plans, production code, and assertions:

- equal split attribution;
- the limit of three earning creators;
- candidate-click selection for conversion attribution;
- visitor-scoped or brand-scoped creator sharing;
- cited-creator ordering and recency ordering;
- floor-and-remainder share distribution;
- a creator earning on products other than the product connected to their link; and
- `splitDegraded`.

The terms may remain only in an explicitly labelled historical or superseded-decision note.

## 8. Required proof

The corrected implementation must include tests named with the rule IDs above and prove at least:

- 100 creators can each hold an active link for one product (`ATTR-001`).
- A link resolves to one creator and one product (`ATTR-002`).
- Other clicks by the same visitor do not receive attribution (`ATTR-003`, `ATTR-010`).
- A product-A link earns zero when the order contains only product B (`ATTR-004`).
- A mixed cart pays only matching product-A lines (`ATTR-004`).
- One matching line produces one attribution containing the full commission (`ATTR-005`).
- Fixed commission multiplies by matching quantity, and percent commission uses matching net (`ATTR-005`).
- A product rate change leaves an existing link's stored rate and resulting commission unchanged (`ATTR-006`, `ATTR-007`).
- Disabling an old link and creating a new one allows new terms while preserving old click attribution (`ATTR-006`, `ATTR-007`, `ATTR-009`).
- Replaying a webhook returns the original result without another write (`ATTR-008`).
- A non-creditable cited click still attributes to its exact link (`ATTR-010`).
- Unknown, cross-brand, future, and expired click IDs produce `UNATTRIBUTED` conversions.
- Every money assertion compares exact decimal strings.

Repository verification must also search active docs and source for stale implementations such as `selectCreators`, `distributeShares`, `.slice(0, 3)`, and `splitDegraded`. Behavioral tests remain the primary enforcement; the search is a drift detector.

## 9. Synchronization order

After this design is accepted, repository documents are updated in this order:

1. Amend the R1 design so it remains the canonical complete product specification.
2. Amend the delivery roadmap's global invariants, phase dependency graph, Phases 3–7, and recorded decisions.
3. Add a forward-only attribution-model correction plan for the already completed Phase 3 schema and link behavior.
4. Mark the current Phase 5 split-attribution plan as superseded and replace it with the single-link calculator plan.
5. Amend the Phase 6 conversion plan and its database invariants.
6. Search the later reporting and accounting plans for split-specific assumptions and correct their terminology and cardinality expectations.

The roadmap must make the correction a prerequisite of Phase 5 so a later implementation agent cannot execute the obsolete split plan first.

## 10. Non-goals

R1 does not add campaigns, negotiation chat, rate ranges, weighted multi-touch attribution, coupon attribution, view-through attribution, or a general rate-versioning subsystem. The immutable tracking link is the agreement and the historical rate record.
