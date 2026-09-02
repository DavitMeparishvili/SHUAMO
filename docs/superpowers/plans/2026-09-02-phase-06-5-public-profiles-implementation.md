# Phase 6.5 — Public Profiles & Discovery Implementation Plan

> **Execution note for this run:** the repository’s Superpowers plan format is
> used here, but the implementation and review agents must execute directly in
> the primary checkout without loading a Superpowers workflow, creating a
> worktree, or committing. The parent agent makes one final scoped commit after
> implementation, review, browser verification, and fixes.

**Goal:** Give every approved brand and creator a distinct, publishable public
profile that introduces the account, shows appropriate public evidence, and
starts the existing partnership flow.

**Architecture:** Add a `profiles` vertical slice. Separate one-to-one brand
and creator profile records share pure validation, localization, social-link,
publication, and media rules. Public and owner reads go through explicit
repository methods so unpublished or suspended accounts cannot leak. Public
pages are server-rendered; only upload/editor interactions require client code.

**Tech stack:** Existing Next.js 16 App Router, React 19, Prisma 7/PostgreSQL,
Zod 4, MinIO presigned PUT flow, Tailwind 4, Vitest, Playwright, and axe.

**Spec:**
`docs/superpowers/specs/2026-09-02-public-profiles-design.md`. The approved
compositions live beside that spec under `specs/assets/`.

## Global constraints exercised by this phase

- `PROFILE-001` through `PROFILE-010` are named, testable requirements.
- Public queries return only `PUBLISHED` profiles whose owner is `APPROVED`.
- Viewer/owner identity is server-resolved; no mutation accepts a brand or
  creator ID from the form body.
- Public pages expose no money, attribution, conversion, click, credential,
  email, payout, or private relationship data.
- Account approval is not social or performance verification.
- Every interface string exists in `ka` and `en`; user content has an explicit
  fallback state.
- Profile uploads are direct-to-object-storage and owner-prefix scoped.
- Domain code remains framework-, Prisma-, and I/O-free.
- Cross-module imports use module public surfaces.
- WCAG 2.2 AA is required on both desktop and mobile.
- The two approved comps are composition law. Synthetic content is a fixture,
  not a customer or performance claim.

## Planned file structure

```text
prisma/schema.prisma
prisma/migrations/<timestamp>_phase_6_5_public_profiles/migration.sql

src/modules/profiles/domain/profile-content.ts
src/modules/profiles/domain/profile-content.test.ts
src/modules/profiles/domain/profile-slug.ts
src/modules/profiles/domain/profile-slug.test.ts
src/modules/profiles/domain/localized-profile-text.ts
src/modules/profiles/domain/localized-profile-text.test.ts
src/modules/profiles/ports/profile-repository.ts
src/modules/profiles/ports/profile-media-storage.ts
src/modules/profiles/application/save-brand-profile.ts
src/modules/profiles/application/save-brand-profile.test.ts
src/modules/profiles/application/save-creator-profile.ts
src/modules/profiles/application/save-creator-profile.test.ts
src/modules/profiles/application/set-profile-publication.ts
src/modules/profiles/application/set-profile-publication.test.ts
src/modules/profiles/application/create-profile-upload-url.ts
src/modules/profiles/application/create-profile-upload-url.test.ts
src/modules/profiles/infrastructure/prisma-profile-repository.ts
src/modules/profiles/infrastructure/profile.integration.test.ts
src/modules/profiles/infrastructure/s3-profile-media-storage.ts
src/modules/profiles/http/profile-media-handlers.ts
src/modules/profiles/http/profile-media-handlers.test.ts
src/modules/profiles/ui/profile-editor.tsx
src/modules/profiles/ui/profile-editor.test.tsx
src/modules/profiles/ui/brand-profile.tsx
src/modules/profiles/ui/brand-profile.test.tsx
src/modules/profiles/ui/creator-profile.tsx
src/modules/profiles/ui/creator-profile.test.tsx
src/modules/profiles/ui/profile-directory.tsx
src/modules/profiles/ui/profile-directory.test.tsx
src/modules/profiles/index.ts

app/[locale]/brand/profile/page.tsx
app/[locale]/brand/profile/actions.ts
app/[locale]/creator/profile/page.tsx
app/[locale]/creator/profile/actions.ts
app/[locale]/brands/page.tsx
app/[locale]/brands/[slug]/page.tsx
app/[locale]/brands/[slug]/actions.ts
app/[locale]/creators/page.tsx
app/[locale]/creators/[slug]/page.tsx
app/[locale]/creators/[slug]/actions.ts
app/api/brand/profile/media/presign/route.ts
app/api/creator/profile/media/presign/route.ts

scripts/seed-phase-06-5.ts
src/test/e2e/profiles.spec.ts
```

