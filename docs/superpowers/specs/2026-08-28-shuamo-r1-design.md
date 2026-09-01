# SHUAMO — MVP Design (Tracking Spine)

**Date:** 2026-08-28
**Status:** Approved for planning
**Scope:** MVP only. Everything else is listed in §2 as deferred, with the release it belongs to.

---

## 1. Product summary

SHUAMO is a B2B creator-performance platform for the Georgian market. Brands publish a product
catalog; creators partner with a brand and explicitly create links for products they choose; buyers click
through to the brand's own online store and purchase there. SHUAMO measures which creator drove which
sale and what commission is owed.

The buyer never transacts on SHUAMO. SHUAMO holds no cart, no checkout, and no buyer account.

The whole model is four nouns:

```
Brand ──partners with──▶ Creator ──gets a link for──▶ Product ──▶ Click ──▶ Conversion
```

There is no campaign. An approved partnership authorizes link creation. Each link binds one creator
and one active product and snapshots the product's offered rate when the creator accepts it.

### 1.1 What the MVP has to prove

That a click can be tied to a sale, and that the resulting commission is correct. Nothing else. If
attribution is wrong, no amount of invoicing, payouts, or dashboards built on top of it is worth
anything — which is why the calculator in §6.3 is the only part of this document that is not
simplified.

Two product decisions survive the cut because they define what SHUAMO *is*:

| Decision                                                                                | Why it stays                                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The submitted click's tracking link identifies the only earning creator and product | Direct single-link attribution is auditable, exact, and independent of other visitor activity. |
| A SHUAMO-hosted "offer ended" page for disabled links                                    | A dead link has to explain itself to the buyer and to the creator who posted it. Active links still 302 straight through, so a working link never shows a SHUAMO page.    |

### 1.2 Accepted risks

1. **Click-ID persistence depends entirely on the brand's developer.** The brand's site must capture
   `?xu=` on landing, persist it through checkout, and echo it in the postback. With the integration
   self-test deferred (§2), the only mitigation is hand-held onboarding — viable at 1–2 brands and
   nothing beyond that.
2. **A leaked API key allows fabricated conversions.** The key is a static bearer token, shown once
   and stored as a hash. There is no HMAC signing and no rotation: a compromise means an
   administrator regenerates the key and the brand redeploys.
3. **Rate edits require deliberate link replacement.** A product holds the terms offered for new
   links. Existing links retain their immutable snapshots; creators disable and recreate links to
   accept changed terms (`ATTR-006`, `ATTR-007`).
4. **A submitted click is product-specific.** Only lines for that link's product earn commission;
   a creator never earns from unrelated catalog items (`ATTR-003`, `ATTR-004`).
5. **Pending orders never expire.** No auto-approve. A brand that stops confirming freezes creator
   earnings indefinitely. In-app reminders only.
6. **Visitor cookie and click fingerprint require legal review.** The cookie is first-party and
   used for analytics deduplication, but is still a tracking cookie for any EU visitor.
   The `fpHash` derived from IP and User-Agent (§6.1) is *pseudonymous, not anonymous* — hashing does
   not move it outside GDPR or the Georgian personal data law. Non-code task before pilot.
7. **Postgres is a hard dependency of the redirect.** No cache, no queue (§3.4). A failed click write
   still 302s to the brand's store without `?xu=`, so the sale is never blocked — but it goes
   unattributed. §11.1 is the exit.
8. **No money movement.** The MVP measures and reports. Brands and creators settle off-platform
   against a CSV. Everything in §8 is R2.
9. **Product image uploads carry no server-enforced size limit.** The presigned PUT (§11.2) pins
   content-type into the signature, but a presigned PUT — unlike a presigned POST — cannot carry a
   content-length-range condition, so an oversized object is only stopped by client-side validation.
   Acceptable at a curated pilot of 1–2 approved brands; a presigned POST with policy conditions is
   the fix if abuse ever shows up.

---

## 2. Scope boundary

**In scope:**

