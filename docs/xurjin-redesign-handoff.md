# Xurjin overview and performance redesign

Implemented against the supplied Xurjin redesign brief and five desktop/mobile PDF concepts. Their figures are illustrative; all displayed results come from scoped database queries.

## Surfaces and behavior

- Creator Overview leads with net earned commission, confirmed attributed product sales, visits, next actions and product rankings. Working links can be copied. The activity feed uses actual issuance/cancellation event dates.
- Brand Overview leads with confirmed attributed sales and creator commission. Pending applications and lifetime activation use current approved partnerships, independently of the sales date range.
- Performance has Summary, Sales & commission, and Link activity. Partner/product/link/date filters persist in URLs. The mobile sheet applies its filters together; changing a parent clears child selections. Sales search/status only narrow the records beneath the cards, whose scope is labeled explicitly.
- Charts use original source-sale dates and current outcomes. Historical cohorts include later cancellations. Long ranges are aggregated directly into at most 90 buckets; no daily allocation across the entire range is required. Clicks use visit dates and are not presented as a conversion funnel.
- Rankings open product/link breakdowns and sales. Sale details show attribution, immutable accepted terms, issued/reversed amounts and timestamps. Desktop uses a side panel; mobile uses a full-screen detail surface with Back and Escape support.
- `/brand/orders` opens the same sales view as Performance. Existing source-order management, including unattributed orders and authorized cancellation, is preserved at `/brand/orders/source`.
- Brand application review shows submission time and public-profile access, then Approve/Reject. Private draft fields are not disclosed. Catalogue-level approval never creates or accepts a product link.
- Profile saves on a published profile stage private `draft_data`, including profile name. Explicit Publish changes updates the public row. Unpublish changes visibility without applying draft contents, so a conflicting staged slug cannot prevent privacy. Publish slug conflicts return a field error.

## Metric basis

The sale grain is a canonical attribution record. Eligible sale value uses the recorded commissionable net of matching product lines after discounts and reported VAT, excluding shipping. Historical catalogue price/rates never replace recorded values. Net commission is the sum of currently confirmed recorded commissions; cancelled recorded commissions are presented as reversals, not subtracted twice. No payout balance, causal revenue lift or unsupported conversion rate is claimed.

Money aggregation uses Decimal. Reporting boundaries and displayed timestamps use Asia/Tbilisi. Unknown historical accepted-term fields and cancellation timestamps are labeled as not recorded. All report, detail, export and filter-option access is constrained to the authenticated account.

## Local setup

For everyday startup, database persistence, demo logins and fresh-install steps, see [Run Xurjin locally](local-development.md).

Apply `pnpm db:migrate:deploy` and regenerate Prisma with `pnpm db:generate`. Migration `20260906120000_profile_staged_edits` adds nullable staging JSON to both profile tables without changing existing public rows.

Existing phase fixtures provide account/product setup. Run `pnpm seed:media`, then `pnpm seed:redesign`. The redesign seed refuses non-local/non-development databases, reuses existing fixture links without rewriting accepted terms, and adds deterministic clicks, sales, cancellation events and partnership states. It is repeatable without duplicating sales. Seeded demo identities include `brand@aromashop.ge`, `nino@creators.ge`, and `mari.redesign@creators.ge`; their fixture password is `seeded-password-01`. These are local test accounts, not production credentials.

## Verification evidence

- Production build, TypeScript, lint, formatting and module-boundary checks passed. All 404 unit tests and 48 targeted integration tests passed.
- Financial integration tests cover owner isolation, recorded accepted terms after product changes, cancellation totals, CSV reconciliation, recent reversal of an old sale and bounded large date ranges.
- Profile integration tests cover private staging, explicit publish, public-name isolation, conflicts on publish, and successful unpublish despite conflicting draft slugs for both roles.
- Playwright MCP exercises desktop/mobile pages, contextual filters, sale details, CSV export and Georgian layouts. Screenshots are in the ignored `.playwright-mcp/` directory; reference PDF renders are under `.playwright-mcp/references/`.
- Screenshot capture must wait for hydration and use `caret: "initial"`. Capturing earlier can inject `caret-color: transparent` into inputs before hydration and produce a tool-induced hydration warning. A clean reload without capture produced no warning; no hydration-warning suppression was added to application code.
- A separate Georgian chart hydration bug was confirmed: Chromium without Georgian ICU support formatted dates in English while Node rendered Georgian. `insight-chart.tsx` now formats dates and amounts on the server and serializes those labels to `insight-chart-client.tsx`. Four hydration regression cases cover both roles and locales with deliberately differing browser date/number formatters, including chart interaction. Actual browser checks compare the initial HTML with hydrated labels.
- Independent reviewer received no conversation history and compared code with the brief and PDF. Findings and follow-up fixes include profile slug/privacy handling, KPI scopes, dependent link filtering, link eligibility filters, application review, event-date activity and bounded chart aggregation.
- The reviewer confirmed no unresolved critical/high findings. Final Playwright checks found no horizontal overflow on both roles' desktop/mobile overview and performance pages, and no WCAG A/AA violations in the scanned performance content and sale-detail dialog.

Local preview runs at `http://localhost:3001`. Creator Performance retains its existing `/en/creator/earnings` URL; Brand Performance uses `/en/brand/performance`. Automatic approval review blocked starting a production server with “blocked by policy”; browser testing used the development server, and production compilation was verified separately.

Design uses the established navy/white/cobalt tokens. Initial off-palette colors and the sheet radius were aligned to DESIGN.md; no design rules were suppressed. The pre-existing DESIGN.md/sidecar freshness notice is outside this redesign and was not repaired as a side effect.