Existing shell navigation, partnership lists, message catalogues, package
scripts, roadmap, R1 scope, and `PRODUCT.md` are modified where called out.

---

### Task 1: Freeze domain contracts and publication validation

**Files:** Create the three `src/modules/profiles/domain/*` implementations and
tests; create the module public surface.

- [x] Define `ProfileStatus = "DRAFT" | "PUBLISHED"`, supported social
      platforms, typed localized values, brand `whatWeMake` entries, creator
      featured-work entries, and the two save-input types.
- [x] Implement slug normalization and validation: lowercase ASCII,
      3–50 characters, single internal hyphens, and an explicit reserved list
      covering application routes such as `new`, `profile`, `settings`, `api`,
      `admin`, `sign-in`, and `sign-up`.
- [x] Implement one shared HTTPS URL validator. Social entries accept only the
      supported platform and valid HTTPS destinations; arrays deduplicate by
      platform. Featured-work destinations are HTTPS.
- [x] Enforce draft limits: localized scalar lengths, at most five categories,
      five social links, four brand collaboration interests, three featured
      product IDs, and six creator work items. Positions are array order.
- [x] Implement `publicationIssues(profile)` so drafts may remain incomplete
      while publish refuses missing slug, primary image, localized tagline and
      description in at least one locale, category, or role-specific evidence.
- [x] Implement localized fallback resolution that returns both the selected
      text and `fallbackFrom`; never pretend fallback content is translated.
- [ ] Unit-test boundary lengths, normalization, reserved slugs, malformed and
      non-HTTPS URLs, duplicate platforms, collection maxima, both role publish
      gates, and both locale fallback directions.

**Gate:** `pnpm test:unit -- src/modules/profiles/domain` and
`pnpm verify:boundaries` pass.

---

### Task 2: Add forward-only profile persistence

**Files:** Modify `prisma/schema.prisma`; create the Phase 6.5 migration,
profile port, Prisma adapter, and integration tests.

- [x] Add `ProfileStatus`, `BrandProfile`, and `CreatorProfile` exactly as the
      design spec’s persistence section requires. Relate each owner one-to-one
      with `onDelete: Restrict`; do not alter approved identity names.
- [x] Use text arrays for scalar tags and JSONB for validated mutable
      presentation collections. Add timestamps and indexes needed by public
      list queries.
- [x] Add SQL checks for slug shape, category cardinality, and publication
      timestamp/state agreement. Migration SQL is reviewed before application.
- [ ] Define repository operations for owner reads/upserts, public slug reads,
      deterministic directory reads, publication transitions, viewer-specific
      partnership lookup, and slug-existence checks scoped by role.
- [x] Public detail and directory methods include the owner approval predicate
      in the database query. Never load a row and forget to check status later.
- [x] Brand public reads resolve only selected, owned, active products and
      preserve the saved selection’s order; output excludes price and rate.
- [ ] Add integration tests for one profile per owner, role-local slug
      uniqueness, database checks, unpublished/suspended exclusion, locale/name
      sorting with ID tie-break, category/location/text filtering, archived and
      foreign product exclusion, and absence of private fields in return types.

**Gate:** `pnpm db:migrate:test`, `pnpm db:generate`, integration tests, and
`pnpm typecheck` pass.

---

### Task 3: Build owner-scoped profile media uploads

**Files:** Create the media port, application use case, S3 adapter, handler,
routes, and tests.

- [x] Support explicit media kinds: `brand-logo`, `brand-hero`,
      `creator-hero`, and `creator-work`. Map content type to extension; never
      accept a filename or object key from the client.
