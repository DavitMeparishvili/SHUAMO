# SHUAMO Delivery Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each phase plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver SHUAMO as a sequence of independently testable releases — first the tracking spine that proves a click can be tied to a sale and priced correctly (R1), then the accounting stack that invoices brands, collects, and pays creators (R2).

**Architecture:** A Next.js App Router modular monolith of vertical slices. Each module owns `domain` (framework-free, no ORM, no I/O), `application` (use cases over ports), `ports` (interfaces), `infrastructure` (Prisma adapters), `http` (dependency-injected handler factories), and `ui` (React). `app/` holds thin route wrappers only. PostgreSQL is the single datastore and the only stateful service; every commercial invariant is a transaction or a test, never a convention.

**Tech Stack:** Node.js 24 LTS · pnpm · Next.js 16 (App Router) · React 19 · strict TypeScript · PostgreSQL 17 · Prisma 7 · Better Auth · Zod 4 · Tailwind CSS 4 · Vitest 4 (unit + integration projects) · Playwright · Docker Compose · Caddy.

**Specs:**

- `docs/superpowers/specs/2026-08-28-shuamo-r1-design.md` — the tracking spine. Bare section references (§6.3, §7.2) point here.
- `docs/superpowers/specs/2026-08-29-shuamo-r2-accounting-design.md` — the money stack. References written `R2 §n`.

Both specs travel with this roadmap. Every phase plan argues from them; where a plan and a spec disagree, the spec wins unless the disagreement is listed in "Recorded deviations" below.

---

## Global Constraints

Every task in every phase plan inherits this section.

**Product**

- Market is Georgia. Currency is **GEL only**. Locales are `ka` and `en`, **both complete — no string ships untranslated**.
- The buyer never transacts on SHUAMO. No cart, no checkout, no buyer account.
- There is no `Campaign` in R1 (§4.7). A partnership is brand-wide and the rate lives on the product.
- Commission is split equally among **up to 3** creators whose creditable clicks fall in the 30-day window (§3.1).
- **Split scope is brand-scoped**, exactly as §6.3 is written — a creator who sent the visitor shares every line of the order, including products they never promoted. This is the decision recorded against §13.1; the test in Phase 5 exists to keep it visible.
- Attribution window is **30 days** before the order. Click dedup window is **30 minutes**.
- `PERCENT` commission values are **fractions** (`0.125`, never `12.5`) and are `numeric(9,4)`. `FIXED` is GEL per unit, multiplied by `qty`.
- Rounding: line commission rounded to 0.01 GEL, then **floored** per share; leftover tetri handed out one each in recency order, cited click first (§6.3). Never round-half-up a share.
- Nothing is ever hard-deleted. Products archive; ledger entries are append-only; corrections are new rows.

**Engineering**

- Money is `numeric(12,2)` in PostgreSQL and `Prisma.Decimal` in TypeScript. **Never a JavaScript `number` for money, at any layer, including test fixtures and JSON responses.** Rates are `numeric(9,4)`.
- Time is `timestamptz`, stored and compared in UTC. Billing periods and CSV buckets are computed in **Asia/Tbilisi**.
- `domain/` folders import no framework, no ORM, no provider SDK, and perform no I/O. Enforced by `pnpm verify:boundaries`, not by review.
- Cross-module imports go through the target module's `index.ts` public surface. A module never reaches into another module's `infrastructure/`.
- Prisma is reachable only from `infrastructure/` and `src/infrastructure/db`. Every generated migration is **diffed against the spec appendix** (R1 Appendix A, R2 Appendix A) before it is applied.
- Prisma migrations are committed and forward-only.
- Local development and test run against **separate PostgreSQL 17 databases** `shuamo_dev` and `shuamo_test` in Docker Compose. Integration teardown refuses to run unless the database name ends `_test`.
- The application never reads `X-Forwarded-For` itself; the client IP comes from Caddy's trusted-proxy resolution (§11). A header any client can set is not a fingerprint.
- Raw IP and User-Agent are never persisted. Only `fpHash = sha256(ip ‖ user-agent ‖ hmac(serverSecret, utcDate))`.
- Secrets live in `.env`, never committed. `FINGERPRINT_SECRET` rotation invalidates every in-flight dedup window and is a deliberate operational act.
- WCAG 2.2 AA is the accessibility target for every screen.
- Performance budgets, instrumented from the day the code exists: **redirect p95 < 50ms server time**, **conversions API p95 < 200ms** (§11).
- Every phase adds domain, PostgreSQL integration, route-contract, Playwright, and accessibility coverage appropriate to its scope.
- Frequent commits. Each task in a phase plan ends in a commit.

**Naming**

