---
version: 1
slug: "src-modules-profiles-ui-profile-editor-tsx"
primary_target: "src/modules/profiles/ui/profile-editor.tsx"
related_targets:
  [
    "app/profiles.css",
    "src/modules/profiles/ui/brand-profile.tsx",
    "src/modules/profiles/ui/creator-profile.tsx",
    "app/[locale]/brand/profile/page.tsx",
    "app/[locale]/creator/profile/page.tsx",
    "app/[locale]/brands/[slug]/page.tsx",
    "app/[locale]/creators/[slug]/page.tsx",
  ]
---

# Profiles: reference-led views and editing

Mode: Operate for the owner editor; Read for the related public and owner-preview views.

Audience and job: Brand and creator owners maintain an accurate collaboration profile, inspect its preview, and deliberately save its visibility. Visitors assess a partner from supplied identity, story, products or work, then use the action allowed by their account and relationship state.

Reference authority: The user's supplied desktop and mobile brand-view, creator-view, brand-editor and creator-editor compositions pin this surface's visual direction. Use white profile content within the navy Xurjin shell, vivid solid blue actions, pale approval/draft status treatments, a wide brand cover with overlapping logo, and the creator's split portrait/introduction. Exact profile tokens and responsive dimensions are recorded in DESIGN.md. This is a profile-only extension of the existing world.

Opening composition: Brand identity and its action follow the cover; the story and featured products lead into interests and social links. The creator portrait shares the first desktop panel with name, location, categories, biography and factual language/format details; socials and featured work follow. On mobile, preserve the reference's adjacent portrait/name opening, then stack biography and facts.

Editor task: Compact underline tabs organize profile content. Preserve media selection, crop/reposition and removal controls, bilingual fields, tag entry, creator formats, links, featured products/work and account settings. Expandable groups keep secondary details accessible. Visibility and approval remain worded states. The mobile savebar remains available above the safe area and replaces workspace navigation while editing; keep enough bottom space for every field to remain reachable.

Evidence and constraints: Display real profile content, images and stored relationships, with factual empty/media fallbacks. Preserve draft versus published state, approval gating, locale fallback, validation, saved/unsaved feedback and existing actions. Account-only fields must not leak into public views. Empty reference areas do not authorize invented followers, claims, work, products or partnerships. Shared product truth and global design rules remain in PRODUCT.md and DESIGN.md.

Unresolved decisions: No new visual decision is pending. Production and functional validation are owned by the implementation task; this brief does not certify their results. Global design sidecar drift is outside this profile documentation scope.

## Profile completion and publication

Private profiles open directly in edit mode after sign-in and workspace entry. A pale neutral setup notice explains the directory consequences, lists missing required fields as focusable actions, and permits continuing privately after a native dialog confirms the consequence. A persistent workspace reminder leads back to setup. Public profile address and the brand offering description sit with primary details; only translations stay in the secondary group. One language is sufficient. The savebar separates Save draft from Save and publish, which saves the current form before publishing. Publishing remains explicit. Public profiles retain a visibility section for unpublishing, and the next sign-in resumes setup again after unpublishing. Mobile save actions wrap above the safe area with matching content clearance.

Creator portraits use a bounded square alongside the introduction: at most 280 px on desktop and 140 px on mobile. This changes display size only, preserving original uploaded media.
