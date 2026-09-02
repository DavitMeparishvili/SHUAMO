---
name: SHUAMO
description: A creator-performance platform in ink, paper and one electric signal — every number traceable to the rows that produced it.
colors:
  signal: "#4436F5"
  signal-hover: "#3628D6"
  signal-active: "#2A1FAD"
  signal-50: "#F0EEFF"
  signal-100: "#DEDAFE"
  signal-200: "#C0B8FC"
  signal-700: "#2A1FAD"
  ink: "#111318"
  paper: "#FFFFFF"
  slate-50: "#F7F8FA"
  slate-100: "#EFF1F5"
  slate-200: "#8E95A3"
  slate-300: "#858C99"
  slate-400: "#7F8694"
  slate-500: "#6F7686"
  slate-600: "#535A69"
  slate-700: "#3B414D"
  slate-800: "#252A33"
  on-inverse: "#F3F4F7"
  accrued: "#8A5A00"
  accrued-soft: "#FFF4DE"
  settled: "#0B6B4F"
  settled-soft: "#E3F3EC"
  reversed: "#A32A22"
  reversed-hover: "#8E211B"
  reversed-active: "#731A16"
  reversed-soft: "#FBE9E7"
  focus-ring: "rgb(68 54 245 / 0.28)"
typography:
  display:
    fontFamily: "var(--font-geist-sans), var(--font-noto-sans-georgian), system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  h1:
    fontFamily: "var(--font-geist-sans), var(--font-noto-sans-georgian), system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  h2:
    fontFamily: "var(--font-geist-sans), var(--font-noto-sans-georgian), system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  h3:
    fontFamily: "var(--font-geist-sans), var(--font-noto-sans-georgian), system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "var(--font-geist-sans), var(--font-noto-sans-georgian), system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  small:
    fontFamily: "var(--font-geist-sans), var(--font-noto-sans-georgian), system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 450
    lineHeight: 1.5
  caption:
    fontFamily: "var(--font-geist-sans), var(--font-noto-sans-georgian), system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  overline:
    fontFamily: "var(--font-geist-sans), var(--font-noto-sans-georgian), system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.12em"
  figure-lg:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
    fontVariantNumeric: "tabular-nums"
  figure:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
    fontVariantNumeric: "tabular-nums"
  mono:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
    fontVariantNumeric: "tabular-nums"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  pill: "999px"
elevation:
  xs: "0 1px 2px rgb(17 19 24 / 0.05)"
  sm: "0 2px 6px rgb(17 19 24 / 0.06), 0 1px 2px rgb(17 19 24 / 0.04)"
  md: "0 8px 24px rgb(17 19 24 / 0.08), 0 2px 6px rgb(17 19 24 / 0.05)"
layout:
  column: "1160px"
  gutter: "32px"
  gutter-md: "24px"
  gutter-sm: "16px"
  rail: "248px"
  control-height: "44px"
space:
  scale: "4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96"
---

# SHUAMO design language

## Overview — Provenance

SHUAMO exists to answer one question about money: where did this number come from? The interface is built as an instrument, not a dashboard. Every aggregate is a link to the rows beneath it, every forward-looking figure is labelled an estimate, and every amount is set in tabular mono so two numbers in a column can be compared by eye. Ink and paper carry the page. One electric signal marks the single thing to do next. Three state tones — accrued, settled, reversed — carry money's only three conditions, and they are always accompanied by words.

## Colors

Signal indigo is the one accent: primary action, active navigation, and the focused control's ring — nothing else. The slate ramp is a true neutral from paper to near-ink. `slate-200` is the default hairline, `slate-300` the interactive border, `slate-500` muted text, and `slate-700` body copy. Accrued, settled, and reversed are used for money state and never as decoration.

## Named rules

- **The White-On-Signal Rule.** Text on `signal` is always `paper`. Ink on indigo fails contrast and is never used, including hover and active.
- **The Money-Is-Mono Rule.** Every GEL amount — anywhere, at any size — is set in Geist Mono with `font-variant-numeric: tabular-nums`. Prose numbers are not money.
- **The Provenance Rule.** Every aggregate figure links to the rows that produced it. A total the user cannot open is a total the user cannot check.
- **The Estimate Rule.** A forward-looking number carries the word “estimate” in its visible label, in both locales. Catalogue price is display-only and the real commission always comes from the postback.
- **The Single-Signal Rule.** One indigo element owns each decision surface. Two competing signals means one of them is wrong.
- **The State-Needs-Words Rule.** Status is never colour alone. Every pill carries its label; a screenshot in greyscale must still be readable.
- **The Equal-Script Rule.** Georgian may wrap earlier than English, but it is never given a smaller size, a lighter weight, or a truncation English does not get.
- **The Dead-Link Rule.** The offer-ended page is a designed page, not an error page. A buyer who lands there was sent by a creator, and both of them deserve an explanation rather than a stack trace.
- **The Exact-Offer Rule.** Product-offer surfaces show commission type and value exactly, keep every GEL figure in tabular mono, and label catalogue price and calculated creator earnings as estimates. Percent values may be entered for people as percentages, but their stored fraction remains visible to brands where a rate is authored or changed.
- **The Terms-Before-Acceptance Rule.** A creator sees the full current affiliate terms, their version, and their effective date before explicitly accepting an offer. Once a tracking link exists, the decision control becomes a visible notice that the link preserves the accepted version; later edits never masquerade as the original agreement.

## Typography