- Repository is `SHUAMO`; the product is `SHUAMO`. §13.6 leaves this open. Until it is resolved: the repository keeps its name, all user-visible copy and all code identifiers say `SHUAMO`, and the link host is `xu.ge`.

---

## Program gates

```text
Phase 0  Engineering foundation
  -> Phase 1  Design language & component kit
    -> Phase 2  Identity, accounts & approvals
      -> Phase 3  Catalog, partnerships & link minting
        -> Phase 4  Redirect & click tracking
          -> Phase 5  Attribution calculator          (pure, exhaustive)
            -> Phase 6  Conversions API & order lifecycle
              -> Phase 7  Reporting, CSV, worker & deploy   = R1 / MVP
                -> Phase 8  Billing periods & creator ledger
                  -> Phase 9  Invoicing & the close job
                    -> Phase 10 Payment orders, release & payouts
                      -> Phase 11 Money views, admin console & reconciliation = R2
```

No phase starts until the previous phase's verify command, demo journey, migration rehearsal, and exit checklist all pass. Each phase leaves `main` releasable.

Phase 5 sits between click tracking and the conversions API on purpose. The calculator is a pure function with no I/O, it is where every lari of correctness lives (§10), and it is the one component that can be finished and proved completely before anything calls it.

---

## Recorded deviations from the specs

Three, all deliberate. Anything else that diverges is a bug in the plan.

| Deviation | Spec says | We do | Why |
| --- | --- | --- | --- |
| Credential storage | R1 Appendix A puts `password_hash` on `app_user` | Better Auth with the Prisma adapter owns credentials and sessions in its own tables. `app_user` keeps `id`, `email`, `locale`, `is_admin` and drops `password_hash` | Hand-rolled password and session handling is the largest avoidable security surface in the build. Every other column in Appendix A is unchanged, and the migration diff notes this one line |
| Split scope | §6.3 brand-scoped, §13.1 open | Brand-scoped, as written | Recorded decision. Phase 5 carries the test that makes the consequence visible so it stays reversible before pilot |
| Admin approvals in R1 | §2 "approvals happen by seed script and direct database access" | Seed scripts, as specified, through Phase 7 | Unchanged. The admin console arrives in Phase 11 because money moves through it (R2 §7.3), not because approvals were inconvenient |

---

## Phase 0 — Engineering foundation

**Outcome:** A deployable empty product with enforced architecture boundaries and three working feedback loops.

**Scope**

- Scaffold Next.js 16, React 19, strict TypeScript, ESLint, Prettier, pinned toolchain, `.nvmrc`.
- Docker Compose with persistent `postgres-dev` (`shuamo_dev`) and tmpfs `postgres-test` (`shuamo_test`).
- Prisma 7 with the `pg` adapter, an initial migration, and a test-database guard.
- Environment validation that fails the build rather than defaulting a secret.
- `src/modules/*` vertical-slice layout and the `verify:boundaries` AST check.
- Shared domain primitives: `Money` (decimal, never float), `Clock`, `IdGenerator`, `Result`.
- Locale-aware root routes `/ka` and `/en`, error boundaries, `/api/health/live` and `/api/health/ready`.
- Vitest unit and integration projects, Playwright desktop and mobile projects, CI.

**Deliverable:** `pnpm dev` serves `/ka` and `/en`; `pnpm verify:phase-0` passes from a frozen install on a clean clone.

**Automated proof**

- A unit sentinel imports domain code with no Next.js in the module graph.
- An integration sentinel applies migrations and round-trips a row through PostgreSQL.
- The integration teardown guard refuses a `DATABASE_URL_TEST` whose database name does not end `_test`.
- `Money` property tests: addition is associative, `round`/`floor` never drift, and no operation returns a float.
- Playwright opens both locales, checks landmarks and focus order, and asserts the health contract.

**Exit criteria**

- No source module imports Prisma except `infrastructure/` and `src/infrastructure/db`.
- Production build contains no fallback value for any required secret.
- Phase command: `pnpm verify:phase-0`.

**Execution plan:** `2026-08-29-phase-00-foundation-implementation.md`

---

## Phase 1 — Design language & component kit

**Outcome:** A written design system and a built component kit, both locales, before any product screen exists — so no surface is styled twice.

**Scope**

- `DESIGN.md`: the SHUAMO design manifest — colour ramp, typographic scale, radii, elevation, layout grid, and the named rules the system is actually governed by.
- Tailwind 4 `@theme` tokens generated from that manifest, with `ka`/`en` font stacks in one declaration.
- Primitives: `Button`, `Field`, `Select`, `Card`, `Figure`, `Money`, `StatusPill`, `DataTable`, `EmptyState`, `Banner`, `CopyField`.
- Shell: utility strip, sticky nav built from viewer capabilities, locale switch, footer, mobile tab bar.
- `/[locale]/design` kitchen-sink route rendering every primitive in every state.