- Brand and creator accounts, both approved by an administrator
- One user per brand
- Product catalog: title, description, price, up to 8 uploaded images, backlink URL, commission rate
- Brand-side image upload via presigned URL, direct to self-hosted object storage (§11.2)
- Brand ↔ creator partnership: Apply / Invite with Approve / Reject
- Creator-initiated product links after partnership approval
- Redirect service with the disable chain
- Click recording, cookie and fingerprint deduplication, and per-click conversion state
- One API key per brand for the conversion postback
- `POST /v1/conversions` — server-to-server, the only conversion path
- Per-line-item exact-link attribution to one creator
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
| `specs` jsonb — structured, per-category product attributes              | Free-text `description` only                               | R2         |
| Browser pixel endpoint, public site keys, the pixel/postback trust model | Server postback only                                       | R2         |
| API key rotation with overlap, `RETIRING` state, `lastUsedAt`            | One key; an administrator regenerates it                   | R2         |
| Integration self-test gate, `TEST` links, `isTest` conversions           | Hand-held onboarding on a real link                        | R2         |
| Conversion delivery log and the Developers tab diagnostics               | Structured server logs, read by the operator               | R2         |
| Negotiated rate history beyond links                                    | Immutable link snapshots are the R1 agreement record       | R2         |
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
| Visitor identity     | First-party cookie `xu_vid` on the SHUAMO redirect domain, 30 days                                                |
| Attribution model    | The submitted click resolves one link and the only earning creator/product (`ATTR-002`, `ATTR-003`)              |
| Window               | 30 days before the order                                                                                         |
| Rounding             | The full matching-line commission is rounded half-up to 0.01 GEL with exact decimal arithmetic                   |
| Granularity          | Per line item, not per order                                                                                     |
| Commissionable value | Line total after line discount, net of line VAT                                                                  |
| Rate resolution      | Immutable commission type and value stored on the cited tracking link (`ATTR-006`, `ATTR-007`)                    |
| Deduplication        | Same visitor, same link, within 30 minutes → one creditable click. With no cookie, same fingerprint              |
| Click fingerprint    | `sha256(ip ‖ user-agent ‖ daily salt)`. A click-analytics dedup signal only                                       |
| Click conversion state | Each click carries `convertedAt`, stamped the first time it earns commission                                   |
| No-cookie behavior   | Exact submitted-click attribution is unchanged                                                                    |
| Buyer PII            | Nothing raw. A click keeps a cookie id and a salted hash; no IP or User-Agent at rest                            |
| Idempotency          | `orderId` is the key. Same brand and order, same payload → the original result; different payload → 409          |
| Brand credential     | One static secret `xu_sk_` per brand, shown once at generation, stored as a hash                                 |

### 3.2 Catalog and partnerships

| Decision                | Value                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| Product source          | Brand-uploaded catalog, each product linking to the brand's own store page                  |
| Commission rate         | Product advertises current terms; each created link snapshots them immutably                 |
| Catalog price           | Display-only; drives the creator-facing estimate. Real commission always from the postback  |
| Product deletion        | Archive only                                                                                |
| Image storage           | Self-hosted, S3-compatible object storage (MinIO). Bucket is public-read, private-write     |
| Image upload flow       | Server issues a presigned PUT scoped to one object and one content-type; the browser uploads directly to MinIO — bytes never touch the app server (§11.2) |
| Image serving           | Stable public URL per object, no signing on read, cacheable, no expiry to manage            |
| Partnership model       | Creator applies or is invited. Approval authorizes explicit product-link creation            |
| Link creation           | Creator explicitly accepts one active product's offered terms                               |
| Disable scopes          | Single link · partnership · product · brand                                                 |
| Disabled link behaviour | SHUAMO "offer ended" page                                                                    |
| In-flight clicks        | Clicks recorded before a disable stay creditable through their full 30-day window           |

### 3.3 Commercial

| Decision       | Value                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Money          | SHUAMO moves none of it in the MVP. Brand and creator settle off-platform against the CSV (§7.4) |
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
| Stack              | Next.js (App Router) · PostgreSQL · MinIO · Prisma · Caddy · Docker Compose on a self-hosted VPS |

**PostgreSQL and a self-hosted, S3-compatible object store (MinIO) are the only stateful services.**
No Redis, no queue. Object storage backs product images only (§11.2) — the redirect and the
attribution calculator, the two components with a latency budget, still touch nothing but Postgres
(§6.1, §6.3). The redirect reads and writes Postgres synchronously and the worker is a scheduler.
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
              commissionType:RateType  commissionValue:numeric(9,4)
              status:LinkStatus                       one ACTIVE(product,creator)

