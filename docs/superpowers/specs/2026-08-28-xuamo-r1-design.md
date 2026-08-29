# XUAMO — MVP Design (Tracking Spine)

**Date:** 2026-08-28
**Status:** Approved for planning
**Scope:** MVP only. Everything else is listed in §2 as deferred, with the release it belongs to.

---

## 1. Product summary

XUAMO is a B2B creator-performance platform for the Georgian market. Brands publish a product
catalog; creators partner with a brand and receive one tracking link per product; buyers click
through to the brand's own online store and purchase there. XUAMO measures which creator drove which
sale and what commission is owed.

The buyer never transacts on XUAMO. XUAMO holds no cart, no checkout, and no buyer account.

The whole model is four nouns:

```
Brand ──partners with──▶ Creator ──gets a link for──▶ Product ──▶ Click ──▶ Conversion
```

There is no campaign. A creator is approved by a brand once, and from then on has a link for every
active product in that brand's catalog. The rate lives on the product.

### 1.1 What the MVP has to prove

That a click can be tied to a sale, and that the resulting commission is correct. Nothing else. If
attribution is wrong, no amount of invoicing, payouts, or dashboards built on top of it is worth
anything — which is why the calculator in §6.3 is the only part of this document that is not
simplified.

Two product decisions survive the cut because they define what XUAMO *is*:

| Decision                                                                                | Why it stays                                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commission is split equally among up to 3 creators whose creditable clicks fall in the window | Explicit product decision. Last-click-wins would be simpler and is a different product. This is the single largest source of remaining complexity, and it is deliberate. |
| A XUAMO-hosted "offer ended" page for disabled links                                    | A dead link has to explain itself to the buyer and to the creator who posted it. Active links still 302 straight through, so a working link never shows a XUAMO page.    |

### 1.2 Accepted risks

1. **Click-ID persistence depends entirely on the brand's developer.** The brand's site must capture
   `?xu=` on landing, persist it through checkout, and echo it in the postback. With the integration
   self-test deferred (§2), the only mitigation is hand-held onboarding — viable at 1–2 brands and
   nothing beyond that.
2. **A leaked API key allows fabricated conversions.** The key is a static bearer token, shown once
   and stored as a hash. There is no HMAC signing and no rotation: a compromise means an
   administrator regenerates the key and the brand redeploys.
3. **Rate changes affect clicks that have not converted yet.** There is no rate history (§4). A
   calculated commission is frozen the moment it is written, but a click sitting inside its 30-day
   window will earn at whatever rate is current when the order lands. The operational rule is to
   archive a product and publish a new SKU rather than edit a live rate.
4. **Split credit is brand-scoped, not product-scoped.** A creator who sent a visitor to the brand
   shares in every line of that visitor's order, including products they never promoted. This is the
   direct consequence of dropping campaigns (§4.6) and it is the widest of the reasonable readings.
   §6.3 notes the one-line change that narrows it.
5. **Pending orders never expire.** No auto-approve. A brand that stops confirming freezes creator
   earnings indefinitely. In-app reminders only.
6. **Visitor cookie and click fingerprint require legal review.** The cookie is first-party and
   functionally necessary for split attribution, but is still a tracking cookie for any EU visitor.
   The `fpHash` derived from IP and User-Agent (§6.1) is *pseudonymous, not anonymous* — hashing does
   not move it outside GDPR or the Georgian personal data law. Non-code task before pilot.
7. **Postgres is a hard dependency of the redirect.** No cache, no queue (§3.4). A failed click write
   still 302s to the brand's store without `?xu=`, so the sale is never blocked — but it goes
   unattributed. §11.1 is the exit.
8. **No money movement.** The MVP measures and reports. Brands and creators settle off-platform
   against a CSV. Everything in §8 is R2.

---

## 2. Scope boundary

**In scope:**

- Brand and creator accounts, both approved by an administrator
- One user per brand
- Product catalog: title, description, price, ordered image URLs, backlink URL, commission rate
- Brand ↔ creator partnership: Apply / Invite with Approve / Reject
- One tracking link per creator per product, minted on approval
- Redirect service with the disable chain
- Click recording, cookie and fingerprint deduplication, and per-click conversion state
- One API key per brand for the conversion postback
- `POST /v1/conversions` — server-to-server, the only conversion path
- Per-line-item split attribution across up to 3 creators
- Confirm / Cancel by brand at whole-order level
- Link detail view (§7.2) and creator earnings dashboard
- Per-brand monthly CSV export of confirmed commissions
- `ka` and `en` locales, both complete

**Deferred.** None of this is lost; each row records what replaces it and where it lands.

| Cut                                                                      | MVP substitute                                             | Returns in |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| **Campaigns and campaign products**                                      | Partnership is brand-wide; the rate lives on the product   | R2         |
| **Campaign start/end dates that auto-disable links**                     | Archive the product, or disable the link                   | R2         |
| Brand domain verification (DNS TXT, `/.well-known/`)                     | Administrator approves the brand and eyeballs the backlink | R2         |
| Brand team members and `OWNER`/`MEMBER` roles                            | One user owns one brand                                    | R2         |
| Creator social bio-code ownership proof, self-reported reach             | Administrator approves the creator                         | R3         |
| Image upload and hosting, `specs` jsonb                                  | Up to 8 brand-hosted image URLs, plus the description      | R2         |
| Browser pixel endpoint, public site keys, the pixel/postback trust model | Server postback only                                       | R2         |
| API key rotation with overlap, `RETIRING` state, `lastUsedAt`            | One key; an administrator regenerates it                   | R2         |
| Integration self-test gate, `TEST` links, `isTest` conversions           | Hand-held onboarding on a real link                        | R2         |
| Conversion delivery log and the Developers tab diagnostics               | Structured server logs, read by the operator               | R2         |
| Rate version history and as-of resolution                                | Current rate on the product (§1.2 risk 3)                  | R2         |
| Order-level totals, reconciliation warnings, pro-rata discount allocation | Line items only                                            | R2         |
| Separate `Idempotency-Key` header                                        | `orderId` is the idempotency key                           | —          |
| Click country, parsed device (OS, browser, form factor)                  | Salted IP+UA hash, for deduplication only                  | R3         |
| Platform fee, VAT invoicing, accrual ledger, month-close                 | CSV export                                                 | R2         |
| Creator payout accounts with admin verification, payout batches          | Three nullable columns on the creator, unused              | R2         |
| Email, `ru` locale, bot filtering, HMAC signing, public directories      | —                                                          | R3         |
| Card payments, PSP, bank APIs, multi-currency, buyer accounts            | —                                                          | Never      |

Approvals happen by seed script and direct database access. There is no admin UI. This is workable
only because the MVP targets a pilot of 1–2 brands.

---

## 3. Decisions register

