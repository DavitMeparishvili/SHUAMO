---
version: 1
slug: "app-locale-brand-orders-page-tsx"
primary_target: "app/[locale]/brand/orders/page.tsx"
related_targets: ["src/modules/conversions/ui/orders-queue.tsx","src/modules/conversions/ui/orders-queue.module.css"]
---

# Brand orders ledger

- Scope: the brand orders page and its order queue. Mode: Operate. This is a bounded, code-led refinement within the established design system; no comp was produced and no global design changes are introduced.
- Audience and job: approved brands find a recorded order, inspect its products and creator attribution, trace commission to individual line items, and cancel a confirmed sale when appropriate.
- Direction: a compact order ledger in the existing workspace. Status filters and search lead into ruled order summaries, with source details disclosed in place. The page uses the plain workspace surface and its existing title and introduction.
- Visual contract: inherit DESIGN.md's ink, paper, neutral rules, indigo selection, worded status pills, and exact mono money. The active status filter has an indigo underline; a quiet neutral background identifies hover and open rows. Order identity and status lead, followed by product/creator facts and right-aligned commission. Decorative imagery and raised destination cards are unnecessary for this operational surface.
- Filter contract: local search matches order ID, SKU, or attributed creator name, using locale-aware case normalization. All, Confirmed, and Cancelled filters show counts from the full supplied order dataset, independent of the current search. Search and status changes reset the local page to one.
- Pagination contract: show at most ten matching orders per page, preserve the supplied order sequence, and display matching-order count and current/total pages. Previous and next controls appear for multiple pages and disable at the corresponding boundary. Filters and pagination are local component state, not URL-backed navigation.
- Provenance contract: native details/summary rows reveal every original line item with SKU, quantity, creator or explicit no-attribution label, and exact stored commission. Summary product counts use distinct SKUs; repeated SKU rows remain separate in the detail. Creator names are deduplicated only in the summary. Completely unattributed orders receive an explanation in their details.
- Financial contract: successful-sale records are already confirmed; this surface does not approve sales or imply payment. Cancelled orders retain their original commission amount and visibly label it excluded from totals. Confirmed-order details retain the existing cancellation form, consequence warning, and pending label. Cancellation preserves historical source records.
- Responsive contract: below 768px the search fills the available width, visual column headings disappear, and each order summary reflows with identity first, followed by product/creator facts and visibly labelled commission. Expanded line items become two-column definition lists, and the cancellation control fills its row. Long IDs, SKUs, and creator names wrap. Georgian and English use the same hierarchy and space rather than truncating one script.
- Interaction contract: filter buttons expose aria-pressed, search has an associated accessible label, native disclosure retains keyboard operation, and pagination reports results through a status region. Decorative icons are hidden from assistive technology. Existing shared focus styling applies; background and disclosure transitions respect reduced-motion preferences.
- States: an empty order dataset uses the existing explanatory empty state; a filtered no-match result provides an explicit reset clearing search, status, and page. Confirmed, cancelled, attributed, unattributed, repeated-SKU, and multiple-creator orders retain their underlying facts.
- Evidence: documented from the implemented page, queue, and CSS. This record does not claim a separate browser or visual review.