Click         id:text pk (ck_…)  trackingLink:→TrackingLink  brand:→Brand
              visitorId:uuid?  fpHash:text?  occurredAt:ts  creditable:bool  convertedAt:ts?

Conversion    brand:→Brand  orderId:text  occurredAt:ts
              status:ConversionStatus  confirmedAt:ts?  ✦(brand,orderId)

ConversionItem  conversion:→Conversion  sku:text  qty:int  unitPrice:gel
                lineDiscount:gel  lineVat:gel  commissionableNet:gel

Attribution   conversionItem:→ConversionItem✦  click:→Click  creator:→Creator
              product:→Product  commissionAmount:gel

AuditEvent    actor:→User?  action:text  entityType:text  entityId:uuid
              changes:jsonb  at:ts
```

`Product.imageUrls` is unchanged in shape from the original design — still an ordered `text[]`,
still capped at 8 — but its values are now stable public MinIO URLs written by the presigned-upload
flow (§11.2), not brand-pasted external links. The 8-element cap and the per-element URL-shape rule
(§4.6) apply exactly as before.

### 4.2 The four columns that need justifying

**Commission terms.** The product stores the currently advertised terms for new links. A tracking
link copies those terms at creation and is the immutable agreement record. `PERCENT` is a fraction
(`0.125`, not `12.5`) and `FIXED` is GEL per matching unit. Product edits never change old links.

**`Click.brand` is a deliberate denormalisation.** It lets conversion intake reject a submitted
cross-brand click without trusting request data. The redirect lookup already has the brand in hand.

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

The submitted click is resolved at intake and is the only possible earning click. Matching items
store that exact click on their attribution. An `UNATTRIBUTED` conversion has no attribution rows.

### 4.5 Keys, indexes, retention

```
UNIQUE  Brand (userId)                             one brand per user
UNIQUE  Brand (keyPrefix)                          bearer token lookup
UNIQUE  Partnership (brandId, creatorId)
UNIQUE  Product (brandId, sku)                     SKUs are brand-scoped; two brands may use P-9
UNIQUE  TrackingLink (code)                        the redirect lookup — §6.1
UNIQUE  TrackingLink (productId, creatorId) ACTIVE one active link; disabled history remains
UNIQUE  Conversion (brandId, orderId)              idempotency and double-billing, one constraint
UNIQUE  Attribution (conversionItemId)             at most one earning creator per line

INDEX   Click (trackingLinkId, visitorId, occurredAt desc)             analytics dedup — §6.1
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

- A matching `ConversionItem` has one attribution whose amount equals its full computed commission
- `Attribution.commissionAmount` is written once and never recomputed. Confirming or cancelling
  changes `Conversion.status`, never an amount
- At most 1 `Attribution` row per `ConversionItem`
- `Click.convertedAt` is non-null if and only if that click has at least one `Attribution`
- `Click.visitorId`, `fpHash`, and `creditable` are analytics/dedup fields and never select earners
- `Product.status` may move `ACTIVE → ARCHIVED`; rows are never deleted
- `Conversion.confirmedAt` is set if and only if `status = CONFIRMED`
- A `Conversion` with `status = UNATTRIBUTED` has no `Attribution` rows
- A `TrackingLink` is explicitly created only while the partnership is `APPROVED`

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

Approval authorizes a creator to explicitly create a link for one active product. Product and
partnership writes never create links. Link creation snapshots the offered rate, and a partial unique
index permits history while enforcing one active link per pair. Disabling is forward-looking only:
clicks already recorded run out their full 30-day window and can still earn.

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
never held hostage to SHUAMO's database, and losing one click's attribution beats losing the sale.

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
| 5xx  | SHUAMO problem                               | Retry, backing off                         |

### 6.3 Attribution calculator

### Single-link attribution

An approved partnership authorizes a creator to create product links. Each
tracking link binds exactly one creator and one product and snapshots the
product's offered commission terms when created (ATTR-001, ATTR-002,
ATTR-006). The shop returns the recorded click ID after a successful sale;
that click's tracking link identifies the only earning creator (ATTR-003,
ATTR-010). Only order lines matching the link's product earn commission, and
the creator receives the full calculated amount without a split (ATTR-004,
ATTR-005). Product-rate edits affect new links only (ATTR-007).

The conversion resolver follows exactly:

```text
submitted click ID → click → tracking_link → creator / product / immutable rate
```

