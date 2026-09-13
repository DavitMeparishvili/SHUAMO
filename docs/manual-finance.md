# Manual finance and admin reporting

Finance records transfers made outside Xurjin. It never sends, verifies, refunds, or recovers money.

## Local setup

Apply migrations with `pnpm db:migrate:deploy`, generate the client with `pnpm db:generate`, then run `pnpm seed:finance`. The seed refuses production and remote database hosts. Its normal rerun preserves recorded demo payments and invoices. `pnpm seed:finance --reset` explicitly clears only the fixed finance fixture accounts' financial records in the local database; invoice counters remain monotonic.

Development-only password: `Finance-demo-only-2026!`. Admin: `finance-admin@example.test`; brand: `finance-brand@example.test`; creator: `finance-creator@example.test`. `finance-report-creator-2@example.test` is a dual-role creator/admin. Report fixtures use separate accounts, with 26 products under Aromashop Reports Demo, including archived, unlinked, disabled-link and zero-activity cases. The independent base brand and creator each earn 300.00 GEL.

Visit `/en/admin/login` or `/ka/admin/login`. Grant an existing authentication account admin capability with `pnpm exec tsx scripts/grant-admin.ts email@example.com`. This is an explicit operator action, audited in the database; registration never grants admin access.

## Balances and payments

`outstanding = confirmed canonical commission − (payment records − reversal records)`

This is an all-time calculation, independent of analytics filters, account approval, partnership approval, and current product/link status. Brand outstanding is money owed to Xurjin; creator unpaid is money owed to the creator. Negative amounts remain visible as brand credit or paid above current earnings. Credits from one account never offset another account's debt.

Open an account in Finance. Record payment received for a brand or record payout made for a creator. Amount prefills only a positive balance and remains editable. Partial payments, prepayments, overpayments, no-invoice transfers and creator payouts before brand receipts are supported. The transfer date is inclusive calendar input and defaults to today in Asia/Tbilisi. Bank reference is optional and not unique. Notes are visible to the account owner. Recorded time and recording administrator are separate from transfer date.

Reverse an incorrect original record with a required correction reason. This retains the original and creates one reversal, restoring the balance once. It does not undo a bank transfer. A corrected replacement is a separate payment. Reversals use the original transfer date for period reporting.

## Invoices

Generate invoices independently for a brand and creator. Brand invoices are payable by the brand to Xurjin; creator invoices are payable by Xurjin to the creator. Edit available party details before generating. Names are required; bank information is optional. Optional platform defaults: `FINANCE_PLATFORM_NAME` (defaults to Xurjin), `FINANCE_PLATFORM_IDENTIFICATION`, `FINANCE_PLATFORM_ADDRESS`, `FINANCE_PLATFORM_BANK`, and `FINANCE_PLATFORM_IBAN`.

Invoice lines equal current eligible commission minus already invoiced commission for each attribution and party. Payments are independent: invoicing after a prepayment does not reduce the new invoice lines. Generating an invoice does not change account balance. Linking a payment to an invoice is reference metadata; it does not allocate or settle the invoice. There is no invoice Paid status.

Issued documents freeze names, details, lines and totals. Cancellation changes current earnings and creates a negative correction on the next invoice, without rewriting the old document or deleting a recorded payment. Review a refreshed preview if earnings changed before issuance. Nonempty zero-total and negative invoices are valid.

Owners and admins can open invoices, Download HTML, and Print / Save as PDF using the browser. Downloads enforce the same owner access as pages. No emails, bank connections, scheduled invoices or server-side PDF renderer are used.

## Performance, products and CSV

`/{locale}/admin/performance` has Overview, Brands, Creators and Products views. `/{locale}/admin/products` opens the same Products report; `/{locale}/admin/products/{id}` provides read-only inspection and a linked-creator breakdown. These routes do not grant access to brand editing tools.

Reports default to the current month to date in Asia/Tbilisi, all brands/creators/product statuses, sales value descending, page 1. Custom dates are inclusive. Clicks use click occurrence time; confirmed canonical sales and commission use conversion occurrence time. Current cancellations are excluded even from older reporting periods. Sales value is the commissionable net of the attributed product's matching SKU items, not current catalogue price. Daily trends cover up to 93 days; longer intervals use monthly buckets, zero-filled across the entire selection.

Commercial metrics follow selected date/brand/creator filters. Platform payments use the selected original transfer dates across all accounts, ignoring commercial account filters. Current balances ignore every filter. Brand/creator rows separately show account-wide period payments and all-time balances; no transfer allocation or product paid/unpaid amount is inferred.

Download CSV exports every matching row, ignoring pagination. Five scopes: `overview`, `brands`, `creators`, `products`, `product_creators`. Overview exports one summary row. Product detail exports linked creators, including zero activity. Stable English headers accompany both English and Georgian values. Products export From, To, Product ID, Product, SKU, Status, Brand ID, Brand, Clicks, Attributed sales, Sales value (GEL), Creator commission (GEL). Brand and creator scopes add their account-wide period payment and all-time balance columns. Overview includes separate platform cash and four current balance totals. Product-creator exports identify the product, owning brand, and each creator. Exact column order is tested against section 4.6 of the implementation plan.

Exports above 10,000 rows return a visible error and no file; narrow the filters. Empty results produce headers only. CSV uses UTF-8 BOM, CRLF, quoted text, spreadsheet formula protection, exact two-decimal money, and private/no-store responses. It excludes bank details, notes and internal audit payloads.

## Verification

Run unit tests, guarded test-database integration tests, typecheck, lint, module boundaries, attribution-model verification, formatting and a production build. The finance and admin-performance Playwright journeys run in English and Georgian on both configured browser projects; they reset only the local finance fixture namespace. Do not run integration-test truncation against the development database.
