# Brand integration

The authenticated brand integration guide is at `/{locale}/brand/settings`.
The existing route is retained; the navigation label is now Integration.
English and Georgian use the same sections, controls and API contract.

## Reporting and validation

- `POST /v1/conversions` records a successful sale and eligible commission.
- `POST /v1/conversions/validate` previews the same payload without creating a
  conversion, attribution, or click-consumption record. It checks existing orders,
  click ownership and age, matching SKUs, commissionable net and used clicks.
- Both public endpoints require the complete brand Bearer key and reject an
  `Origin` header. Call them from a store backend.
- `POST /api/brand/integration/validate` provides the dashboard's session-based
  validator. It requires an approved brand and the configured application Origin.
  It does not verify the store backend's key, networking, or referral capture.

Validation returns `mode: "validation"`, `valid`, `outcome`, and a decimal-string
`commissionAmount`. A syntactically valid validation request returns HTTP 200
even if `valid` is false; inspect both fields. Outcomes are `eligible`, `no_click`,
`invalid_click`, `sku_mismatch`, `zero_net`, `replay`, `order_conflict`,
`click_already_attributed`, and `timestamp_out_of_range`. A valid payload without
attribution is distinguished from a payload that cannot become a live sale.

Validation is a current-data preview, not a reservation or a separate sandbox
database. Only operational request metadata is written. Concurrent live sales,
key changes and elapsed time can change the eventual live result. A cancelled
order replay reports its original commission amount for historical consistency;
it does not earn that commission again.

Both endpoints share JSON parsing and numeric bounds: at most 256 KiB streamed
request bodies, 1–500 lines, positive quantities up to 2,147,483,647, and
non-negative decimal amounts with at most two places. Non-negative line
subtotals before VAT must fit numeric(12,2), up to 9,999,999,999.99 GEL. Overflow
is a non-retryable 422 instead of a database failure. New order timestamps must
be within ±48 hours of server time; identical existing orders replay outside
that window. Authentication failures remain 401, malformed JSON 400, conflicts
409, oversized bodies 413, invalid values 422, and temporary service failures 503. The guide documents each recovery action.

## Referral contract

An active creator link redirects to the store with `?xu=<clickId>`. The store
must preserve that ID in its own session/cookie and persist it on the order
before payment. The recommended store policy retains the latest explicit xu
for up to 30 days and leaves it unchanged on arrivals without xu. This is
documented guidance, not a new server-side attribution algorithm.

One submitted click selects one creator and one product. Only matching SKU
lines earn commission at the tracking link's agreed rate. A click can earn on
one order only, including after cancellation. Keep order metadata for retries,
but remove consumed clicks from future carts. `200` and `CONFIRMED` alone do not
prove attribution; inspect the response's item attributions. Refund webhooks,
partial refunds and Shopify/WooCommerce adapters remain unavailable.

## Credentials and diagnostics

The displayed prefix is labelled as a key identifier and cannot be copied as
a usable credential. Key replacement requires a second explicit action after
explaining immediate invalidation of the previous key. The full generated key
is held only in component memory and disappears on reload. The key mutation
also requires the configured application Origin.

Both public endpoints return `X-Request-Id`. Authenticated requests retain
only request UUID, brand ID, live/validation mode, status, outcome and time.
The UI displays the latest 20. Per-brand advisory locking caps stored history
at 100 entries even for concurrent requests. Keys, payloads, order IDs and
customer data are not logged. Unauthenticated requests are not associated with
a brand. History failures do not turn committed sales into failed responses.

## Local preview verification

Apply migrations with `pnpm db:migrate:deploy` and generate the Prisma client
with `pnpm db:generate`. The new migration only adds `integration_request` and
its index; it does not modify sales or commission records.

Seed the local database in order: `seed:phase-2`, `seed:phase-3`, `seed:phase-4`,
`seed:phase-6`. The phase-6 script registers a CSS stub because Node imports
public barrels containing UI exports; it never renders those UI components.
Build with `pnpm build` and serve the built artifact with `pnpm start`.

Targeted unit and database tests cover validation/live separation, amounts,
used clicks, cancelled replays, numeric limits, metadata minimization and
concurrent history retention. Playwright MCP verification covers both locales,
mobile overflow, copying, request history, invalid and eligible payloads,
server-key validation, rotation/cancellation, secret disappearance on reload,
and denied access for both seeded creator accounts.