### 3.1 Tracking and attribution

| Decision             | Value                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Conversion reporting | Server-to-server postback only. No pixel, no platform plugin                                                     |
| Visitor identity     | First-party cookie `xu_vid` on the XUAMO redirect domain, 30 days                                                |
| Attribution model    | Equal split among up to 3 creators whose creditable clicks on **the same brand** fall in the window              |
| Window               | 30 days before the order                                                                                         |
| Rounding             | Line commission rounded to 0.01 GEL, then floored per share; leftover tetri handed out one each in recency order |
| Granularity          | Per line item, not per order                                                                                     |
| Commissionable value | Line total after line discount, net of line VAT                                                                  |
| Rate resolution      | The rate currently on the product, read at conversion time. No history (§1.2 risk 3)                             |
| Deduplication        | Same visitor, same link, within 30 minutes → one creditable click. With no cookie, same fingerprint              |
| Click fingerprint    | `sha256(ip ‖ user-agent ‖ daily salt)`. A dedup signal only; never widens the §6.3 candidate set                 |
| Click conversion state | Each click carries `convertedAt`, stamped the first time it earns commission                                   |
| No-cookie fallback   | Single-click attribution, `splitDegraded` set                                                                    |
| Buyer PII            | Nothing raw. A click keeps a cookie id and a salted hash; no IP or User-Agent at rest                            |
| Idempotency          | `orderId` is the key. Same brand and order, same payload → the original result; different payload → 409          |
| Brand credential     | One static secret `xu_sk_` per brand, shown once at generation, stored as a hash                                 |

### 3.2 Catalog and partnerships

| Decision                | Value                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| Product source          | Brand-uploaded catalog, each product linking to the brand's own store page                  |
| Commission rate         | Per product, percent or fixed. Set by the brand, changeable, not versioned                  |
| Catalog price           | Display-only; drives the creator-facing estimate. Real commission always from the postback  |
| Product deletion        | Archive only                                                                                |
| Partnership model       | Creator applies to a brand or is invited. Approval grants a link for every active product   |
| Link minting            | Automatic on approval, and for any product the brand adds afterwards                        |
| Disable scopes          | Single link · partnership · product · brand                                                 |
| Disabled link behaviour | XUAMO "offer ended" page                                                                    |
| In-flight clicks        | Clicks recorded before a disable stay creditable through their full 30-day window           |

### 3.3 Commercial

| Decision       | Value                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Money          | XUAMO moves none of it in the MVP. Brand and creator settle off-platform against the CSV (§7.4) |
| Currency       | GEL only                                                                                       |
| VAT            | Line VAT is supplied by the brand, or derived at 18% if the brand is VAT-registered            |
| Confirmation   | Manual by brand, whole order. No auto-approve                                                  |
| Billing period | Calendar month, Asia/Tbilisi, bucketed by confirmation date                                    |
| Platform fee   | R2, with invoicing. Not modelled here                                                          |

### 3.4 Trust and stack

| Decision           | Value                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Marketplace access | Curated. An administrator approves every brand and every creator                         |
| Fraud controls     | Click deduplication only — by cookie, falling back to fingerprint when none is set       |
| Market             | Georgia                                                                                  |
| Locales            | `ka` and `en`, both complete. No string ships untranslated                               |
| Team assumption    | Solo, AI-assisted, no hard deadline                                                      |
| Stack              | Next.js (App Router) · PostgreSQL · Prisma · Caddy · Docker Compose on a self-hosted VPS |

**PostgreSQL is the only datastore, and the only stateful service.** No Redis, no object storage, no
queue. The redirect reads and writes Postgres synchronously (§6.1) and the worker is a scheduler.
Redis is the designed answer to scale, not a dependency the pilot carries in advance (§11.1). No edge
network either, so VPS region is the entire latency story.

---

## 4. Domain model

Eleven tables. Two rules keep it there:

1. **Nothing derivable is stored** — with three named exceptions, each justified below:
   `ConversionItem.commissionableNet`, `Attribution.commissionAmount`, `Click.brand`, and
   `Click.convertedAt`.
2. **A feature that is not in §2 has no column.** Where an earlier draft had a table for something an
   administrator can do by hand at two brands, the table is gone.

This section is the readable model; **Appendix A is the same model as executable PostgreSQL DDL**.
Every field below maps one-to-one onto a column there.

### 4.1 Tables

Every table has `id uuid pk` and `createdAt ts` unless stated. Notation: `→X` foreign key, `?`
nullable, `✦` unique. Types: `ts` = `timestamptz`, `gel` = `numeric(12,2)`.

```
User          email:text✦  passwordHash:text  locale:text  isAdmin:bool

Brand         user:→User✦  name:text  vatRegistered:bool
              keyPrefix:text✦  keyHash:text  status:ApprovalStatus

Creator       user:→User✦  displayName:text  bio:text  status:ApprovalStatus
              payoutBank:text?  payoutIban:text?  payoutName:text?  collected, unused until R2

Partnership   brand:→Brand  creator:→Creator  status:PartnershipStatus   ✦(brand,creator)

Product       brand:→Brand  sku:text  title:text  description:text  priceGel:gel
              imageUrls:text[]  backlinkUrl:text
              commissionType:RateType  commissionValue:numeric(9,4)
              status:ProductStatus                                       ✦(brand,sku)

TrackingLink  product:→Product  creator:→Creator  code:text✦
              status:LinkStatus                                          ✦(product,creator)

Click         id:text pk (ck_…)  trackingLink:→TrackingLink  brand:→Brand
              visitorId:uuid?  fpHash:text?  occurredAt:ts  creditable:bool  convertedAt:ts?

Conversion    brand:→Brand  orderId:text  occurredAt:ts
              status:ConversionStatus  confirmedAt:ts?  splitDegraded:bool  ✦(brand,orderId)

ConversionItem  conversion:→Conversion  sku:text  qty:int  unitPrice:gel
                lineDiscount:gel  lineVat:gel  commissionableNet:gel

Attribution   conversionItem:→ConversionItem  click:→Click  creator:→Creator
              product:→Product  commissionAmount:gel        ✦(conversionItem,creator)

AuditEvent    actor:→User?  action:text  entityType:text  entityId:uuid
              changes:jsonb  at:ts
```

### 4.2 The four columns that need justifying

**`Product.commissionType` / `commissionValue`.** The rate lives on the product because there is
nothing else for it to live on. `PERCENT` is a fraction (`0.125`, not `12.5`) and `FIXED` is an
absolute GEL amount per unit, which is why the column needs four decimal places where money needs
two. Changing it changes what un-converted clicks will earn (§1.2 risk 3); already-written
`Attribution.commissionAmount` is never recomputed.