An absent, unknown, cross-brand, future, or expired click produces an
`UNATTRIBUTED` conversion. A click recorded while its link was active remains
eligible after disablement. Neither `creditable`, `visitorId`, `fpHash`, nor
any other click participates in choosing the creator.

The pure calculator receives the resolved link terms and order lines. It
calculates `max(0, unit price × quantity − line discount − line VAT)`; when a
VAT-registered brand omits VAT, VAT is derived at 18%. Only lines whose SKU
matches the link product earn. Percent rates multiply matching net and fixed
rates multiply matching quantity. The full line commission is rounded half-up
to 0.01 GEL and assigned to the link creator in one attribution row.

A repeated `(brand, orderId)` returns the originally stored result without a
second conversion or commission (ATTR-008). Attribution amounts are immutable.

## 7. Views

### 7.1 Brand — Orders queue

Order ID, date, line items, and the one attributed creator and full amount where applicable.

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

The brand pays creators directly against it. SHUAMO moves no money.

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
| Cited click was deduplicated                            | Resolves normally to its exact link                                     |
| Same SKU string owned by two brands                     | Submitted click must resolve to the authenticated brand                  |
| SKU not in the brand's catalog                          | Line earns nothing, recorded for visibility                             |
| Repeat `orderId`, same payload                          | 200 with the original result, no new records                            |
| Repeat `orderId`, different payload                     | 409                                                                     |
| Line net ≤ 0                                            | Commission 0, recorded                                                  |
| `FIXED` rate with `qty > 1`                             | `value × qty`                                                           |
| `occurredAt` more than ±48h from server time            | 422                                                                     |
| Backlink has existing query or fragment                 | Preserved; `?xu=` appended                                              |
| No `xu_vid` cookie                                      | Exact-click attribution is unchanged; dedup uses `fpHash`                |
| Two cookie-less buyers behind one CGNAT address         | Second click non-creditable; still earns via the single-click path      |
| Client sets its own `X-Forwarded-For`                   | Ignored. Caddy resolves the client IP from its trusted-proxy config     |
| Click earns on a second order                           | `convertedAt` keeps the first. Both orders reachable via `Attribution`  |
| Conversion later cancelled                              | `convertedAt` stays set — the click did convert. Money state is on the conversion |
| Rate changed after a click, before its order            | The cited link's immutable stored rate applies                           |
| Partnership rejected or product archived after clicks exist | Existing clicks stay creditable through their window                |
| Brand adds a product while a partnership is live        | No link exists until a creator explicitly accepts the offer              |
| Return after confirmation                               | `CONFIRMED → CANCELLED`, audit-logged, next-CSV negative line           |
| Postgres unavailable at click write                     | 302 without `?xu=` — the sale is never blocked, the attribution is lost |
| Postgres unavailable at link lookup                     | 503. No cache exists to serve from (§1.2 risk 7)                        |
| Brand key compromised                                   | An administrator regenerates it. The old key stops working immediately  |
| Postback with an unknown key                            | 401, never 404 — a 404 would leak whether the endpoint exists           |
| Postback carrying a browser `Origin` header             | 401, logged as a probable leaked secret                                 |

---

## 10. Testing strategy

The attribution contract is built test-first and traced by stable rule IDs:

- 100 approved creators can each hold an active link for one product (ATTR-001).
- Every link resolves exactly one creator, product, brand, and snapshotted rate (ATTR-002).
- Other visitor clicks never receive or alter attribution (ATTR-003, ATTR-010).
- Product-A links pay zero for product B and mixed carts pay only matching lines (ATTR-004).
- Matching percent and fixed lines pay the link creator the full exact amount (ATTR-005).
- Existing links retain their stored terms after product-rate edits (ATTR-006, ATTR-007).
- Replaying one shop order performs no second write (ATTR-008).
- A click remains usable after its link is disabled (ATTR-009).
- A cited non-creditable click still resolves to its exact link (ATTR-010).
- Unknown, cross-brand, future, and expired click IDs produce `UNATTRIBUTED`.
- Every money assertion compares exact decimal storage strings.

Supporting coverage preserves the redirect, cookie, fingerprint, click
durability, disable-chain, lifecycle, image upload, reporting, and CSV
contracts. A drift guard rejects superseded creator-selection helpers and
degradation flags from active source and documents.

