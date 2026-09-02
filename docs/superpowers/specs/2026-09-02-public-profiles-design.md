# SHUAMO Public Profiles & Discovery Design

**Status:** Approved for Phase 6.5 implementation

**Date:** 2026-09-02
**Placement:** After Phase 6 and before Phase 7

## 1. Purpose

SHUAMO needs a public introduction layer between marketplace approval and a
partnership decision. An approved creator should be able to show the character
and focus of their work. An approved brand should be able to show the products
and collaboration environment it offers. Anyone may read and share a published
profile; only the opposite approved SHUAMO role may start a partnership.

This phase deliberately uses two role-specific presentations over one set of
publication, localization, media, discovery, and authorization rules:

- a brand profile is a **Collaboration Passport**: stable identity, product
  world, and collaboration interests;
- a creator profile is a **Proof Ledger**: personality first, then clearly
  sourced public channels and featured work.

Approved composition references:

- [Brand Collaboration Passport](assets/phase-06-5-brand-profile-passport.png)
- [Creator Proof Ledger](assets/phase-06-5-creator-profile-proof-ledger.png)

The references establish composition and information hierarchy, not fixture
claims. Their synthetic people, products, photography, handles, and prose must
not be presented as customer evidence.

## 2. Product invariants

| ID | Invariant |
| --- | --- |
| `PROFILE-001` | A public profile resolves only when its profile is `PUBLISHED` and its owning brand or creator is `APPROVED`. Every other combination is indistinguishable from not found to an anonymous visitor. |
| `PROFILE-002` | A brand or creator can edit and preview only its own profile. Actor identity comes from the authenticated viewer, never a submitted owner ID. |
| `PROFILE-003` | A public CTA may invoke only the existing partnership use cases. A creator applies to a brand; a brand invites a creator. Public profiles do not create a second partnership model. |
| `PROFILE-004` | “SHUAMO approved” describes marketplace account approval only. The UI never implies that SHUAMO verified social ownership, reach, engagement, audience composition, featured work, or commercial claims. |
| `PROFILE-005` | Public output never includes email, API-key material, payout details, earnings, conversions, click data, offered commission rates, or private partnership data. A viewer may see only its own partnership state with the profile owner. |
| `PROFILE-006` | Every external URL is normalized and validated as HTTPS. User-authored HTML, scripts, embeds, and arbitrary icon markup are never stored or rendered. |
| `PROFILE-007` | A public slug is lowercase ASCII, stable, unique within its role, and matched exactly. Slug changes do not leave a redirect containing the previous owner’s content. |
| `PROFILE-008` | Georgian and English interface copy is complete. User-authored localized content may fall back to the other locale, but the fallback is visibly labelled and never silently presented as translated text. |
| `PROFILE-009` | Profile media uses the existing direct-to-object-storage pattern under an owner-scoped `profiles/` key. A presign request cannot target another account or a non-profile key. |
| `PROFILE-010` | Directory order is deterministic and never represents ranking, recommendation, popularity, earnings, or performance. |

## 3. Routes and access

### Public

| Route | Purpose |
| --- | --- |
| `/[locale]/brands` | Browse published approved brand profiles. |
| `/[locale]/brands/[slug]` | Public brand Collaboration Passport. |
| `/[locale]/creators` | Browse published approved creator profiles. |
| `/[locale]/creators/[slug]` | Public creator Proof Ledger. |

The two directories support an optional text query plus category and location
filters encoded in the URL. Results sort by localized display name, with ID as
the stable tie-breaker. The pilot does not need recommendations or full-text
infrastructure.

### Owner workspace

| Route | Purpose |
| --- | --- |
| `/[locale]/brand/profile` | Edit, preview, publish, or unpublish the authenticated brand’s profile. |
| `/[locale]/creator/profile` | Edit, preview, publish, or unpublish the authenticated creator’s profile. |

Preview is owner-only and uses the real public composition with a persistent
draft banner. Workspace profile editors are Operate surfaces; the public pages
are Persuade surfaces.

### Existing marketplace integration

Cards on `/[locale]/brand/creators` and `/[locale]/creator/brands` link to a
published profile when one exists. The partnership action remains visible in
the card/list context, so discovery does not add an unnecessary navigation
step. An unpublished candidate keeps a non-linked identity card.

## 4. Public action matrix

| Viewer | Brand profile | Creator profile |
| --- | --- | --- |
| Anonymous | `Sign in to connect`, returning safely to this profile | `Sign in to connect`, returning safely to this profile |
| Approved creator | Apply, or own `PENDING` / `APPROVED` / `REJECTED` state | View/share only |
| Approved brand | View/share only | Invite, or own `PENDING` / `APPROVED` / `REJECTED` state |
| Profile owner | `Edit brand profile` | `Edit creator profile` |
| Admin | View/share only | View/share only |
| Pending or suspended account | Sign-in/read behavior only; no partnership mutation | Sign-in/read behavior only; no partnership mutation |

The action is one signal-indigo control. Pending and decided states are written
in words, not color alone. Duplicate submissions use the existing unique
partnership constraint and resolve to the existing relationship rather than a
second row.

## 5. Profile content

Both profile types own:

- one role-local unique slug, 3–50 characters, normalized to
  `[a-z0-9]+(?:-[a-z0-9]+)*`, excluding reserved application routes;
- Georgian and English tagline, description, and location values;
- one primary image plus an optional secondary identity image;
- up to five categories;
- zero to five HTTPS social/website links from the supported platform set;
- `DRAFT` or `PUBLISHED` status and publication timestamps.