**Deliverable:** `/ka/design` and `/en/design` render the full kit; a Playwright visual snapshot per breakpoint per locale is committed as the regression baseline.

**Automated proof**

- Contrast unit tests over the token table: every declared foreground/background pair meets WCAG 2.2 AA, including hover and active states.
- `Money` component tests: tabular numerals, GEL suffix, negative amounts rendered as a signed value and never as colour alone.
- Playwright axe scan of `/design` in both locales at desktop and mobile, zero violations.
- Keyboard-only traversal of the kitchen sink reaches every interactive element with a visible focus ring.

**Exit criteria**

- No hard-coded hex value exists outside the token layer.
- Every Georgian string in the kit is real Georgian, not transliterated English.
- Phase command: `pnpm verify:phase-1`.

**Execution plan:** `2026-08-29-phase-01-design-system-implementation.md`

---

## Phase 2 — Identity, accounts & approvals

**Outcome:** An approved brand user and an approved creator can sign in and reach role-appropriate, empty workspaces.

**Scope**

- Better Auth with the Prisma adapter: email/password, secure cookie sessions, sign-out, session revocation.
- `app_user`, `brand`, `creator` tables per Appendix A (minus `password_hash`, see deviations), with `ApprovalStatus`.
- One user per brand, enforced by `UNIQUE (user_id)` on both `brand` and `creator`.
- Brand API key: `xu_sk_` generation, `key_prefix` + `key_hash`, shown once, never recoverable.
- Capability resolution: a request is a brand actor, a creator actor, an admin, or none — resolved server-side, never from a client-supplied id.
- Seed scripts for approving brands and creators (§2), and for regenerating a brand key.
- Brand workspace shell and creator workspace shell, both locales.

**Deliverable:** `pnpm seed:phase-2` creates one approved brand and two approved creators; both can sign in and see their own empty workspace; a `SUSPENDED` account cannot.

**Automated proof**

- Domain tests: a `PENDING` or `SUSPENDED` account resolves to no capability; `is_admin` is never self-assignable.
- Integration: unique normalised email; a second `brand` row for one user is rejected by the database, not by application code.
- API key tests: the plaintext appears exactly once in the generation result and nowhere in any subsequent read; `key_prefix` lookup plus hash comparison authenticates, and a wrong key fails in constant time.
- Route-contract tests: unauthenticated, wrong-capability, and suspended cases for every workspace route.
- Playwright: register, sign in, switch locale, sign out, in both `ka` and `en`.

**Exit criteria**

- No route trusts a client-supplied user, brand, or creator id.
- The brand key plaintext is unrecoverable after generation, proved by a test that reads the row back.
- Phase command: `pnpm verify:phase-2`.

**Execution plan:** `2026-08-29-phase-02-identity-implementation.md`

---

## Phase 3 — Catalog, partnerships & link minting

**Outcome:** An approved partnership produces one tracking link per active product, automatically, and the four-row disable chain resolves correctly for each of them.

**Scope**

- `product`: SKU, title, description, price, up to 8 ordered image URLs, backlink URL, commission type and value, archive-only lifecycle, `UNIQUE (brand_id, sku)`.
- Brand catalog UI: create, edit, archive; a rate editor that makes §1.2 risk 3 explicit in the interface.
- `partnership`: creator applies, brand invites, approve/reject, `UNIQUE (brand_id, creator_id)`.
- `tracking_link`: minting on partnership approval (one per active product) and on product creation (one per approved creator); unique `code`; `UNIQUE (product_id, creator_id)`.
- The §5 disable chain as a pure domain function over a single joined row.
- Link list for creators and brands.

**Deliverable:** `pnpm seed:phase-3` yields a brand with 3 products and 2 approved creators; 6 tracking links exist; archiving a product resolves its links to `PRODUCT_ARCHIVED` without deleting anything.

**Automated proof**

- Disable-chain table test: all four rows plus the active case, and the ordering — a brand that is suspended *and* has an archived product reports `BRAND_DISABLED`, never `PRODUCT_ARCHIVED`.
- Minting tests: approval mints one link per active product; a product added later mints for every approved creator; **no link is ever minted for a non-`APPROVED` partnership**; re-approval does not duplicate links.
- Rate validation: `PERCENT` above `1` is rejected by both the Zod schema and the database CHECK.
- `image_urls` cardinality bounded at 8, each element a non-empty `https://` URL (application rule — the CHECK cannot express it).
- Playwright: brand publishes a product, creator applies, brand approves, creator sees a link with a copyable code.

**Exit criteria**

- Archiving is the only deletion. No `DELETE` statement exists against `product`.
- Phase command: `pnpm verify:phase-3`.