**`Click.brand` is a deliberate denormalisation.** Brand-filtering candidate clicks is a correctness
requirement (§6.3), not an optimisation — without it, a SKU string shared by two brands attributes
one brand's order to the other. Without the column, that filter is a two-table join on the
calculator's hottest query. The redirect's own lookup already has the brand in hand, so writing it is
free.

**`Click.convertedAt` is a deliberate denormalisation**, added because "did this click convert, and
when?" is the question the link view (§7.2) is built around, and answering it through
`Attribution → ConversionItem → Conversion` is three joins on the busiest table in the schema. It is
set to the *order's* `occurredAt` the first time that click earns an attribution, and never cleared —
not on cancellation, because the click did convert; the money state lives on the conversion. A click
that earns on several orders keeps the first; the full set is still reachable through `Attribution`.

**`Attribution.product` records which catalog row produced the amount.** It is *nearly* derivable
from `ConversionItem.sku` plus the brand, but that derivation goes through a free-text SKU string,
and this column is the audit link between a paid amount and the rate that produced it.

### 4.3 Enums

```
ApprovalStatus     PENDING · APPROVED · SUSPENDED       (Brand, Creator)
PartnershipStatus  PENDING · APPROVED · REJECTED
ProductStatus      ACTIVE · ARCHIVED
RateType           PERCENT · FIXED
LinkStatus         ACTIVE · DISABLED
ConversionStatus   PENDING · CONFIRMED · CANCELLED · UNATTRIBUTED
```

Six. `UNATTRIBUTED` is a `ConversionStatus` rather than a separate resolution column: a conversion
whose click did not resolve has no attributions to confirm, so the two were never independent axes.
There is no pending-resolution state, because §6.1 commits the click before the redirect returns.

### 4.4 Relationships

```
User ─┬─1:1 Brand ─┬─< Product ─< TrackingLink >─ Creator
      │            ├─< Partnership >─ Creator
      │            ├─< Click                          denormalised owner
      │            └─< Conversion ─< ConversionItem ─< Attribution
      │
      └─1:1 Creator ─< Attribution

TrackingLink ─< Click
Attribution  ─→ Click       the earning click
Attribution  ─→ Product     the rate that produced the amount
AuditEvent   ─→ User?       free-floating; no FK to the entity it describes
```

`TrackingLink` is the join of Product and Creator, so a link already carries brand, product, and
creator without a fourth table. `Partnership` is the gate that permits the link to exist; it is not
in the click path.

`Conversion` has no edge to the click cited in `?xu=`. That click is resolved at intake (§6.2 step
4), handed to the calculator, and discarded. `Click.convertedAt` does not record it either — it is
stamped only on *earning* clicks, and a cited click may earn nothing. The single stored `Click` edge
is `Attribution`'s: one of the up-to-three that actually take a share.

The cost is an audit gap, and it is real. A creator's most recent candidate click is not always the
one cited, so `Attribution` does not reliably recover it, and an `UNATTRIBUTED` conversion has no
`Attribution` rows at all. "The brand sent no `xu`" and "the brand sent a 31-day-old `xu`" are
therefore indistinguishable after the write — which is §1.2 risk 1 losing its only forensic trace.

### 4.5 Keys, indexes, retention

```
UNIQUE  Brand (userId)                             one brand per user
UNIQUE  Brand (keyPrefix)                          bearer token lookup
UNIQUE  Partnership (brandId, creatorId)
UNIQUE  Product (brandId, sku)                     SKUs are brand-scoped; two brands may use P-9
UNIQUE  TrackingLink (code)                        the redirect lookup — §6.1
UNIQUE  TrackingLink (productId, creatorId)        one link per creator per product
UNIQUE  Conversion (brandId, orderId)              idempotency and double-billing, one constraint
UNIQUE  Attribution (conversionItemId, creatorId)  a creator earns once per line

INDEX   Click (brandId, visitorId, occurredAt desc) where creditable  candidate clicks — §6.3
INDEX   Click (trackingLinkId, fpHash, occurredAt desc)               fingerprint dedup — §6.1
INDEX   Click (trackingLinkId, occurredAt desc)                       link view counters — §7.2
INDEX   Click (trackingLinkId) where convertedAt is not null          converted clicks — §7.2
INDEX   Conversion (brandId, status, confirmedAt)                     orders queue, CSV — §7.1, §7.4
INDEX   Attribution (creatorId)                                       creator earnings — §7.3
INDEX   Attribution (clickId)                                         click → orders drill-down
```

All money is `numeric`, never a float. `Click` is the only table that grows with traffic; it is
retained in full for 13 months and aggregated thereafter. Nothing is ever hard-deleted.

### 4.6 Invariants

- `Σ Attribution.commissionAmount` over one `ConversionItem` equals that item's computed commission
  exactly
- `Attribution.commissionAmount` is written once and never recomputed. Confirming or cancelling
  changes `Conversion.status`, never an amount
- At most 3 `Attribution` rows per `ConversionItem`
- `Click.convertedAt` is non-null if and only if that click has at least one `Attribution`
- `Click.visitorId` is null only on the no-cookie path, which forces `Conversion.splitDegraded`.
  This is an intake-time rule, not a checkable relation: with no stored edge to the cited click,
  nothing after the write can re-derive it
- `Click.fpHash` is set on every click. Only `visitorId` may identify a visitor to §6.3; `fpHash`
  never enters the candidate set, at any distance
- `Product.status` may move `ACTIVE → ARCHIVED`; rows are never deleted
- `Conversion.confirmedAt` is set if and only if `status = CONFIRMED`
- A `Conversion` with `status = UNATTRIBUTED` has no `Attribution` rows
- A `TrackingLink` exists only where `Partnership.status = APPROVED` held at mint time

### 4.7 Why there is no Campaign

The earlier design had `Campaign`, `CampaignProduct`, and a campaign-scoped `Membership`. Three
tables and an enum, removed. What they were carrying, and where it went:

| Campaign carried                          | Now                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| The per-product commission rate           | `Product.commissionType` / `commissionValue`                         |
| Which creators may mint links             | `Partnership`, at brand level                                        |
| Which products a creator may link to      | All of the brand's `ACTIVE` products                                 |
| The scope of the attribution split        | The brand (§1.2 risk 4)                                              |
| Scheduled start and end dates             | Nothing. Archive the product or disable the link                     |

Three real capabilities go with it, and each is a deliberate trade rather than an oversight:

1. **Two rates on one product at the same time.** A seasonal promotion running alongside a baseline
   rate is no longer expressible. Archive the SKU and publish a new one, or edit the rate and accept
   §1.2 risk 3.
2. **Inviting a creator to a subset of the catalog.** Approval is now all-or-nothing per brand. A
   brand that wants one creator on shoes and another on bags cannot say so; it can only disable the
   individual links it does not want.