A profile may save incomplete drafts. Publishing requires a slug, primary
image, at least one locale’s non-empty tagline and description, at least one
category, and at least one meaningful role-specific proof item. Inputs have
explicit maximum lengths and arrays are deduplicated in the domain parser.

### Brand content

- logo and portrait/hero product-world image;
- localized brand story;
- localized “What we make” entries;
- up to four localized collaboration-interest labels;
- up to three featured product IDs owned by the brand.

Only active featured products render publicly. Their public cards show image,
title, and backlink destination, but never catalogue price or commission terms.
Archiving a product removes it from the public profile without mutating the
profile’s saved selection.

### Creator content

- editorial hero portrait;
- localized creator introduction;
- content categories, languages, and formats;
- up to six featured-work items, each with localized title, HTTPS destination,
  and an owner-scoped image;
- the required disclosure that linked profiles and work are creator-supplied
  and that SHUAMO does not verify audience or performance claims.

Follower counts, engagement rates, revenue, conversion counts, testimonials,
reviews, and rankings are not part of Phase 6.5.

## 6. Persistence

Presentation data lives in a new `profiles` vertical slice. Brand and creator
profiles are separate one-to-one records because their proof and rendering
contracts differ. Mutable presentation collections are stored as validated
JSON arrays on their owning profile row; commercial data remains relational.

Required tables:

```text
brand_profile
  id, brand_id UNIQUE, slug UNIQUE, status
  tagline_ka, tagline_en, description_ka, description_en
  location_ka, location_en, logo_url, hero_image_url
  categories text[], what_we_make jsonb,
  collaboration_interests jsonb, social_links jsonb,
  featured_product_ids jsonb
  published_at, created_at, updated_at

creator_profile
  id, creator_id UNIQUE, slug UNIQUE, status
  tagline_ka, tagline_en, description_ka, description_en
  location_ka, location_en, hero_image_url
  categories text[], languages text[], content_formats text[]
  social_links jsonb, featured_work jsonb
  published_at, created_at, updated_at
```

`ProfileStatus` contains `DRAFT` and `PUBLISHED`. The migration adds database
checks for slug shape, array cardinality where PostgreSQL can express it, and
`published_at` matching published state. JSON shapes and HTTPS/platform rules
are enforced by one shared domain parser used at every write boundary.

No profile write modifies the base `Brand.name` or `Creator.displayName` in
this phase. Those approved identity names remain the public headings.

## 7. Media

Profile images use the existing public-read/private-write bucket with new key
families:

```text
profiles/brands/{brandId}/{kind}/{uuid}.{ext}
profiles/creators/{creatorId}/{kind}/{uuid}.{ext}
```

Allowed content types remain JPEG, PNG, and WebP. The client rejects files over
5 MB before requesting a URL, matching product-image behavior; the application
does not claim that a presigned PUT enforces byte size. Stored public URLs must
match the configured public endpoint, bucket, owner prefix, and issued object
kind. SVG and arbitrary remote image URLs are refused.

## 8. Surface direction

### Brand — Collaboration Passport

At desktop width a persistent identity rail owns roughly one third of the
content column: hero/product-world image, overlapping logo, name, tagline,
location, account approval, external links, and the partnership action. The
main column carries the brand story, “What we make,” three featured active
products, collaboration interests, and social channels. The rail becomes the
opening stack on narrow screens; it does not remain sticky when doing so.

### Creator — Proof Ledger

The first viewport is a wide editorial image joined to a concise identity
panel with name, tagline, location, categories, and the partnership action. A
public proof ledger immediately follows: each social destination names its
source, and SHUAMO account approval is explicitly separated from creator-
supplied links. Featured work is image-led and opens its declared destination.
On narrow screens the image leads, the identity and action follow, and proof
items become a vertical list before the work gallery.

Both surfaces inherit `DESIGN.md`: ink, paper, neutral slate, one signal-indigo
action, Geist/Noto Georgian typography, 44 px targets, visible focus, equal
script treatment, restrained elevation, and no invented commercial claims.

## 9. Metadata, safety, and accessibility

- Each public profile returns localized title and description metadata,
  canonical URL, locale alternates, and Open Graph image when a valid profile
  image exists.
- Draft, suspended, and missing profiles return the localized not-found state
  and `noindex`; they do not leak which prerequisite failed.
- External links name their destination and indicate that they leave SHUAMO.
  New-tab links include safe `rel` values; keyboard and screen-reader behavior
  remains native.
- Image alt text identifies the person, brand, product, or work rather than
  repeating adjacent headings. Decorative icons are hidden.
- Directory filters use real labels and preserve a useful empty state.
- Motion is optional and respects reduced-motion; profile content is visible
  without JavaScript animation.

## 10. Explicit non-goals

- direct messaging or public contact emails;
- reviews, endorsements, rankings, popularity sorting, or recommendation
  algorithms;
- automatic social API ingestion, follower counts, engagement analytics, or
  social ownership proof;
- public money, conversion, click, commission, payout, or private partnership
  information;
- custom profile themes, arbitrary HTML, embeds, video hosting, or profile
  domain mapping;
- slug redirect history;
- changes to tracking, attribution, order, reporting, or money behavior.

## 11. Acceptance

Phase 6.5 is accepted when seeded approved brand and creator accounts can save,
preview, publish, share, discover, and unpublish their distinct profiles in
both locales; anonymous users can read only published/approved profiles; an
approved opposite-role viewer can start exactly one existing partnership from
the profile; suspended owners disappear; owner-scoped uploads cannot cross
accounts; no private or unverified metric leaks; and desktop/mobile Playwright
journeys have zero automated WCAG 2.2 AA violations.