- [x] Generate keys only under
      `profiles/brands/{authenticatedBrandId}/...` or
      `profiles/creators/{authenticatedCreatorId}/...`.
- [x] Reuse the configured bucket/public endpoint and presigned PUT behavior,
      without weakening product-image authorization.
- [x] Route wrappers resolve the authenticated role before invoking the
      dependency-injected handler. Wrong role is 403, anonymous is 401,
      unsupported type is 422.
- [x] Validate profile media URLs again when saving a profile: correct public
      origin, bucket, actor prefix, media kind, and extension. Arbitrary remote
      images and another owner’s issued URL are refused.
- [ ] Unit-test every MIME type, role mismatch, owner prefix, kind, and storage
      failure; prove invalid requests never call storage.

**Gate:** profile media unit/route tests and `pnpm typecheck` pass.

---

### Task 4: Implement owner save, preview, publish, and unpublish flows

**Files:** Create the save/publication use cases, route actions, owner pages,
editor UI, and tests.

- [x] Owner save functions accept parsed form content plus authenticated owner
      identity injected by their route action. They validate selected products
      belong to the brand and all stored media URLs belong to the actor.
- [x] Publication is a distinct command. It loads the saved profile, runs
      `publicationIssues`, stamps `publishedAt`, and returns field-addressable
      issues instead of throwing generic errors. Unpublish returns to `DRAFT`
      and clears `publishedAt`.
- [x] Build one shared editor shell with role-specific sections. It supports
      draft save, direct media upload, ordered creator work, brand product
      selection, preview, publish/unpublish, error summary, field errors, and
      visible pending states.
- [x] The profile editor is linked from each workspace navigation model.
      Navigation remains usable on mobile and carries a translated label.
- [x] Preview renders the real role-specific public component with a draft
      banner and is never reachable for a different owner.
- [ ] Add component tests for keyboard-labelled controls, upload failure and
      retry, maximum-item behavior, publication issues, pending buttons, and
      Georgian copy without English-only truncation assumptions.

**Performance requirements:** keep page wrappers/server reads on the server;
pass only editor data into the client component; start independent owner,
product, and message reads together and await them with `Promise.all`.

**Gate:** unit/component tests, lint, and typecheck pass.

---

### Task 5: Build the two public profile experiences

**Files:** Create public detail pages/actions plus `brand-profile.tsx` and
`creator-profile.tsx` with tests.

- [x] Add a production-visible direction contract as the first body child in
      the locale layout (or an equivalently emitted root artifact), covering
      both approved compositions and the finish requirement. Verify the built
      HTML retains its seed marker.
- [x] Reproduce the brand Collaboration Passport reference: identity rail,
      hero, overlapping logo, approved-account label, external links, CTA,
      story, “What we make,” three product specimens, collaboration interests,
      and social-channel detail. Sticky behavior applies only where it does not
      hide content.
- [x] Reproduce the creator Proof Ledger reference: wide hero/identity split,
      categories, CTA, sourced social ledger, explicit non-verification note,
      and image-led featured work.
- [x] Treat mockup content as synthetic. Seeded fixtures may echo the names but
      public UI must label only real database facts and never invent metrics.
- [x] Generate localized page metadata, canonical URL and language alternates.
      Draft/suspended/missing profiles use `notFound()` without revealing which
      predicate failed.
- [x] Implement the action matrix from the spec. Anonymous sign-in links carry
      a validated internal return target. Opposite approved roles call the
      existing `applyCreatorToBrand` / `inviteCreatorForBrand` services.
      Owners receive Edit; same-role/admin receive view/share; an existing
      relationship renders its written status.
- [x] Revalidate the profile and both relevant marketplace routes after a
      partnership mutation. Concurrent/duplicate action outcomes show the
      resulting existing state and never produce another row.
- [ ] Add semantic/component tests for headings, landmark order, alt text,
      external link names/rel, approval wording, claim disclosure, all CTA
      states, missing optional content, maximum content, and narrow layouts.

**Gate:** public profile unit/component tests, `pnpm build`, and emitted
direction-contract check pass.

---

### Task 6: Add public discovery and connect existing marketplace cards

**Files:** Create the public directory routes/UI; modify the two existing
partnership pages, queries, and cards.

