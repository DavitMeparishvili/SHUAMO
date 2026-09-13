# Brand product links implementation

Implemented the brand Products → Creators & links workflow from the supplied
`Xurjin-Products-Creator-Links-Implementation-Guide.md` and the two reference boards
in the `Xurjin-Product-Links-Handoff` bundle. This is the brand workspace catalogue,
not the creator-facing Brands discovery page.

## Delivered behavior

- `/en/brand/products` and `/ka/brand/products`: searchable, filtered, paginated
  catalogue with distinct creator/link counts, raw active-link coverage, current
  product offers, and canonical period performance.
- Product creators open in an 860px drawer on desktops at least 1280px wide.
  Direct links and smaller screens use a standalone page. URL query parameters
  retain filters, sorting, period, and return destination.
- Creator groups and individual links paginate in SQL. Filtering precedes
  aggregation and pagination; child pagination does not change parent totals.
- Each link retains its own accepted rate and stored terms snapshot. Missing
  legacy terms are explicitly unavailable. Current product terms never replace
  historical accepted terms.
- Copy, performance, accepted-terms inspection, disable confirmation, and guarded
  restore actions operate on individual owned links. Restoring checks account,
  product, partnership, and existing-active-link eligibility.
- Lifetime link counts remain distinct from selected-period metrics. Analytics
  reuse the existing Performance attribution SQL and Asia/Tbilisi sale-date
  semantics. Confirmed commission does not imply payout.
- Metrics failures preserve catalogue, creator, and link identities with an
  unavailable notice. Complete data failure uses the route retry state.
- Brand primary navigation leads through Products; the legacy All tracking links
  view remains available from Performance. Creator navigation is preserved.

## Validation — 2026-09-13

- Production build and TypeScript check passed.
- Full unit suite: 436 tests passed across 89 files.
- Targeted integration suites: 25 tests passed across product workspace (8),
  existing Performance (3), product link creation, and link minting (14 combined).
  Coverage includes canonical metrics/cancellations, lifetime coverage, empty
  products, saved rates, code/name filtering, pagination, cross-brand ownership,
  scoped mutations, restore conflicts, and fallback after early or later SQL
  activity failures. Tests use the separate `shuamo_test` database.
- ESLint passed on changed feature sources and brand routes. Prettier checks
  passed on the new workspace sources and stylesheet.
- A fresh reviewer with no conversation context found no critical/high issues.
  Its nested-dialog propagation, mobile touch-target, pagination scalability,
  and metrics resilience findings were resolved and the SQL changes re-reviewed.
- A separate fresh visual reviewer compared the supplied boards with live
  screenshots. Selected coverage outline, unclipped mobile sort, and explicit
  price labels were fixed. Final disposition: **ship**, all three findings resolved.

Playwright MCP exercised the local seeded development server and a temporary
production build server. Verified desktop drawer open/reopen, query updates,
Escape and focus restoration; nested terms dismissal; link disable and restore;
mobile filter draft cancel/apply and return URL; no-links state; creator expansion;
search and clear; catalogue pagination; Georgian layouts; and an unauthenticated
child-links request returning 401. The temporarily disabled seed link was restored.
No development database reset or reseed was performed.

At 1440px, 820px, and 390px, inspected layouts fit the viewport. Axe WCAG 2 A/AA and
2.1 AA checks reported zero violations in the catalogue, expanded drawer, and
mobile creators surface. These checks cover the new surfaces, not a full-app audit.

Screenshots are local artifacts under `.impeccable/review/`:

- `product-links-desktop.png`
- `product-links-drawer.png`
- `product-links-mobile.png`
- `product-links-mobile-creators-top.png`
- `product-links-mobile-creators.png`
- `product-links-tablet.png`
- `product-links-georgian-mobile.png`

## Run locally

Georgian readability follow-up: creator identity/actions and metrics now use
separate rows with flexible metric columns. Georgian sorting/actions use shorter
labels; compact link-table headers abbreviate confirmed labels while the summary
retains the full wording. Filter reset wraps within its rail. The workspace money
formatter pins Georgian separators with Decimal to prevent server/browser ICU
differences causing hydration errors. Playwright verified expanded Georgian
desktop/mobile views and English regression layout, with no horizontal overflow
at 390px, 820px, and 1440px; build, typecheck, and changed-source lint passed.
Independent visual review marked the crowding fixes resolved, disposition ship.

Follow [local-development.md](local-development.md) for startup, persistence,
MinIO, and seed instructions. The existing seeded application runs at
`http://localhost:3001/en/brand/products`. Brand demo sign-in is
`brand@aromashop.ge` with local fixture password `seeded-password-01`.

PostgreSQL and MinIO volumes retain the existing development data and images.
No production hosting deployment or database schema migration is required by
this implementation.