## 11. Deployment

`docker-compose`: `web` (Next.js standalone) · `postgres` · `minio` (product image storage) · `caddy`
(TLS) · `worker`. Five services, two of them stateful.

The worker is a scheduler, not a queue consumer: monthly CSVs and retention aggregation. Nothing in
the request path waits on it.

- Nightly `pg_dump` to offsite storage. **This covers Postgres only** — the MinIO volume carries no
  backup in the MVP (§11.2), a deliberate gap given the pilot's scale, not an oversight
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

### 11.2 Product image uploads

Brands upload product photos straight to MinIO. The bytes never pass through the Next.js server:

```
1  Brand's browser: POST /api/brand/products/:id/images/presign  { contentType }
2  Server: verifies the product belongs to the requesting brand, checks contentType is one of
   image/jpeg, image/png, image/webp, and generates a presigned PUT (5-minute expiry) for the key
   products/{brandId}/{productId}/{uuid}.{ext} — content-type pinned into the signature, so the
   object cannot land as anything the server did not authorise. Returns { uploadUrl, publicUrl }
3  Browser: PUT uploadUrl, the file body, direct to MinIO
4  Browser: PATCH the product's imageUrls to append publicUrl, subject to the existing 8-element
   cap (image_urls_bounded, §4.6) and the existing per-element URL-shape rule
```

The bucket is public-read (`mc anonymous set download`) and private-write: anyone can fetch a product
photo by its URL, nobody can write one without a presigned URL scoped to a specific brand's own
product. Reads need no signing and no expiry to manage — the stored `imageUrls` value is the URL a
browser renders directly.

There is no server-enforced size cap (§1.2 risk 9): a presigned PUT signs a single object and a
content-type, not a byte-size range the way a presigned POST's policy conditions can. Size is
therefore a client-side guard only (5MB), which is an accepted risk at a curated pilot of 1–2 brands,
not a defended boundary.

Deletion is not implemented. Archiving a product does not remove its images from MinIO, consistent
with §4.6's "nothing is ever hard-deleted" — an orphaned object after an archive is a disk-space cost,
not a correctness one, and reclaiming it is not built.

The MinIO volume carries no backup in the MVP. Unlike the nightly `pg_dump`, a lost volume loses
product photos with no recovery path; brands would need to re-upload. This is a named gap, tracked for
a future release, not a silent omission.

---

## 12. Release sequencing

| Release | Contents                                                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MVP** | This document. Catalog with rates, brand↔creator partnerships, explicit per-product links, redirect, click tracking, exact-link attribution, conversions API, confirm/cancel, CSV export                     |
| **R2**  | Campaigns and campaign-scoped rates (§4.7), domain verification, brand teams, pixel path, key rotation, self-test, delivery log, rate history — and the money stack: accrual ledger, platform fee, VAT invoicing, month close, payout batches, admin console |
| **R3**  | Email, `ru` locale, bot filtering, anomaly alerts, HMAC signing, creator social proof, public directories                                                                                                    |
| **R4**  | Compliance and automation: licensing position, KYC/AML depth, bank statement import                                                                                                                          |

The MVP exists first because attribution is the component that can fail silently, and there is no
point building an invoicing engine on numbers that might be wrong.

---

## 13. Open non-code items before pilot

1. Legal review of the `xu_vid` cookie against Georgian data protection law and GDPR
2. Georgian tax treatment of creator payouts, and who issues which document to whom — needed even
   though the MVP moves no money, because the brand pays the creator directly against the CSV
3. Decide who writes and reviews both launch locales
4. Confirm the commercial terms the CSV settles against; the immutable link is the R1 agreement record
5. Naming: repository is `SHUAMO`, product is `SHUAMO`. Reconcile or accept

The fund-handling licensing question that dominated the earlier draft does not arise in the MVP:
SHUAMO never receives money. It returns with R2 and must be answered before that release, not this one.

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

-- Brand-wide authorization boundary. Approval does not create links.
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
  CONSTRAINT percent_is_fraction CHECK (commission_type <> 'PERCENT' OR commission_value <= 1),
  CONSTRAINT image_urls_bounded CHECK (cardinality(image_urls) <= 8)
);