**Execution plan:** `2026-08-29-phase-03-catalog-partnerships-implementation.md`

---

## Phase 4 — Redirect & click tracking

**Outcome:** `GET /r/:code` records a click and redirects, inside 50ms p95, and the click is committed before the buyer sees `?xu=`.

**Scope**

- One joined `SELECT` on `tracking_link.code` carrying everything the disable chain needs.
- `xu_vid` first-party cookie: 30 days, `HttpOnly`, `SameSite=Lax`, `Secure`.
- `fpHash` from Caddy-resolved client IP and User-Agent with a derived daily salt. Raw values never stored.
- 30-minute deduplication: cookie first, `fpHash` when there is no cookie. Duplicate → `creditable = false`, still a real row.
- Synchronous `INSERT` of `click`, committed, then `302` to `backlink_url` with `?xu=<clickId>` appended, preserving existing query and fragment.
- Localised "offer ended" page at HTTP 200 for a disabled link, naming the failing chain row.
- Failure path: a failed click write still `302`s, without `?xu=`. A failed link lookup is `503`.
- Server-timing instrumentation and a latency budget assertion.

**Deliverable:** A real browser hitting a seeded link lands on the destination with `?xu=` present, and the `click` row is already in the database; a disabled link shows the offer-ended page in the visitor's locale.

**Automated proof**

- Redirect: 302 target correctness; query and fragment preservation across four backlink shapes; cookie set on first visit and reused on the second.
- Dedup boundary: 29m59s → non-creditable, 30m01s → creditable, for both the cookie and the fingerprint path.
- Fingerprint: a present cookie always wins over `fpHash`; the salt rolling at UTC midnight ends an otherwise-matching pair; `X-Forwarded-For` set by the client changes nothing.
- **Durability:** the `click` row is readable by an independent connection before the response's `Location` header is observed.
- Failure injection: a database error at step 5 still redirects, without `?xu=`; a database error at step 1 returns 503.
- Load check: p95 server time under 50ms over 500 sequential redirects against a seeded fixture.

**Exit criteria**

- No raw IP or User-Agent exists in any column, log line, or trace.
- Phase command: `pnpm verify:phase-4`.

**Execution plan:** `2026-08-29-phase-04-redirect-tracking-implementation.md`

---

## Phase 5 — Attribution calculator

**Outcome:** The pure function `(citedClick, candidateClicks, lineItems, products) → Attribution[]`, exhaustively proved, with no I/O anywhere in the module.

**Scope**

- Candidate-click selection: brand-scoped, visitor-scoped, `creditable = true`, inside the 30-day window. **`fpHash` never enters this set.**
- Creator ordering by most-recent candidate click, cited creator promoted to the front, capped at 3.
- Per line: SKU resolution, `net = (unitPrice × qty − lineDiscount) − lineVat`, VAT derivation at 18% when the brand is VAT-registered and `lineVat` is absent, commission by rate type, round to 0.01.
- Share distribution: floor per share, remainder distributed one tetri each in recency order.
- The degraded no-cookie path: single-click attribution, `splitDegraded`.

**Deliverable:** `src/modules/attribution/domain/` with a test suite that covers every row of §10's calculator list and passes property tests over randomised input.

**Automated proof** — this is the whole phase, so it is enumerated rather than summarised:

- 1, 2, and 3 creators; the >3 cap keeps the three most recent plus the cited creator.
- Cited click's creator retained when three or more creators clicked more recently.
- Cross-brand SKU collision: identical SKU at two brands; only the conversion's brand attributes.
- Brand-scoped split made visible: a creator who promoted only product A still shares product B in the same cart. The test is named for the decision it encodes.
- Remainder cases: `10.00` across 3 → `3.34 / 3.33 / 3.33`; `0.05` across 3 → `0.02 / 0.02 / 0.01`. Neither inverts recency order.
- Zero and negative line nets → commission 0, recorded.
- SKU absent from the brand's catalog → line earns nothing, recorded.
- Expired clicks (30 days + 1 second) and non-creditable clicks excluded from candidacy.
- A cited click that deduplication marked non-creditable still resolves and still holds its creator's slot.
- Degraded no-cookie path pays the cited click alone and sets `splitDegraded`.
- VAT derivation for a VAT-registered brand with `lineVat` absent; and a non-registered brand where the line total is the net.
- `FIXED` rate with `qty > 1` → `value × qty`.
- **Property test:** `Σ shares == commission` exactly, and shares are non-increasing by click recency, for random commissions in `[0, 100000]` and `n ∈ 1..3`.
- **Purity test:** the module's import graph contains no Prisma, no `fetch`, no `Date.now`, and no `crypto`. The clock arrives as a parameter.

**Exit criteria**

