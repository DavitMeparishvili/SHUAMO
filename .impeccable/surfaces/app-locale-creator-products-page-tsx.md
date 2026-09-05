---
version: 1
slug: "app-locale-creator-products-page-tsx"
primary_target: "app/[locale]/creator/products/page.tsx"
related_targets:
  [
    "app/[locale]/products/page.tsx",
    "app/discovery.css",
    "src/modules/catalog/ui/discovery-controls.tsx",
    "src/modules/partnerships/ui/product-offer-gallery.tsx",
    "src/modules/partnerships/ui/discovery-card-actions.tsx",
    "src/modules/shell/ui/site-frame.tsx",
    "app/[locale]/creator/products/[id]/page.tsx",
    "app/[locale]/brand/products/page.tsx",
    "app/[locale]/brand/products/[id]/page.tsx",
  ]
---

# Catalog surfaces

- Scope: creator product discovery at `app/[locale]/creator/products`, creator product detail, and the sibling brand catalog management surfaces. Mode: Operate.
- Audience and job: approved creators browse eligible offers, compare exact terms, inspect imagery and product facts, then explicitly accept one offer; brands publish, filter, update, and archive their own offers.
- Direction: reference-led discovery workspace. The creator list is image-led with a persistent desktop filter sidebar, three photo cards across and compact product rows on mobile. Product detail follows the supplied desktop/mobile product-details reference, with a large gallery, commission offer card and grouped affiliate terms. The brand list uses the same visual language at management density with thumbnails rather than a promotional grid.
- Memorable moment: product photography leads discovery while commission and terms remain immediately comparable and traceable. The former category-gallery comp is historical; replacement Xurjin screenshots and DESIGN.md now govern the visual system.
- Visual contract: the existing information structure inherits Xurjin navy framing, pale workspace, white rounded surfaces, blue-purple identity and Manrope/Noto Sans Georgian. The product editor keeps its intrinsic width constrained for mobile wrapping.
- Constraints: Georgian and English parity, WCAG 2.2 AA, URL-backed filters and pagination, at most eight product images, no infinite scroll, no hover-only information, and immutable accepted affiliate terms on creator links.

## Product detail reference contract

- Evidence: user-provided `codex-clipboard-Oys6IK.png`, with desktop on the left and mobile on the right. Apply its composition within the incumbent Xurjin shell; keep product imagery, title, description, SKU and financial amounts sourced from records.
- Desktop: a 1.48:1 two-column grid puts the 1.45-aspect photo and description on the left, with product identity and a white offer card on the right. A full-width affiliate terms panel follows. The blue commission block leads the offer, followed by paired price/attribution and eligibility/estimated earnings rows, a saved-terms notice, copy action, manage link and store link.
- Mobile at 760px and below: identity, 1.88-aspect photo, offer, description and terms form one column. The centered brand header has back, notification and profile actions. Discover stays active in the bottom navigation. The three native terms disclosures start closed on mobile; payout and attribution starts open on desktop. Every disclosure remains keyboard operable.
- Existing active links display their immutable commission and parsed terms snapshot. Legacy links with missing snapshots explicitly distinguish their saved commission from the current terms shown below. Anonymous and ineligible accounts keep the existing access notices; eligible creators still explicitly accept the version before creating a link.
- Detail styles live in `app/product-detail.css`. Scoped reference colors are blue #075aff, muted slate #53698f and separator #dce5f3; status, supporting ink, hover and selection colors reuse shared tokens. No marketing facts or collection subtitle are invented.

## Discovery reference contract

- Evidence: `Temp/codex-clipboard-0rI1gz.png` and `Temp/codex-clipboard-0ZNj0V.png` govern this discovery redesign. Implementation captures are `.impeccable/review/desktop.png`, `.impeccable/review/mobile.png` and `.impeccable/review/mobile-filters.png`. The reference composition guides density and hierarchy; its pictured products, counts and claims are not product data.
- Desktop: Discovery inherits the same 244px rail (220px at 1250px and below) and 78px top bar as creator links. The catalog uses the full remaining width; its filter sidebar starts immediately beside the navigation, with no centered outer gap. Explicit `auto 1fr` rows prevent tall viewports from stretching the heading. The filter sidebar uses `clamp(200px, 16.9vw, 244px)` and the main gallery defaults to three columns with 3:2 photographs capped at 280px high. Container queries increase the grid to four columns at 1280px of results width and five at 2200px, using additional space without oversized cards. At 640–900px the gallery uses two columns. Desktop product titles and amounts use 18px type, with 14px card padding and 16px grid gaps; filters use 14px, supporting labels 12px and primary controls are at least 44px high. Mobile density stays compact.
- Mobile: below 640px, the centered Xurjin header, search and paired filter/sort controls precede compact rows. Each row has a 96×108px photo (94px wide below 360px), wrapped product identity, exact price, blue commission panel, cookie-window terms and a solid action or worded green active-link/copy strip. The bottom navigation keeps discovery accessible and respects device safe areas.
- Filter sheet: use a named native modal dialog, a handle and 24px top corners, at most 540px wide and 88dvh high. Its 25px title shows the draft's active-filter count, alongside reset and explicit close; its scrollable body contains category, product type, commission type and brand, with 54px minimum group-summary rows. A persistent apply footer shows the real matching-product count and respects the bottom safe area. Opening starts from committed URL filters; reset changes the draft; only Apply commits it. Close, Escape and backdrop dismissal leave committed filters intact. The 220ms entrance is disabled for reduced motion.
- Palette and typography: discovery uses `discovery-accent`, `discovery-accent-hover` and `discovery-soft` from DESIGN.md for solid actions, selected controls and blue commission panels. Xurjin's geometric X, navy framing, Manrope and Noto Sans Georgian remain the identity. Green active-link wording expresses link availability, not a payment state.
- Product truth and actions: search, category, type, commission, brand, sort and pagination remain URL-backed. Counts and preview totals come from the real catalog; product records supply images, prices, commission and cookie terms. Save hearts persist only on the current device, scoped to the creator, and expose pressed state. Copy is an explicit action on an eligible existing link; a blocked clipboard offers a selectable URL. Browsing, saving and changing filters never accept an offer or create a tracking link.
- Pending navigation: optimistic selections reflect the chosen filters while results expose busy state. Guards block duplicate navigation and controls announce `aria-disabled`, preserving keyboard focus during the update.
