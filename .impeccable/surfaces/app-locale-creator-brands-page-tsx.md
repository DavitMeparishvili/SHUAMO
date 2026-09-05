---
version: 1
slug: "app-locale-creator-brands-page-tsx"
primary_target: "app/[locale]/creator/brands/page.tsx"
related_targets: ["app/brands.css", "src/modules/partnerships/ui/brands-directory.tsx", "src/modules/shell/ui/site-frame.tsx"]
mode: "operate"
---

# Creator Brands

The user-provided desktop and mobile Brands mockups are the composition authority.
Inherit the existing Xurjin navy shell, blue actions, Manrope/Georgian typography,
pale working surface, fine borders and compact product photography.

- Unify creator collaboration applications and brand discovery at
  `/{locale}/creator/brands`; authenticated creators entering the public directory
  redirect here. Anonymous public discovery and brand profiles remain available.
- A heading and search precede five visible application filters: All brands,
  Approved, Pending, Rejected, Not applied. Counts respect search and secondary
  filters but remain independent of the selected application state. Platform
  approval gates entry; it is never represented as creator application approval.
- Desktop uses left filters and a unified list. Each row has photo, linked name,
  tagline, category/location, application state and one primary action.
  Mobile uses wrapping status pills, compact rows with inline state badges,
  and a bottom sheet with draft edits, reset, result preview, apply and cancel.
- Approved browses brand products. Pending views application date and status.
  Rejected views the recorded outcome without inventing a reason. Not applied
  sends an application with pending/error/success feedback. Published profile
  links work in every application state; unpublished profile data stays private.
- Category and interest choices come from actual published profile values.
  Location supports canonical choices and legacy bilingual city searches.
  URL state preserves filters, sorting and browser Back. Empty results have reset.
- Brand navigation replaces the creator Collaborations label and is visible in
  the mobile tab bar. The brand-owner collaboration workflow remains available.
- English and Georgian share hierarchy; translated content may wrap. Preserve
  focus, keyboard dialogs, visible state labels, reduced motion, readable contrast,
  and zero horizontal overflow from 320px to desktop widths.
- Demonstration brands and photos are identified as illustrative in their
  profiles and fixture documentation. Existing Aromashop profile content is kept,
  so categories and imagery can differ from the mockups' illustrative values.

Review captures: `.impeccable/review/desktop.png`, `mobile.png`,
`mobile-approved.png`, `mobile-filters.png`, and `mobile-ka.png`.