- 100% branch coverage of `src/modules/attribution/domain/`, enforced in CI, not aspirationally.
- Phase command: `pnpm verify:phase-5`.

**Execution plan:** `2026-08-29-phase-05-attribution-calculator-implementation.md`

---

## Phase 6 — Conversions API & order lifecycle

**Outcome:** A brand's server posts an order and the resulting attributions are correct, idempotent, and confirmable.

**Scope**

- `POST /v1/conversions`: bearer auth by key prefix then hash comparison; `Origin` header → 401, logged as a probable leaked secret.
- Idempotency on `(brand, order_id)`: same payload → the original result at 200; different payload → 409.
- `occurredAt` within ±48h → otherwise 422. Zod validation of the item shape.
- Click resolution: absent, unknown, or older than 30 days → `UNATTRIBUTED`, stop.
- Candidate-click query, calculator invocation, and a single transaction persisting `conversion`, `conversion_item[]`, `attribution[]`, and stamping `click.converted_at` on every earning click that lacks one.
- Brand orders queue: confirm and cancel at whole-order level, `CONFIRMED → CANCELLED` permitted, `confirmed_at` stamped, `AuditEvent` on every transition.
- Pending count, oldest-pending age, and the banner escalating at 7, 14, and 30 days.

**Deliverable:** `pnpm seed:phase-6` plus a scripted postback produces a `PENDING` order with correct attributions visible to both brand and creator; the brand confirms it and the state changes without any amount moving.

**Automated proof**

- Every row of the §6.2 status table, as a route-contract test.
- Replay: the same payload twice writes one `conversion` and returns byte-identical bodies.
- 409: same `orderId`, one changed line, no new rows written.
- `converted_at`: stamped in the same transaction as the attribution; keeps the **first** order's timestamp when a second order also earns on the click; survives a later cancellation; null for every click that earned nothing.
- **Money immutability:** confirming and cancelling change `status` and `confirmed_at` only. A test changes a product rate between click and confirmation and asserts `commission_amount` is byte-identical before and after.
- Invariant tests for every row of §4.6 that the schema cannot enforce (A.6), each named for its invariant.
- Latency: p95 under 200ms over 200 sequential postbacks.
- End-to-end: seeded brand → product → approved partnership → link → simulated click → postback → asserted attribution rows and `converted_at`.

**Exit criteria**

- No code path recomputes an `attribution.commission_amount` after insert.
- An `UNATTRIBUTED` conversion is visible to the brand, never silently dropped.
- Phase command: `pnpm verify:phase-6`.

**Execution plan:** `2026-08-29-phase-06-conversions-api-implementation.md`

---

## Phase 7 — Reporting, CSV, worker & production deploy · **R1 / MVP**

**Outcome:** The MVP as §12 defines it: everything measured is visible to the people it belongs to, exportable, and running on a VPS.

**Scope**

- The link view (§7.2): identity block, the six counters, and the click list with its converted and order columns.
- Creator earnings (§7.3): per link, per brand, per month, split pending / confirmed / cancelled, with the forward-looking figure always labelled an estimate.
- Brand orders queue polish and the per-brand monthly CSV (§7.4), bucketed by **confirmation timestamp** in Asia/Tbilisi, `CONFIRMED` only, with a late cancellation carried as a negative line.
- The worker service: a scheduler for monthly CSV generation and click retention aggregation at 13 months.
- Deployment: `docker-compose` with `web`, `postgres`, `caddy`, `worker`; Caddy TLS and `trusted_proxies`; nightly `pg_dump` offsite with a rehearsed restore; structured logs; `/health`; external uptime ping.
- Full `ka`/`en` sweep: every string in the product, both locales, no exceptions.

**Deliverable:** A running deployment where the full journey — click, postback, confirm, CSV — can be demonstrated end-to-end against a real domain, in both locales.

**Automated proof**

- Counter tests against a seeded fixture containing duplicates, non-converters, and one click that earns on two orders. Total, unique, distinct-visitor, and converted each assert a different number.
- CSV: bucketing by confirmation date proved with an order confirmed two months after it occurred; `PENDING` and `CANCELLED` excluded; the negative line for a post-issue cancellation.
- Retention job: clicks older than 13 months aggregate and the source rows are provably still queryable up to the boundary.
- A translation-completeness test: the `ka` and `en` message catalogues have identical key sets, and no value is empty or equal to its key.
- Playwright, both locales: creator opens a link view and reads the three click counts; brand downloads a CSV and its bytes match the fixture.
- A deployment smoke test against the built image: migrations apply to an empty database, `/api/health/ready` passes, one redirect and one postback succeed.

**Exit criteria**