3. **Time-boxed promotions that switch themselves off.** Ending a promotion is now a manual act.

For a pilot of 1–2 brands, none of the three is worth three tables and a six-row disable chain. All
three come back with campaigns in R2, and re-introducing them is additive: `Campaign` and
`CampaignProduct` slot above `Product`, and `Partnership` narrows from brand to campaign.

---

## 5. Link lifecycle and disable resolution

Four disable scopes resolve into a four-row chain evaluated in order on every click. First match wins
and determines the reason shown.

| #   | Condition                          | Reason             |
| --- | ------------------------------------ | ------------------ |
| 1   | `Brand.status ≠ APPROVED`          | `BRAND_DISABLED`   |
| 2   | `Partnership.status ≠ APPROVED`    | `CREATOR_REMOVED`  |
| 3   | `Product.status = ARCHIVED`        | `PRODUCT_ARCHIVED` |
| 4   | `TrackingLink.status = DISABLED`   | `LINK_DISABLED`    |
| —   | otherwise                          | active             |

Six rows became four when campaigns left: the two campaign-state rows had no successor, because
nothing in the MVP turns itself off on a date. The whole chain is one `SELECT` with joins, not four
queries.

Active → 302 straight to the backlink, no interstitial. Disabled → localised "offer ended" page,
HTTP 200.

Links are minted automatically when a `Partnership` moves to `APPROVED`, one per active product, and
again for any product the brand adds while the partnership is live. Disabling is forward-looking
only: clicks already recorded run out their full 30-day window and can still earn.

---

## 6. Tracking and attribution

### 6.1 Redirect

`GET /r/:code` — budget: p95 under 50ms of server time.

```
1  one indexed SELECT on TrackingLink.code, joined through product → brand and
   partnership → everything the disable chain needs
2  evaluate disable chain (§5) → disabled? render "offer ended" page
3  read or mint xu_vid cookie: 30d, HttpOnly, SameSite=Lax, Secure
4  compute fpHash from client IP and User-Agent
5  dedup check, then INSERT the Click row and commit
6  302 → backlinkUrl with ?xu=<clickId> appended
```

Two Postgres round trips against a database on the same host. No cache, no queue, no worker in the
path.

**The click is committed before the buyer ever sees `?xu=`.** The entire attribution chain rests on
this, and it costs one synchronous insert. A conversion citing a clickId can therefore never arrive
ahead of that click, which is why §6.2 has no pending-resolution state.

**Deduplication, cookie first.** If the same `visitorId` already clicked this same link within 30
minutes, the new row is written with `creditable = false`. It is still a real click and still appears
in the raw count.

With no cookie, the same 30-minute rule runs against `fpHash` instead of `visitorId`. `fpHash` is
`sha256(ip ‖ user-agent ‖ salt)` where `salt = hmac(serverSecret, utcDate)` — derived, so there is no
salt table and no rotation job, and the 24-hour roll sits comfortably above the 30-minute window it
serves. Raw IP and User-Agent are never stored. The client IP comes from Caddy's trusted-proxy
resolution, never from `X-Forwarded-For` read directly (§11); a header any client can set is not a
fingerprint.

**A fingerprint-deduplicated click still earns.** `creditable = false` removes it from the §7.2
unique count, but the no-cookie path is single-click attribution (§9) and pays the cited click
regardless of the flag. This is load-bearing, not a detail: Georgian mobile carriers put thousands of
subscribers behind one CGNAT address, so two unrelated buyers matching is routine rather than exotic,
and gating earnings on that match would mean a genuine sale paying nobody. The visible cost is that
§7.2 can report more converted clicks than unique ones on a shared address. Counters that look
inflated beat creators who go unpaid.

If step 5 fails, the redirect still 302s to `backlinkUrl` *without* `?xu=`. The buyer's journey is
never held hostage to XUAMO's database, and losing one click's attribution beats losing the sale.

Query handling: `?xu=` is appended to `backlinkUrl`; existing query parameters and any fragment are
preserved.

### 6.2 Conversion intake

`POST /v1/conversions`, header `Authorization: Bearer xu_sk_…`.

```json
{
  "orderId": "1234",
  "occurredAt": "2026-08-12T14:22:00+04:00",
  "clickId": "ck_a91f",
  "items": [
    { "sku": "P-9", "qty": 1, "unitPrice": 250.0, "lineDiscount": 25.0, "lineVat": 34.32 },
    { "sku": "L-4", "qty": 1, "unitPrice": 2000.0, "lineDiscount": 0, "lineVat": 305.08 }
  ]
}
```

There are no order totals. Commission comes exclusively from `items`, so anything else would be
recorded and never read.

Processing:

1. Authenticate: look up the brand by the token's prefix, then compare hashes. A request carrying a
   browser `Origin` header is 401 — a secret in page source is the worst outcome of a self-serve
   integration, so it fails loudly rather than working quietly
2. Check `(brand, orderId)`. Same payload → return the original result, 200. Different payload → 409.
   This is both replay protection and the double-billing guard, and it means the brand's developer
   has no idempotency header to generate: retry as often as you like
3. Validate `occurredAt` within ±48h of server time (422)
4. Resolve `clickId`:
   - absent, unknown, or older than 30 days → `UNATTRIBUTED`, stop
   - found → continue. A click that deduplication marked non-creditable still resolves; it loses its
     own candidacy, not its visitor

   The resolved click is passed to §6.3 and then dropped. `Conversion` does not store it (§4.4).
5. Run the attribution calculator (§6.3)
6. In one transaction: persist `Conversion`, `ConversionItem[]`, `Attribution[]`, and stamp
   `Click.convertedAt = conversion.occurredAt` on every earning click that does not have one

Budget: p95 under 200ms.

| Code | Meaning                                     | What the developer does                    |
| ---- | --------------------------------------------- | -------------------------------------------- |
| 200  | Accepted, or a replay of the same `orderId` | Nothing. Replays are free and always safe  |
| 400  | Malformed JSON                              | Fix the body                               |
| 401  | Unknown key, or a browser `Origin` header   | Check the key, and check it is server-side |
| 409  | This `orderId` exists with different data   | Do not retry. Post a new order             |
| 422  | Timestamp skew or shape                     | Fix and resend                             |
| 5xx  | XUAMO problem                               | Retry, backing off                         |

### 6.3 Attribution calculator

A pure function of `(citedClick, candidateClicks, lineItems, products) → Attribution[]`. It performs
no I/O, which is what makes it exhaustively testable. The cited click is a parameter rather than a
stored column (§4.4): it seeds the visitor lookup and holds its creator's slot, then goes nowhere.

Dropping campaigns simplified this materially: the creator set is now computed **once per
conversion** rather than once per line, because there is no per-line campaign to scope by. The loop
body is pure arithmetic.

