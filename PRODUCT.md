# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Approved Georgian brands publish products, set exact creator commission rates, and decide partnership applications. Approved creators apply to brands and copy product-specific tracking links. Administrators curate which accounts may enter the marketplace.

## Product Purpose

SHUAMO makes creator commerce performance traceable from a partnership and tracking link through to the money rows they produce. Success means brands can publish and govern offers while creators can see exactly which links are usable and why any link stopped working.

## Positioning

Every aggregate and commission is traceable to its source rows; catalogue values are explicitly estimates while conversions remain the source of truth.

## Operating Context

Brands maintain a brand-wide catalogue, archive rather than delete products, approve creators, and update offered rates. After partnership approval, creators choose individual active products and create links that snapshot the accepted rate. The product is bilingual in Georgian and English.

## Capabilities and Constraints

- Partnerships are brand-wide; there is no campaign entity.
- Product and partnership changes never create links automatically; creators explicitly accept one product offer at a time.
- One tracking link identifies one creator and product and preserves its accepted commission terms.
- Percent commissions are stored as exact fractions no greater than 1; fixed commissions are exact GEL per unit.
- Product images upload directly to S3-compatible storage with presigned PUT URLs, with at most eight JPEG, PNG, or WebP images.
- Approved brands and creators can publish distinct, bilingual public profiles
  with owner-scoped media and validated external links; public discovery never
  implies ranking or social-performance verification.
- Link availability resolves brand, partnership, product, then link status in that exact order.
- Disabling is forward-looking; existing click attribution remains intact.
- Money and rates use exact decimal values.

## Brand Commitments

The product is named SHUAMO. Its voice is factual, calm, and provenance-led. Existing product and visual commitments are documented in `DESIGN.md`.

## Evidence on Hand

The authoritative product design and roadmap specifications live under `docs/superpowers/specs/` and `docs/superpowers/plans/`. Seed data is illustrative and must not be presented as customer proof.

## Product Principles

- Make every financial number traceable.
- Name state in words; never rely on colour alone.
- Surface dangerous rate and lifecycle consequences before the user commits.
- Preserve historical records while changing future behavior.
- Give Georgian and English equal typographic weight and room.

## Accessibility & Inclusion

WCAG 2.2 AA is required. Georgian and English receive equal hierarchy, size, and non-truncated space.