Geist carries text, Geist Mono every figure, and Noto Sans Georgian is the per-glyph fallback inside the same declaration so one stack serves both locales without a language branch. The hierarchy is the frontmatter scale; half-steps are not part of the ramp.

## Layout

The page uses a 1160px column with 32px gutters, narrowing to 24px below 1180px and 16px below 640px. Workspaces are a 248px rail beside `minmax(0, 1fr)`, collapsing to one column below 1024px and reordered by decision priority rather than source order. Below 640px a bottom tab bar replaces navigation tabs.

Catalogs use density according to the user's job, not according to the product object. Creator discovery may use a two- or three-column image-led gallery so products can be compared visually; brand management presents the same product truth as compact rows with thumbnails, status, exact offer figures, link counts, and one management action. Product detail pairs the gallery with an offer passport on wide screens and stacks the passport immediately after the imagery on narrow screens.

Fixed product types may form a horizontally scrollable category band above detailed filters. The active type uses a flat signal-indigo underline rather than a filled promotional tab. Below 640px, full filters move into a bottom dialog with an active-filter count, while results and pagination remain ordinary URL-backed navigation. Catalogs page explicitly and never substitute infinite scroll.

## Elevation

There are three steps. A card at rest is `xs`; a card that is a destination raises to `sm` on hover and takes a `signal` border with a 3:1 boundary against paper. Nothing in the product is at `md` except a modal and the mobile filter sheet. A hover raise promises a destination — a card that does not navigate does not raise.

## Components

**Button.** A 44px-minimum pill control with signal, outline, ghost, and danger variants. Signal always uses white text. Pending controls stay labelled, expose busy state, and disable themselves without collapsing to a spinner.

**Field.** A labelled 44px control with a slate interactive border, visible focus, optional hint, and repair-specific error copy. Labels, hints, errors, required state, and disabled state are available to assistive technology.

**Select.** The field contract applied to a native select, retaining native keyboard and platform behaviour while sharing the same labelled, described, and invalid states.

**Card.** A quiet paper surface with a hairline and `xs` depth. Only linked destination cards may raise, enforcing the promise attached to elevation.

**Figure.** A labelled value with visible hint or estimate copy. Aggregates accept a destination so the Provenance Rule can be expressed by construction.

**Money.** An exact `Money` value rendered with two decimals, the lari sign, tabular mono, and a visible negative sign. It never accepts a JavaScript number.

**StatusPill.** A compact text label mapped to accrued, settled, reversed, or neutral tones. The label is mandatory because state is never communicated by colour alone.

**DataTable.** A real captioned table with scoped headers, right-aligned money columns, tabular figures, and contained horizontal overflow on narrow screens.

**EmptyState.** A deliberate title, explanation, and optional next action. Lists never end in a bare “No results.”

**Banner.** An information, warning, or danger notice whose title and body carry its meaning. Its decorative icon is hidden from assistive technology.

**CopyField.** A labelled mono value with an explicit copy action and visible success feedback. One-time credentials carry an always-visible warning that they cannot be shown again.

**ProductTypeNav.** A fixed-taxonomy catalog navigation band with one text tab per supported product type. Tabs remain in one horizontal row with safe overflow; the current type is announced with `aria-current`, ink text, and a 2px signal underline. Product type is primary organization, while search, commission, status, and sort stay in the filter layer.

**CreatorOfferCard.** A linked, image-led offer card for discovery. A disciplined 4:3 editorial crop leads, followed by brand, fixed product type, product name, optional factual description, estimated price, exact commission, cookie window, and either a view-offer cue or a worded active-link state. Product facts never require hover; hover may only add the small destination crop shift and title colour change promised by the link.

**BrandCatalogRow.** The management-density counterpart to the creator offer card. A compact thumbnail or neutral image placeholder sits beside product type, SKU, worded lifecycle state, title, optional description, estimated price, exact commission, cookie window, link count, and one outline management action. Mobile reflows the same facts into a single card without dropping fields or shrinking Georgian copy.

**ProductImageGallery.** A 4:3 primary image with a neutral empty state, followed when needed by horizontally scrollable square thumbnails. Thumbnail buttons expose selection with `aria-pressed` and a signal border; the main image opens a labelled native dialog for enlargement. Product order determines the primary image, and the editor supports up to eight JPEG, PNG, or WebP images with visible upload, retry, reorder, remove, and primary-image states.

**OfferPassport.** A quiet paper panel that keeps the decision facts together: brand and SKU, estimated price, exact commission, estimated creator earnings, cookie window, and worded eligibility or link state. It may remain sticky beside the gallery on wide screens, but returns to document flow on small screens. The single signal action is either explicit offer acceptance and link creation or, when already accepted, a link-state notice and route to the preserved tracking link.

**AffiliateTerms.** A complete, readable definition list rather than collapsed legal decoration. Payout timing, allowed channels, prohibited promotion, regions, coupon policy, returns, content requirements, special conditions, offer period, version, and update date remain visible before acceptance. Empty clauses are named as unspecified or unrestricted instead of silently disappearing.

**MobileFilterSheet.** A 44px-minimum outline trigger opens the catalog filters in a native bottom dialog below 640px. The trigger carries a word label and a numeric active-filter count; the sheet has a sticky title and explicit close control, uses `md` elevation, and retains the same labelled native fields and URL query contract as desktop.

**CatalogPagination.** Explicit previous and next destinations flank a bounded set of page links on wider screens. The current page uses the one signal fill with paper text and `aria-current`; mobile replaces the number strip with a visible “Page n of n” summary while preserving the same URL-backed previous and next controls.