```
candidateClicks = clicks where
    brand      = conversion.brand      ← SKUs are brand-scoped. Without this filter,
                                         a SKU shared by two brands attributes one
                                         brand's order to the other
    visitorId  = conversion click's visitorId
    creditable = true
    occurredAt within 30 days before conversion.occurredAt
                                       ← and never fpHash; see below

creators = distinct creators among candidateClicks, each represented by their
           most recent such click, ordered by that click's recency descending
if the cited click's creator is among them:
    move that creator to the front     ← the click that carried ?xu= delivered
creators = first 3 of creators           the buyer; it never loses its slot to
                                         more recent clickers
n = count(creators)

for each lineItem:
    product = product where brand = conversion.brand and sku = lineItem.sku
    if none: line earns nothing; record and continue      ← unknown SKU

    net = (unitPrice × qty − lineDiscount) − lineVat
    if net <= 0: commission = 0; record and continue

    commission = round(product.commissionType == PERCENT
                       ? net × product.commissionValue
                       : product.commissionValue × qty, 0.01)

    share = floor(commission / n, 0.01)
    rem   = commission − n × share       (0 ≤ rem < n × 0.01)
    assign share to each creator, plus 0.01 to the first `rem / 0.01` entries
    of `creators` — cited click first, then recency

    one Attribution per creator: (conversionItem, that creator's click,
                                  creator, product, amount)
```

`fpHash` never appears in that filter and never will. A CGNAT address shared by thousands of
subscribers would merge strangers into a single visitor and pay commission to creators who never
touched this buyer. Deduplication that is wrong pays less; identity that is wrong pays the wrong
person, and only the first of those is a recoverable mistake.

Worked example:

```
Cart:   perfume 250.00 GEL (12%)  promo −25.00
        laptop 2000.00 GEL (3%)
Clicks: Nino → perfume link (Aug 1), Dato → laptop link (Aug 11)
Order:  Aug 12

creators = [Dato, Nino]        n = 2, brand-scoped, same for both lines

perfume  net (250 − 25) / 1.18 = 190.68  → 22.88  → Dato 11.44 · Nino 11.44
laptop   net 2000 / 1.18       = 1694.92 → 50.85  → Dato 25.43 · Nino 25.42
```

Note what §1.2 risk 4 means in practice: Nino, who only ever promoted the perfume, takes half the
laptop commission. **To narrow this to product scope**, restrict `creators` inside the loop to those
whose candidate clicks were on links for *this line's* product. That is a one-line change, it makes
the worked example pay Nino 22.88 and Dato 50.85, and it is the decision to revisit before pilot —
not after money has moved.

Remainder handling, for cases that do not divide evenly:

```
commission 10.00 across Nino, Ana, Dato (Dato most recent)
  floor 3.33 each, rem 0.01   → Dato 3.34 · Ana 3.33 · Nino 3.33

commission 0.05 across the same three
  floor 0.01 each, rem 0.02   → Dato 0.02 · Ana 0.02 · Nino 0.01
```

Flooring each share rather than rounding keeps this monotonic. Rounding half-up makes the remainder
negative for the `0.05` case and pays the most recent clicker *less* than the others.

If `lineVat` is absent and the brand is VAT-registered, the line total is treated as VAT-inclusive and
VAT derived as `lineTotal × 0.18 / 1.18`. If the brand is not VAT-registered, `lineVat` is zero and
the line total is the net directly.

All attributions are created against a `PENDING` conversion.

---

## 7. Views

### 7.1 Brand — Orders queue

Order ID, date, line items, and the attributed creators with their shares.

```
Order #1234 — 250 ₾ — Creator: Nino — Commission: 20 ₾
  [✓ Confirm]   [× Cancelled / Returned]
```

Confirm and Cancel act on the whole order. Cancelling one returned line out of a multi-item order
needs adjustment machinery and is R2.

`PENDING → CONFIRMED` or `PENDING → CANCELLED`, and `CONFIRMED → CANCELLED` for a return that
surfaces after confirmation. `confirmedAt` is stamped on confirmation and is what buckets the CSV. A
cancellation landing after that month's CSV was issued is recorded in `AuditEvent` and carried onto
the next CSV as a negative line.

Pending count and oldest-pending age appear in the navigation, with an in-app banner escalating at 7,
14, and 30 days.

### 7.2 The link view

One tracking link, everything known about it. Visible to the creator who owns it and to the brand.

**Identity** — all of it reachable from the `TrackingLink` row in one join each:

```
Code            xu.ge/r/K7M2QP
Brand           Aromashop            → TrackingLink.product.brand
Product         Perfume 100ml (P-9)  → TrackingLink.product
Destination     aromashop.ge/p/perfume-100  ← the backlink the 302 goes to
Creator         Nino                 → TrackingLink.creator
Rate            12%                  → product.commissionType / commissionValue
Status          Active               → the §5 chain, with the failing row named if disabled
Created         1 Aug 2026
```

**Counters** — all derived from `Click` and `Attribution`, none stored:

| Figure               | Query                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| Total clicks         | `count(*)` on `Click` for this link                                     |
| Unique clicks        | `count(*) where creditable` — the deduplicated figure                   |
| Distinct visitors    | `count(distinct visitorId)`                                             |
| Converted clicks     | `count(*) where convertedAt is not null`                                |
| Conversion rate      | converted ÷ unique                                                      |
| First / last click   | `min/max(occurredAt)`                                                   |
| Pending / confirmed / cancelled commission | `Attribution` joined to `Conversion.status`       |

Three click counts are shown rather than one because they answer different questions and a single
"clicks" number hides the interesting case. Total minus unique is how much of a creator's traffic is
the same person refreshing; unique minus converted is the funnel.

**Click list** — the rows behind the counters, most recent first:

```
when                 unique   converted            order
2026-08-11 14:02     yes      2026-08-12 09:14     #1234    12.50 ₾  confirmed
2026-08-11 13:58     no       —                    —        —
2026-08-09 20:11     yes      —                    —        —
```

`converted` is `Click.convertedAt` read directly — one indexed column, no joins. The order and amount
columns come from `Attribution` and are only fetched for the rows that show as converted, which the
partial index on `(trackingLinkId) where convertedAt is not null` makes cheap.

### 7.3 Creator — earnings

Per link, the counters above. Per brand and per month: totals, split into pending, confirmed, and
cancelled commission.

The forward-looking figure is always an explicit estimate, because catalog price is display-only:

```
Perfume 100ml — 250 ₾
You earn ~30 ₾ per completed sale   (estimate, based on catalog price)
```

### 7.4 Settlement handoff

Per brand, per month, a CSV: creator, link code, order ID, order date, confirmation date,
commissionable net, rate, commission.