- The §13 non-code items are answered or explicitly accepted in writing before pilot traffic. In particular: the cookie's legal review, the tax treatment of creator payouts, and who owns each locale.
- A `pg_dump` has been restored into an empty database and the restored copy passes `verify:mvp`.
- Phase command: `pnpm verify:mvp`.

**Execution plan:** `2026-08-29-phase-07-reporting-deploy-implementation.md`

---

## Phase 8 — Billing periods & creator ledger

**Outcome:** Confirmation writes money into an append-only ledger, and nothing in the system can move an amount once written.

**Scope**

- `billing_period`: semi-monthly, `1–15` and `16–end`, Asia/Tbilisi, `label` `2026-08-H2`, exactly one `OPEN`.
- `ledger_entry` per R2 Appendix A.6, with both CHECK constraints (`entry_has_a_cause`, `entry_sign`) and all four indexes.
- The application database role holds **no `UPDATE` and no `DELETE` grant** on `ledger_entry` (R2 §12).
- `ACCRUAL` on `PENDING → CONFIRMED`, one entry per attribution, in the same transaction, into the **currently open** period.
- `REVERSAL` on `CONFIRMED → CANCELLED`, negative, into the currently open period, debiting `ACCRUED` or `AVAILABLE` depending on where the money got to.
- `ADJUSTMENT` writer with mandatory memo and `created_by`.
- Balance queries: `Σ` by `(creator, bucket)`.
- `Brand` and `Creator` column additions (R2 A.2).

**Deliverable:** Confirming a seeded order moves a creator's `ACCRUED` balance by exactly the attribution total; cancelling it moves the balance back and leaves both rows visible.

**Automated proof**

- Accrual writes exactly one entry per attribution, of exactly that amount, proved by a fixture with three attributions on one order.
- `PENDING → CANCELLED` writes nothing.
- A confirmation arriving after its period closed lands in the **open** period, never the closed one.
- Every entry kind is rejected against a `CLOSED` period.
- An `UPDATE` and a `DELETE` against `ledger_entry` as the application role both fail at the database.
- **Property test:** `Σ ACCRUED` for a creator is never negative under any legal sequence of confirmations and cancellations.
- **Property test:** no sequence of operations ever updates or deletes a `ledger_entry` row — asserted by a row snapshot taken before and after a randomised run.

**Exit criteria**

- Phase command: `pnpm verify:phase-8`.

**Execution plan:** `2026-08-29-phase-08-ledger-implementation.md`

---

## Phase 9 — Invoicing & the close job

**Outcome:** Closing a period issues one gapless-numbered invoice per brand with entries in it, and re-running the job changes nothing.

**Scope**

- `invoice` and `invoice_counter` per R2 Appendix A.3–A.4, with `totals_add_up` and `paid_at_matches_status`.
- Gapless `XU-YYYY-NNNNNN` allocation from the counter row under `SELECT … FOR UPDATE`, inside the invoice's own transaction. **Not a sequence** (R2 §5.2).
- Invoice arithmetic: `commissionTotal` over `ACCRUAL` and `REVERSAL` for `(brand, period)`, `feeAmount` at the snapshotted rate, `feeVatAmount` when SHUAMO is VAT-registered, `totalDue` as the sum, `dueAt` from `netTermsDays`.
- The close job (R2 §6): step 1 closes and opens in its own committed transaction, then invoices, then drafts payouts, then audits.
- Brand billing view (R2 §7.2): invoice history, the running open-period estimate, and the per-creator breakdown derived from frozen entries.
- Worker schedule at 00:00 Asia/Tbilisi on the 1st and the 16th, plus a manual run.

**Deliverable:** `pnpm close:period` against a seeded fixture issues correct invoices; running it twice issues no second invoice; the brand sees its invoice with a per-creator breakdown.

**Automated proof**

- Numbering is gapless across a **rolled-back** close job — the test deliberately fails an invoice insert mid-run and asserts the next number is contiguous.
- Fee and fee VAT rounding at 0.01, including a commission total that puts the fee on a half-tetri.
- A reversal nets down the next invoice; a reversal exceeding it produces a negative `total_due`, which is carried, not clamped.
- A brand with no entries in the period is issued no invoice.
- Idempotency: run twice, one invoice and one payout draft.
- A confirmation arriving *during* the run lands in the newly opened period and appears on no invoice from this run.
- **Property test:** `total_due` equals its three components exactly, for random rates and pools, including a rate of zero, a pool of zero, and a negative pool.

**Exit criteria**

- Phase command: `pnpm verify:phase-9`.

**Execution plan:** `2026-08-29-phase-09-invoicing-implementation.md`

---

## Phase 10 — Payment orders, release & payouts

**Outcome:** Recording a brand's payment releases exactly the money that invoice covered, and a released payout debits `AVAILABLE` at `SENT`.