- [x] Build public brand and creator directory pages with localized search,
      category, and location filters stored in query parameters. Empty filters
      are omitted from canonical links.
- [x] Directory cards show only primary image, approved identity name,
      localized tagline/fallback label, location, and categories. Cards are
      real links with destination-card elevation and usable focus state.
- [x] Sort deterministically by localized name plus ID. Do not expose or imply
      rankings, popularity, reach, conversion, or recommendations.
- [x] Update brand-side creator candidates and creator-side brand marketplace
      results to include optional published profile summary and slug. Link the
      identity/summary while preserving the direct partnership action.
- [x] Add anonymous header destinations for Creators and Brands, matching the
      approved public compositions. Keep the signed-in workspace navigation
      task-focused; the profile editor link belongs with its role.
- [x] Prevent query-driven waterfalls: start messages/viewer/results together
      where independent, select only card fields, and do not ship whole profile
      JSON blobs to client components.

**Gate:** directory/query/component tests, lint, and typecheck pass.

---

### Task 7: Complete localization, seeds, browser journeys, and phase gate

**Files:** Modify both message catalogues and package scripts; create the phase
seed and Playwright file.

- [x] Add identical `profile.*`, `directory.*`, metadata, action, disclosure,
      fallback, draft, upload, and validation keys to `ka.json` and `en.json`.
- [x] Create an idempotent `seed:phase-6.5` that builds on Phase 6: published
      Aromashop and Nino fixtures, one draft approved creator, one suspended
      published-row fixture, role-appropriate social/work/product content, and
      no unverified audience/performance claims.
- [x] Use stable fixture images served by the test app or uploaded through the
      real MinIO flow. No test depends on an external image host.
- [ ] Add Playwright desktop and mobile journeys in both locales:
  - anonymous visitor browses both directories and opens both profile types;
  - creator opens Aromashop and applies once;
  - brand opens Nino and invites once;
  - owner edits, previews, publishes, and unpublishes;
  - suspended, draft, and unknown slugs are indistinguishable public 404s;
  - uploaded profile image survives save/reload and unsigned PUT is refused;
  - every exercised page has zero axe WCAG 2.2 AA violations.
- [x] Add direct route assertions that HTML contains no email, API-key prefix,
      payout fields, money, commission rate, conversion, click, or private
      partnership records.
- [x] Add `verify:phase-6.5`: inherited Phase 6 gate, test migration, integration
      tests, build, storage startup/init, dev migration, Phase 6.5 seed, and
      `@phase-6.5` Playwright tests.
- [x] Update `PRODUCT.md`, the R1 scope/deferred table, roadmap dependency graph,
      Phase 6.5 section, spec list, and object-storage wording. Public profiles
      and directories move into R1; social ownership proof/reach stays R3.
- [x] Run formatting, lint, architecture, type, unit, integration, build,
      translation completeness, and profile Playwright checks.

## Required final verification

```powershell
pnpm format:check
pnpm lint
pnpm verify:boundaries
pnpm typecheck
pnpm test:unit
pnpm db:migrate:test
pnpm test:integration
pnpm build
pnpm storage:up
pnpm storage:init
pnpm db:migrate:deploy
pnpm seed:phase-6.5
pnpm test:e2e --grep "@phase-6.5"
pnpm verify:phase-6.5
```

The implementer records commands and results but does not commit. The parent
agent runs the independent diff/spec review, routes all critical and high
findings back for correction, performs the final browser pass, and creates the
single final commit.

## Completion checklist

- [ ] `PROFILE-001` through `PROFILE-010` each have named automated proof.
- [x] Brand and creator profiles reproduce their separately approved
      compositions on desktop and adapt coherently on mobile.
- [x] Owner save/preview/publish/unpublish and scoped media uploads work.
- [x] Public directories and existing marketplace lists reach profiles.
- [x] Partnership CTAs reuse the existing model and are race-safe.
- [x] No private data or unverified metrics appear publicly.
- [x] Both locales, metadata, fallbacks, keyboard behavior, and axe pass.
- [x] Fresh-context review has no open critical or high findings.
- [ ] The final verification gate passes before the parent commits.