Rows are bucketed by **confirmation timestamp** in Asia/Tbilisi, not order date. Order dates are
brand-supplied and a brand may confirm months late, so bucketing by order date would keep
re-populating periods whose CSV has already been sent. Only `CONFIRMED` conversions appear.

The brand pays creators directly against it. XUAMO moves no money.

---

## 8. Payments and settlement

R2, in its own spec. The MVP deliberately has no invoice, no ledger, no payout, and no bank account —
not simplified versions of those things, none of them. `Creator.payoutBank` / `payoutIban` /
`payoutName` are collected because asking a creator for their IBAN later is friction, and are
otherwise unused.

Permanently out of scope at any release: card payments, stored card data, PSP integration, direct
debit, automated bank connectivity, multi-currency, and any creator wallet withdrawable on demand.

---

## 9. Error handling

| Case                                                    | Behaviour                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| Missing, unknown, or >30d click ID                      | `UNATTRIBUTED`, surfaced to the brand. Never silently dropped           |
| Cited click was deduplicated                            | Resolves normally for visitor lookup; loses only its own candidacy      |
| Same SKU string owned by two brands                     | Candidate clicks are brand-filtered; no cross-brand attribution         |
| SKU not in the brand's catalog                          | Line earns nothing, recorded for visibility                             |
| Repeat `orderId`, same payload                          | 200 with the original result, no new records                            |
| Repeat `orderId`, different payload                     | 409                                                                     |
| Line net ≤ 0                                            | Commission 0, recorded                                                  |
| `FIXED` rate with `qty > 1`                             | `value × qty`                                                           |
| `occurredAt` more than ±48h from server time            | 422                                                                     |
| Backlink has existing query or fragment                 | Preserved; `?xu=` appended                                              |
| No `xu_vid` cookie                                      | Single-click attribution, `splitDegraded` set; dedup uses `fpHash`      |
| Two cookie-less buyers behind one CGNAT address         | Second click non-creditable; still earns via the single-click path      |
| Client sets its own `X-Forwarded-For`                   | Ignored. Caddy resolves the client IP from its trusted-proxy config     |
| Click earns on a second order                           | `convertedAt` keeps the first. Both orders reachable via `Attribution`  |
| Conversion later cancelled                              | `convertedAt` stays set — the click did convert. Money state is on the conversion |
| Rate changed after a click, before its order            | The new rate applies (§1.2 risk 3). Written amounts never change        |
| Partnership rejected or product archived after clicks exist | Existing clicks stay creditable through their window                |
| Brand adds a product while a partnership is live        | A link is minted for every approved creator                             |
| Return after confirmation                               | `CONFIRMED → CANCELLED`, audit-logged, next-CSV negative line           |
| Postgres unavailable at click write                     | 302 without `?xu=` — the sale is never blocked, the attribution is lost |
| Postgres unavailable at link lookup                     | 503. No cache exists to serve from (§1.2 risk 7)                        |
| Brand key compromised                                   | An administrator regenerates it. The old key stops working immediately  |
| Postback with an unknown key                            | 401, never 404 — a 404 would leak whether the endpoint exists           |
| Postback carrying a browser `Origin` header             | 401, logged as a probable leaked secret                                 |

---

## 10. Testing strategy

The attribution calculator is built test-first and covered exhaustively, because it is where every
lari of correctness lives:

- 1, 2, and 3 creators; the >3 cap
- Cited click's creator retained when three or more creators clicked more recently
- Cross-brand SKU collision: identical SKU at two brands, only the conversion's brand attributes
- Brand-scoped split: a creator who promoted only product A still shares product B in the same cart
  (§1.2 risk 4 — the test exists to make the decision visible, not to bless it)
- Remainder cases: 10.00 across 3, and 0.05 across 3 (never inverts recency order)
- Zero and negative line nets
- SKUs absent from the brand's catalog
- Expired and non-creditable clicks
- Degraded no-cookie single-click path
- Property test: `Σ shares == commission` exactly, and shares non-increasing by click recency, for
  random commissions and N ∈ 1..3

Supporting coverage:

- **Disable chain** — table-driven across all four rows, active and disabled
- **Link minting** — approval mints one link per active product; a product added later mints for
  every approved creator; no link is ever minted for a non-`APPROVED` partnership
- **Redirect** — 302 target correctness, query and fragment preservation, cookie set and reuse, the
  30-minute dedup boundary, disabled-page render, latency budget
- **Fingerprint dedup** — matching IP and User-Agent with no cookie, inside and outside the
  30-minute boundary; a present cookie always takes precedence; the salt rolling at UTC midnight
  ends an otherwise-matching pair; no candidate-click query mentions `fpHash`; and the case that
  costs money — a fingerprint-deduplicated click still earns through the single-click path
- **Click durability** — the `Click` row is committed before the 302, so a conversion posted
  milliseconds later always resolves; a failed click write still redirects, without `?xu=`
- **`convertedAt`** — stamped on every earning click in the same transaction as the attribution;
  keeps the first order's timestamp when a second order also earns on it; survives a later
  cancellation; null for every click that earned nothing
- **Link counters** — total, unique, distinct-visitor, and converted counts against a seeded fixture
  containing duplicates, non-converters, and a multi-earning click
- **Conversions API** — auth by prefix and hash, `Origin` rejection, same-payload replay returns the
  original, different-payload 409, timestamp skew, the unattributed path
- **Money immutability** — confirming and cancelling change status only; no `commissionAmount` is
  ever rewritten, including across a rate change between click and confirmation
- **CSV** — bucketed by confirmation date, `CONFIRMED` only, negative line for a late cancellation
- **End-to-end** — seeded brand → product → approved partnership → link → simulated click →
  simulated postback → asserted attribution rows and `convertedAt`

---

## 11. Deployment

`docker-compose`: `web` (Next.js standalone) · `postgres` · `caddy` (TLS) · `worker`. Four services,
one of them stateful.

The worker is a scheduler, not a queue consumer: monthly CSVs and retention aggregation. Nothing in
the request path waits on it.

- Nightly `pg_dump` to offsite storage
- Prisma Migrate for schema changes; every generated migration is diffed against Appendix A before it
  is applied
- Caddy resolves the client IP through its `trusted_proxies` configuration; the application never
  reads `X-Forwarded-For` itself, or fingerprint dedup is evadable by any client that sets the header
- Secrets in `.env`, never committed — including the fingerprint salt secret, whose rotation
  invalidates every in-flight dedup window
- Structured logs, `/health` endpoint, external uptime ping
- VPS region chosen for proximity to Georgian traffic
- Redirects served from `/r/:code` on the main domain, avoiding a second certificate

Budgets: redirect p95 < 50ms server time; conversions API p95 < 200ms. Both are instrumented from day
one, because they are the trigger for §11.1.