CREATE TABLE tracking_link (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       uuid         NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  creator_id       uuid         NOT NULL REFERENCES creator(id) ON DELETE RESTRICT,
  code             text         NOT NULL UNIQUE,
  commission_type  rate_type    NOT NULL,
  commission_value numeric(9,4) NOT NULL CHECK (commission_value >= 0),
  status           link_status  NOT NULL DEFAULT 'ACTIVE',
  created_at       timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT tracking_link_percent_is_fraction
    CHECK (commission_type <> 'PERCENT' OR commission_value <= 1)
);
CREATE INDEX tracking_link_product_creator_idx
  ON tracking_link (product_id, creator_id);
CREATE UNIQUE INDEX tracking_link_one_active_product_creator
  ON tracking_link (product_id, creator_id) WHERE status = 'ACTIVE';
CREATE INDEX tracking_link_creator_idx ON tracking_link (creator_id);
```

The tracking-link identity, code, product, creator, commission type, and
commission value are immutable. Disabled history is retained; only one active
row may exist for a creator/product pair.

### A.4 Tracking

```sql
-- visitor_id and fp_hash deduplicate click analytics only. The submitted click
-- ID resolves the earning tracking link.
CREATE TABLE click (
  id               text PRIMARY KEY,
  tracking_link_id uuid        NOT NULL REFERENCES tracking_link(id) ON DELETE RESTRICT,
  brand_id         uuid        NOT NULL REFERENCES brand(id) ON DELETE RESTRICT,
  visitor_id       uuid,
  fp_hash          text,
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  creditable       boolean     NOT NULL DEFAULT true,
  converted_at     timestamptz
);
CREATE INDEX click_link_idx ON click (tracking_link_id, occurred_at DESC);
CREATE INDEX click_visitor_dedup_idx
  ON click (tracking_link_id, visitor_id, occurred_at DESC)
  WHERE visitor_id IS NOT NULL;
CREATE INDEX click_fp_dedup_idx
  ON click (tracking_link_id, fp_hash, occurred_at DESC)
  WHERE fp_hash IS NOT NULL;
CREATE INDEX click_converted_idx
  ON click (tracking_link_id) WHERE converted_at IS NOT NULL;

CREATE TABLE conversion (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id       uuid              NOT NULL REFERENCES brand(id) ON DELETE RESTRICT,
  order_id       text              NOT NULL,
  occurred_at    timestamptz       NOT NULL,
  status         conversion_status NOT NULL DEFAULT 'PENDING',
  confirmed_at   timestamptz,
  created_at     timestamptz       NOT NULL DEFAULT now(),
  UNIQUE (brand_id, order_id),
  CONSTRAINT confirmed_at_matches_status CHECK (
    (status = 'CONFIRMED') = (confirmed_at IS NOT NULL)
  )
);

CREATE TABLE conversion_item (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id      uuid          NOT NULL REFERENCES conversion(id) ON DELETE CASCADE,
  sku                text          NOT NULL,
  qty                integer       NOT NULL CHECK (qty > 0),
  unit_price         numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  line_discount      numeric(12,2) NOT NULL CHECK (line_discount >= 0),
  line_vat           numeric(12,2) NOT NULL CHECK (line_vat >= 0),
  commissionable_net numeric(12,2) NOT NULL CHECK (commissionable_net >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE attribution (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_item_id uuid          NOT NULL UNIQUE REFERENCES conversion_item(id) ON DELETE CASCADE,
  click_id           text          NOT NULL REFERENCES click(id) ON DELETE RESTRICT,
  creator_id         uuid          NOT NULL REFERENCES creator(id) ON DELETE RESTRICT,
  product_id         uuid          NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  commission_amount  numeric(12,2) NOT NULL CHECK (commission_amount >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now()
);
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

| Invariant | Enforcement |
| --- | --- |
| Submitted click belongs to the authenticated brand and is within its window | Phase 6 resolver and named integration tests |
| Each conversion item has at most one attribution | `UNIQUE (conversion_item_id)` |
| Attribution amount is never rewritten | Immutable-write application path and integration test |
| `converted_at` is set iff the cited click earned | One Phase 6 transaction |
| `UNATTRIBUTED` implies no attribution rows | Phase 6 transaction and integration test |
| Link creation requires an approved partnership and active product | Application command plus database integration tests |

Order replay is protected by `UNIQUE (brand_id, order_id)`; immutable link
identity and agreed terms are protected by a database update trigger.