**Scope**

- `payment_order` per R2 Appendix A.5, with all seven CHECK constraints and both partial unique indexes.
- Inbound receipt: created directly in `PAID`, carrying bank reference and `recorded_by`; in the same transaction the invoice moves to `PAID` and a `RELEASE` pair (`−ACCRUED`, `+AVAILABLE`) is written for every `ACCRUAL` that invoice covered.
- Outbound payout: drafted at close for creators at or above the payout minimum, `payee_snapshot` frozen at draft, `DRAFT → SENT → PAID | FAILED`.
- The `−AVAILABLE` entry is written on `DRAFT → SENT`, never on `PAID`.
- `SENT → FAILED` writes `PAYOUT_REVERSAL` returning the exact amount to `AVAILABLE`.
- A creator with no bank details drafts and blocks in `DRAFT`, flagged, money staying `AVAILABLE`.

**Deliverable:** The full money round trip runs on a seeded fixture: confirm → close → invoice → record payment → release → close → payout draft → release → mark paid, with the ledger asserted at every step.

**Automated proof**

- Release moves exactly the entries the paying invoice covered and no others — proved with **two brands accruing for the same creator in the same period, only one of which pays**.
- The debit lands on `DRAFT → SENT`, asserted by reading `AVAILABLE` between the two transitions.
- A second draft is refused while one is open, by the partial unique index.
- `FAILED` returns the exact amount to `AVAILABLE` and the creator is redrafted at the next close.
- `payee_snapshot` survives a later change to `creator.payout_iban`.
- Every direction constraint in R2 §4.6 rejects the row it should — one test per constraint, each named for it.
- Recording a payment twice against one invoice fails at the database.
- **Property test:** all three R2 §8 conservation checks hold after **every single step** of a randomised sequence of confirmations, cancellations, payments, payouts and failures — including at the moment a payout is `SENT` and not yet `PAID`.

**Exit criteria**

- R2 §10.3 (post-payout clawback) is decided before the cancellation-after-payout path is implemented. Until then that path raises an explicit, tested "requires a decision" error rather than driving a bucket negative by accident.
- Phase command: `pnpm verify:phase-10`.

**Execution plan:** `2026-08-29-phase-10-payments-payouts-implementation.md`

---

## Phase 11 — Money views, admin console & reconciliation · **R2**

**Outcome:** Everyone can see where their money is, an operator can move it, and seven nightly checks say whether the books are true.

**Scope**

- Creator earnings (R2 §7.1): pending, accrued, available, in transit, paid to date — in total and per brand, with the brand holding things up named.
- Creator statement: per period, every ledger entry with its cause, down to the attribution.
- Admin console (R2 §7.3): Periods, Invoices, Payouts, Adjustments.
- Exports (R2 §7.4): the R1 CSV, an invoice CSV per brand per period, a payout CSV per period.
- The seven reconciliation checks (R2 §8), run nightly by the worker and on demand in the console.
- An alert path when any check returns a row.

**Deliverable:** A creator sees five accurate numbers and can click any of them through to the rows that produced it; an operator closes a period, records a payment, and releases a payout without touching the database.

**Automated proof**

- Each of the seven checks returns **zero rows** against a healthy seeded fixture, and returns **the offending row** against a fixture corrupted specifically for it. Seven pairs, no shortcuts.
- The solvency check is proved against a fixture where `Σ AVAILABLE` is deliberately pushed one tetri over cash held.
- "In transit" appears only when non-zero, and the five numbers reconcile to the ledger.
- Adjustment requires a memo and records `created_by`; a blank memo is rejected at the database.
- Playwright, both locales: the admin closes a period, records an invoice payment, and releases a payout; the creator's balance changes correspondingly.
- **End-to-end**, extending the Phase 6 scenario the whole way: click → postback → attribution → confirm → close → invoice → record payment → release → close → payout draft → release → mark paid, asserting both balances and the trial balance at every step.

**Exit criteria**

- R2 §10.1 (licensing) and R2 §10.2 (tax treatment) are answered in writing **before a single lari is collected**. These are legal preconditions, not launch tasks, and no amount of passing tests substitutes for them.
- A `pg_dump` restore has been verified **before the first invoice is issued**, not after.
- Phase command: `pnpm verify:r2`.

**Execution plan:** `2026-08-29-phase-11-money-views-reconciliation-implementation.md`

---

## Testing strategy

Four layers, each with a job the others cannot do.