### 11.1 The Redis option

The MVP does not run Redis. This section exists so adopting it later is a decision with a known shape.

| Job                      | What it replaces                      | Trigger                                                       |
| ------------------------ | --------------------------------------- | --------------------------------------------------------------- |
| Link snapshot cache      | The `SELECT` in §6.1 step 1           | Redirect p95 approaching 50ms                                 |
| Asynchronous click drain | The synchronous INSERT in §6.1 step 5 | Write contention, or a redirect that survives a Postgres blip |

The first is cheap and reversible. **The second is not.** An asynchronous drain reintroduces the
drain race: a conversion can arrive before its click has landed, which brings back a
pending-resolution state, a retry worker, a second lookup the conversions API must consult, and the
failure mode where drain lag silently costs a creator a sale. Buy it against a measurement, never a
forecast.

Two cheaper moves come first and may be sufficient: an in-process LRU on the link lookup, at the cost
of a staleness window on disables, and `pgbouncer` if the ceiling turns out to be connections rather
than queries.

---

## 12. Release sequencing

| Release | Contents                                                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MVP** | This document. Catalog with rates, brand↔creator partnerships, per-product links, redirect, click tracking with conversion state, conversions API, split attribution, confirm/cancel, CSV export              |
| **R2**  | Campaigns and campaign-scoped rates (§4.7), domain verification, brand teams, pixel path, key rotation, self-test, delivery log, rate history — and the money stack: accrual ledger, platform fee, VAT invoicing, month close, payout batches, admin console |
| **R3**  | Email, `ru` locale, bot filtering, anomaly alerts, HMAC signing, creator social proof, public directories                                                                                                    |
| **R4**  | Compliance and automation: licensing position, KYC/AML depth, bank statement import                                                                                                                          |

The MVP exists first because attribution is the component that can fail silently, and there is no
point building an invoicing engine on numbers that might be wrong.

---

## 13. Open non-code items before pilot

1. **Decide brand-scoped versus product-scoped split** (§1.2 risk 4, §6.3). This determines who gets
   paid and is a one-line code change now, a migration and a set of apologies later
2. Legal review of the `xu_vid` cookie against Georgian data protection law and GDPR
3. Georgian tax treatment of creator payouts, and who issues which document to whom — needed even
   though the MVP moves no money, because the brand pays the creator directly against the CSV
4. Decide who writes and reviews both launch locales
5. Confirm the commercial terms the CSV settles against, since there is no contract mechanism in the
   product
6. Naming: repository is `SHUAMO`, product is `XUAMO`. Reconcile or accept

The fund-handling licensing question that dominated the earlier draft does not arise in the MVP:
XUAMO never receives money. It returns with R2 and must be answered before that release, not this one.

---

## Appendix A — PostgreSQL schema

§4 is the readable model; this is the executable one. Prisma Migrate owns the migrations in practice
(§11); this DDL is what they must produce and the artifact to diff them against.

Conventions: `snake_case`; `id uuid primary key default gen_random_uuid()` and
`created_at timestamptz not null default now()` on every table unless stated; money is
`numeric(12,2)`. `app_user`, not `user`, which is reserved.

### A.1 Enums

```sql
CREATE TYPE approval_status    AS ENUM ('PENDING','APPROVED','SUSPENDED');
CREATE TYPE partnership_status AS ENUM ('PENDING','APPROVED','REJECTED');
CREATE TYPE product_status     AS ENUM ('ACTIVE','ARCHIVED');
CREATE TYPE rate_type          AS ENUM ('PERCENT','FIXED');
CREATE TYPE link_status        AS ENUM ('ACTIVE','DISABLED');
CREATE TYPE conversion_status  AS ENUM ('PENDING','CONFIRMED','CANCELLED','UNATTRIBUTED');
```

### A.2 Accounts and partnership

```sql
CREATE TABLE app_user (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  locale        text        NOT NULL DEFAULT 'ka' CHECK (locale IN ('ka','en')),
  is_admin      boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- key_prefix is the bearer-token lookup key and the displayable form (xu_sk_7Q4M).
-- key_hash is what a presented token is compared against; the plaintext is never stored.
CREATE TABLE brand (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid            NOT NULL UNIQUE REFERENCES app_user(id) ON DELETE RESTRICT,
  name           text            NOT NULL,
  vat_registered boolean         NOT NULL DEFAULT false,
  key_prefix     text            NOT NULL UNIQUE,
  key_hash       text            NOT NULL,
  status         approval_status NOT NULL DEFAULT 'PENDING',
  created_at     timestamptz     NOT NULL DEFAULT now()
);

-- Payout columns are collected in the MVP and unused until R2. No verification workflow.
CREATE TABLE creator (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid            NOT NULL UNIQUE REFERENCES app_user(id) ON DELETE RESTRICT,
  display_name text            NOT NULL,
  bio          text            NOT NULL DEFAULT '',
  status       approval_status NOT NULL DEFAULT 'PENDING',
  payout_bank  text,
  payout_iban  text,
  payout_name  text,
  created_at   timestamptz     NOT NULL DEFAULT now()
);

-- Brand-wide. Approval mints a tracking link for every active product.
CREATE TABLE partnership (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   uuid               NOT NULL REFERENCES brand(id)   ON DELETE CASCADE,
  creator_id uuid               NOT NULL REFERENCES creator(id) ON DELETE RESTRICT,
  status     partnership_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz        NOT NULL DEFAULT now(),
  UNIQUE (brand_id, creator_id)
);
CREATE INDEX partnership_creator_idx ON partnership (creator_id, status);
```

### A.3 Catalog and links

```sql
-- The rate lives here. There is no campaign and no history table; see §4.7 and §1.2 risk 3.
CREATE TABLE product (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         uuid           NOT NULL REFERENCES brand(id) ON DELETE RESTRICT,
  sku              text           NOT NULL,
  title            text           NOT NULL,
  description      text           NOT NULL DEFAULT '',
  price_gel        numeric(12,2)  NOT NULL CHECK (price_gel >= 0),
  image_urls       text[]         NOT NULL DEFAULT '{}',
  backlink_url     text           NOT NULL,
  commission_type  rate_type      NOT NULL,
  commission_value numeric(9,4)   NOT NULL CHECK (commission_value >= 0),
  status           product_status NOT NULL DEFAULT 'ACTIVE',
  created_at       timestamptz    NOT NULL DEFAULT now(),
  UNIQUE (brand_id, sku),
  -- PERCENT is a fraction (0.125), never a whole number of percent
  CONSTRAINT percent_is_fraction CHECK (commission_type <> 'PERCENT' OR commission_value <= 1),
  -- Array order is display order; element 1 is the primary image. Empty is legal.
  -- Per-element "non-empty https:// URL" is an application rule: a CHECK over every
  -- element of an array needs a subquery, which CHECK does not allow.
  CONSTRAINT image_urls_bounded CHECK (cardinality(image_urls) <= 8)
);

CREATE TABLE tracking_link (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid        NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  creator_id uuid        NOT NULL REFERENCES creator(id) ON DELETE RESTRICT,
  code       text        NOT NULL UNIQUE,
  status     link_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, creator_id)
);
CREATE INDEX tracking_link_creator_idx ON tracking_link (creator_id);
```

