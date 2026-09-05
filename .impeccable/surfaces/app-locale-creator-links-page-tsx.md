---
version: 1
slug: "app-locale-creator-links-page-tsx"
primary_target: "app/[locale]/creator/links/page.tsx"
related_targets:
  [
    "src/modules/catalog/ui/discovery-controls.tsx",
    "src/modules/partnerships/ui/link-list.tsx",
    "src/modules/partnerships/ui/discovery-card-actions.tsx",
    "src/modules/shell/ui/site-frame.tsx",
    "app/discovery.css",
  ]
---

# Creator tracking links

- Scope: the creator tracking-link catalog at `app/[locale]/creator/links/page.tsx`. Mode: Operate.
- Audience and job: approved creators find their product-specific tracking links, inspect accepted commission terms and availability, copy a URL, and follow its recorded performance.
- Direction and evidence: inherit the existing Discover Product system directly through `DiscoveryControls`, shared discovery card classes and the workspace shell. The established visual reference is `.impeccable/review/discover-desktop.png`; no separate approved Tracking Links comp exists. The earlier Active Product Gallery seed `de440c92` is historical. `DESIGN.md` governs the existing visual system; this update introduces no system tokens.
- Visual contract: Xurjin navy navigation frames the pale canvas, white photographic cards, solid discovery-blue actions, pale commission panels and Manrope/Noto Sans Georgian typography. Preserve Discover's sidebar width, heading/search placement, category accordion, filter controls, result toolbar, card spacing and image treatment.
- Responsive composition: the shared desktop grid begins with three columns, expands to four at 1280px of results-container width and five at 2200px, and uses two columns from 640px through 900px. Product images share the 3:2 crop and 280px maximum height. Below 640px, cards become horizontal product summaries with 96px by 108px thumbnails (94px wide below 360px); the performance section spans the full row below. The compact mobile shell is shared with Discover and exposes Discover, Links and Profile, with the current destination correctly identified.
- Discovery contract: URL-backed search, category, product type, commission type, brand, resolved status and sorting replace the earlier fixed tabs. Status choices are Active and Unavailable; sorting supports newest, title, brand and highest commission. Category counts and mobile result previews derive from the creator's own search-scoped link facets. Category selection clears an incompatible product-type choice. Database pagination uses 12 items per page, preserves filters, and resets when filters or sorting change. Empty and no-match states remain distinct.
- Filter interaction: desktop selections apply immediately. The named native mobile dialog starts from committed filters, edits a draft, shows active-filter and preview-result counts, and offers Clear and an explicit apply action. Close, Escape and backdrop dismissal cancel draft changes. Its body scrolls while the apply footer remains visible and respects the safe area. Pending navigation exposes busy state and prevents duplicate changes.
- Identification and terms: each card shows actual product imagery or the shared factual no-image fallback, brand, linked title, accepted commission and accepted terms version. Commission comes from the link's stored terms rather than the current product offer; percentages and exact GEL amounts preserve decimal precision. Availability resolves brand, partnership, product and link status in that order and displays either Active or the specific disable reason in words.
- Navigation and copy: the image and title route to `/{locale}/creator/products/{productId}`. The tracking URL appears in a separate utility strip with an explicit Copy control, copied feedback and a copy-error/manual-copy fallback. Visual URL truncation preserves the full copy value and accessible label. Copy does not open the product or tracking destination, and an unavailable link retains its visible reason.
- Performance contract: each card shows its real last-30-days clicks, converted clicks, orders and confirmed GEL amount, or an explicit no-activity state. The View performance action routes to `/{locale}/creator/earnings?link={linkId}&view=links#breakdown`. Confirmed commission does not imply payment.
- Implementation boundary: the creator page opts into `LinkList`'s discovery variant. Existing brand card rendering and brand management controls remain unchanged.
- Constraints: Georgian and English parity, WCAG 2.2 AA, named controls and dialog, visible keyboard focus, reduced-motion support, no horizontal page or utility overflow, and no hover-only operational facts. Long translated labels, status reasons and exact amounts must retain room to wrap.
- Review artifacts: `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png` are the implementation review capture paths. They are evidence for this surface, not separate approved comps or a substitute for interaction and accessibility validation.