| Layer | Command | Runs against | Owns |
| --- | --- | --- | --- |
| Domain unit | `pnpm test:unit` | Nothing. Pure functions, injected clock and ids | The calculator, the disable chain, money arithmetic, ledger entry construction, invoice arithmetic |
| Integration | `pnpm test:integration` | Real PostgreSQL `shuamo_test` | Constraints, transactions, indexes, idempotency, append-only enforcement, every invariant the schema *can* express |
| Route contract | `pnpm test:unit` (colocated `*.test.ts` in `http/`) | Handler factories with stubbed ports | Status codes, auth rejection, payload validation, what a response does and does not echo |
| Browser | `pnpm test:e2e` | A built app and a seeded database | Journeys, both locales, accessibility, keyboard traversal |

**Rules the layers are held to:**

- The calculator (Phase 5) and the ledger (Phase 8) are built **test-first**, exhaustively, because they are where the money is. Everything else is test-first by default and may be pragmatic where it is not load-bearing.
- Property tests carry the invariants that examples cannot: share conservation, ledger conservation, non-negative accrual, append-only.
- **Every invariant listed in R1 A.6 and R2 A.7 has a named test.** Those two tables are the checklist; a row without a test is an incomplete phase.
- Integration tests never mock PostgreSQL. A constraint that has not been exercised against a real database has not been proved.
- Playwright tests are tagged `@phase-N` so each phase's gate runs its own journeys plus every earlier one.
- Fixtures are built by seed scripts (`pnpm seed:phase-N`) that are themselves deterministic — fixed ids, fixed clock — so a Playwright assertion may name an exact amount.
- Money assertions compare decimal strings, never floats. `expect(amount.toString()).toBe("11.44")`, never `toBeCloseTo`.

**Verify chain.** Each phase command runs the previous one first, so a regression anywhere fails the phase that introduced it:

```
verify:phase-0  format + lint + boundaries + typecheck + unit + integration + build + e2e(untagged)
verify:phase-1  verify:phase-0  + e2e @phase-1 + contrast + axe
verify:phase-2  verify:phase-1  + integration(identity) + seed:phase-2 + e2e @phase-2
...
verify:mvp      verify:phase-6  + integration(reporting) + seed:phase-7 + e2e @phase-7
verify:phase-8  verify:mvp      + integration(ledger)    + seed:phase-8 + e2e @phase-8
...
verify:r2       verify:phase-10 + integration(reconciliation) + seed:phase-11 + e2e @phase-11
```

---

## Deployment strategy

Four services, one of them stateful (§11). No Redis, no object storage, no queue — those are answers to measurements the pilot has not taken yet (§11.1).

```
caddy     TLS, trusted_proxies, /r/:code and the app on one certificate
web       Next.js standalone, built by a multi-stage Dockerfile
worker    a scheduler: monthly CSV, retention aggregation, period close, nightly reconciliation
postgres  PostgreSQL 17, the only datastore
```

- Environments: `compose.yaml` for local development (dev + test databases), `compose.production.yaml` for the VPS.
- Migrations run from the deployed image at container start, before the app accepts traffic.
- Every generated Prisma migration is diffed against the relevant spec appendix before it is applied. The appendix is the contract; Prisma is the tool.
- Nightly `pg_dump` to offsite storage, with a **restore rehearsed before Phase 7 ships and again before the first invoice is issued**.
- Secrets in `.env`, never committed. `FINGERPRINT_SECRET`, `AUTH_SECRET`, and the database URL have no fallback values anywhere in the build.
- Structured JSON logs; `/api/health/live` independent of PostgreSQL, `/api/health/ready` dependent on it; an external uptime ping against `live`.
- VPS region chosen for proximity to Georgian traffic — with no edge network, region is the entire latency story.
- Redirect and conversions latency are instrumented from day one, because they are the trigger for the Redis decision (§11.1) and that decision is bought against a measurement, never a forecast.

---

## Blocking non-code gates

These are not tasks in any phase plan. They are conditions on shipping, and they are listed here so no phase quietly proceeds past one.

| Gate | Blocks | Source |
| --- | --- | --- |
| Legal review of the `xu_vid` cookie and the `fpHash` under Georgian law and GDPR | Pilot traffic (Phase 7) | §13.2, §1.2 risk 6 |
| Georgian tax treatment of creator payouts, and who issues which document | Pilot traffic (Phase 7) | §13.3 |
| Ownership and review of both launch locales | Pilot traffic (Phase 7) | §13.4 |
| The commercial terms the CSV settles against | Pilot traffic (Phase 7) | §13.5 |
| **Does receiving brand money and paying creators make SHUAMO a payment service provider?** | Collecting a single lari (Phase 10) | R2 §10.1 |
| Must SHUAMO withhold on creator payouts, and is its VAT base the fee or the whole invoice? | Collecting a single lari (Phase 10) | R2 §10.2 |
| May `Σ AVAILABLE` go negative for a creator? | The cancellation-after-payout path only (Phase 10) | R2 §10.3 |
