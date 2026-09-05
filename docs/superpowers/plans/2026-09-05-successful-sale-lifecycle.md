# Successful-sale lifecycle simplification

## Decision and scope

An authenticated store conversion webhook asserts a successful sale eligible for
commission. Accept it as CONFIRMED immediately, including sales without creator
attribution. No brand confirmation is required. Keep CANCELLED for whole-order
cancellation. Attribution is determined from canonical attribution records, not
from conversion status. Preserve exact commission snapshots and one order per
click. Existing data is disposable test data, but prefer a forward migration that
preserves it. Keep historical attribution correction fields and core tables.

This change implements the current app end to end. The accounting ledger,
invoices and payments remain in phases 8–10; this decision supersedes their
manual-order-confirmation assumptions. It does not prematurely implement those
phases. Partial refunds and post-payout recovery require separate future policies.

## Implementation

- [x] Migrate conversion status to CONFIRMED / CANCELLED; promote old pending and
  unattributed sales; preserve a confirmation timestamp even after cancellation.
- [x] Confirm webhook intake atomically with item and attribution persistence;
  retain replay/conflict handling, authentication and brand ownership checks.
- [x] Remove CONFIRM actions, pending order reminders and pending earnings totals.
  Derive unattributed explanations from line attribution, independently of status.
- [x] Update order, earnings, performance, navigation, export, and offer copy in
  Georgian and English. Confirmed earnings must never imply paid funds.
- [x] Update unit, integration and browser coverage, fixtures and development docs.
- [x] Align future accounting plans: accrual on webhook; brand approval of invoice;
  release on collected payment; append-only reversals and audited invoice approval.
- [x] Apply migrations, reseed, generate client, run static checks and regression
  tests, build and start the app locally.
- [x] Launch a reviewer without conversation context; resolve high/critical
  findings and record any remaining ones.
- [x] Use Playwright MCP for brand/creator journeys, cancellations and bilingual
  desktop/mobile checks against the running app.

## Accounting phase contract (supersedes earlier plan examples)

Phase 8: insert one ACCRUAL per positive canonical attribution in the webhook's
transaction and current open billing period. A replay must not accrue twice. No
attribution means no accrual; cancelling a sale reverses accrued commission without
changing its original amount. Confirmation time records acceptance; occurrence
time records the store's sale time. Cancellation preserves both.

Phase 9: issue period invoices from immutable ledger entries. Invoice lifecycle
remains DRAFT / ISSUED / PAID / VOID. Add approvedAt and approvedById (AppUser FK)
as an audited acceptance record. Only the owning approved brand may approve an
ISSUED invoice; repeated approval is idempotent. Approval locks the invoice content
and does not change sales, accrue again, or release money. Corrections use the
defined void/reissue or adjustment process, never edits to approved amounts.

Phase 10: require invoice approval before normal payment recording; record an
exceptional early receipt for reconciliation without falsely treating it as
approval. Actual matched brand payment releases only the funded commission from
ACCRUED to AVAILABLE, once. Invoice approval and period close release nothing.
Keep payout DRAFT -> SENT -> PAID / FAILED; failure restores the exact debit.
Before implementing early-receipt reconciliation or disputes, define their
operator workflow explicitly. Never silently discard a real receipt.

## Verification contract

Matched and unmatched successful sales are CONFIRMED on arrival. Unmatched sales
have zero creator earnings and can still be cancelled. Retried webhook delivery
preserves status/timestamps/commission and cannot revive a cancelled sale. The
removed CONFIRM API action returns invalid_body. Cross-brand mutations fail.
Cancellation removes commission from earned totals but retains its historical row.
No order-confirmation reminders or pending earnings controls remain in live UI.

## Completion evidence

- Typecheck, lint, formatting, module boundaries, attribution model verification,
  migration deployment and production build passed.
- Unit suite: 380 tests passed. Integration suite: 90 tests passed, including an
  isolated-schema migration test covering all four old conversion statuses and
  preservation of financial history.
- Eight conversion/performance browser tests passed on desktop and mobile,
  including automatic earnings, dismiss/accept cancellation, replay, history,
  filtering, exports and accessibility checks in English and Georgian.
- Independent reviewer launched with `fork_context: false`: no critical/high or
  material medium defects. Both requested coverage gaps were addressed with the
  migration test and full cancellation browser journey.
- Playwright MCP verified real successful-sale intake, preserved cancelled rows,
  creator filtering and CSV output. Georgian mobile inspection found intrinsic
  width overflow from the trend's visually hidden table; a containing visually
  hidden div fixed it while retaining screen-reader table semantics. The final
  mobile viewport check passed with no console errors after reload.
- Updated production build served locally at http://localhost:3000. No remote
  deployment was performed. No database records needed to be discarded. Removed
  obsolete pending-order banner source/tests; their previous versions remain in Git.