### A.4 Tracking

```sql
-- id is the ck_… token echoed in ?xu=.
-- brand_id is denormalised: brand-filtering candidate clicks is a correctness
-- requirement (§6.3), not an optimisation.
-- converted_at is denormalised: it is the question the link view is built around,
-- and deriving it costs three joins on the busiest table in the schema (§4.2).
-- fp_hash is sha256(ip ‖ user-agent ‖ hmac(serverSecret, utcDate)). It deduplicates
-- cookie-less clicks and does nothing else: it must never reach the candidate-click
-- query below, because one CGNAT address is thousands of unrelated people (§6.3).
CREATE TABLE click (
  id               text PRIMARY KEY,
  tracking_link_id uuid        NOT NULL REFERENCES tracking_link(id) ON DELETE RESTRICT,
  brand_id         uuid        NOT NULL REFERENCES brand(id)         ON DELETE RESTRICT,
  visitor_id       uuid,
  fp_hash          text,
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  creditable       boolean     NOT NULL DEFAULT true,
  converted_at     timestamptz
);
CREATE INDEX click_candidates_idx ON click (brand_id, visitor_id, occurred_at DESC)
  WHERE creditable;
CREATE INDEX click_link_idx       ON click (tracking_link_id, occurred_at DESC);
CREATE INDEX click_fp_dedup_idx   ON click (tracking_link_id, fp_hash, occurred_at DESC)
  WHERE fp_hash IS NOT NULL;
CREATE INDEX click_converted_idx  ON click (tracking_link_id)
  WHERE converted_at IS NOT NULL;

CREATE TABLE conversion (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id       uuid              NOT NULL REFERENCES brand(id) ON DELETE RESTRICT,
  order_id       text              NOT NULL,
  occurred_at    timestamptz       NOT NULL,
  status         conversion_status NOT NULL DEFAULT 'PENDING',
  confirmed_at   timestamptz,
  split_degraded boolean           NOT NULL DEFAULT false,
  created_at     timestamptz       NOT NULL DEFAULT now(),
  UNIQUE (brand_id, order_id),   -- idempotency and double-billing in one constraint
  CONSTRAINT confirmed_at_matches_status CHECK (
    (status = 'CONFIRMED') = (confirmed_at IS NOT NULL)
  )
);
CREATE INDEX conversion_queue_idx ON conversion (brand_id, status, confirmed_at);

CREATE TABLE conversion_item (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id      uuid          NOT NULL REFERENCES conversion(id) ON DELETE CASCADE,
  sku                text          NOT NULL,
  qty                integer       NOT NULL CHECK (qty > 0),
  unit_price         numeric(12,2) NOT NULL CHECK (unit_price         >= 0),
  line_discount      numeric(12,2) NOT NULL CHECK (line_discount      >= 0),
  line_vat           numeric(12,2) NOT NULL CHECK (line_vat           >= 0),
  commissionable_net numeric(12,2) NOT NULL CHECK (commissionable_net >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX conversion_item_conversion_idx ON conversion_item (conversion_id);

-- click_id is the earning creator's most recent candidate click.
-- product_id records which catalog row produced the amount — the audit link
-- between money paid and the rate that produced it.
CREATE TABLE attribution (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_item_id uuid          NOT NULL REFERENCES conversion_item(id) ON DELETE CASCADE,
  click_id           text          NOT NULL REFERENCES click(id)           ON DELETE RESTRICT,
  creator_id         uuid          NOT NULL REFERENCES creator(id)         ON DELETE RESTRICT,
  product_id         uuid          NOT NULL REFERENCES product(id)         ON DELETE RESTRICT,
  commission_amount  numeric(12,2) NOT NULL CHECK (commission_amount >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (conversion_item_id, creator_id)
);
CREATE INDEX attribution_item_idx    ON attribution (conversion_item_id);
CREATE INDEX attribution_creator_idx ON attribution (creator_id);
CREATE INDEX attribution_click_idx   ON attribution (click_id);

CREATE TABLE audit_event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid        REFERENCES app_user(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   uuid        NOT NULL,
  changes     jsonb       NOT NULL DEFAULT '{}',
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_event_entity_idx ON audit_event (entity_type, entity_id, at DESC);
```

### A.5 The link view, as SQL

The §7.2 counters, so the shape is not left to imagination:

```sql
SELECT l.code,
       p.title, p.sku, p.backlink_url, p.commission_type, p.commission_value,
       b.name AS brand, c.display_name AS creator, l.status,
       count(k.id)                                        AS total_clicks,
       count(k.id) FILTER (WHERE k.creditable)            AS unique_clicks,
       count(DISTINCT k.visitor_id)                       AS visitors,
       count(k.id) FILTER (WHERE k.converted_at IS NOT NULL) AS converted_clicks,
       min(k.occurred_at)                                 AS first_click,
       max(k.occurred_at)                                 AS last_click
FROM tracking_link l
JOIN product p ON p.id = l.product_id
JOIN brand   b ON b.id = p.brand_id
JOIN creator c ON c.id = l.creator_id
LEFT JOIN click k ON k.tracking_link_id = l.id
WHERE l.id = $1
GROUP BY l.id, p.id, b.id, c.id;
```

Commission totals come from a second query against `attribution` joined to `conversion`, kept
separate so the counter query never fans out across line items.

### A.6 What the schema cannot enforce

Real invariants from §4.6 that no constraint expresses. Each needs application code and, more
importantly, a test — §10 is where they actually live.

| Invariant                                                            | Why not a constraint                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Σ commission_amount` per line equals the line's computed commission | Cross-row aggregate against a value derived outside the database |
| At most 3 attribution rows per line                                  | A count across sibling rows; needs a trigger or a guarded write  |
| `commission_amount` is never rewritten after insert                  | Would need a column-level append-only trigger                    |
| `converted_at` set iff the click has an attribution                  | Cross-table, and written in the same transaction instead         |
| `UNATTRIBUTED` implies no attribution rows                           | Cross-table                                                      |
| `visitor_id IS NULL` implies `split_degraded`                        | No stored edge to the cited click; set at intake, unverifiable   |
| Links minted only for `APPROVED` partnerships                        | A point-in-time rule, not a state rule; enforced at mint time    |

The first is the one that costs money if it breaks, and it is covered by a property test.
