# Creator Shop — Design

Date: 2026-11-07
Status: Draft for approval

## Intent

Creators put one link in their social bio. A follower taps it, lands on the
creator's public Xurjin profile (`/{locale}/creators/{slug}`), and should
immediately see a catalog of the products the creator recommends: a square
photo, the brand, and the product name, so the right item is easy to spot. A
tap opens the brand's real product page through the creator's existing
tracked link (`/r/{code}`), so the click is counted and the creator earns
commission exactly as with any other Xurjin link.

This is the "link in bio shop" pattern used by LTK, ShopMy, Linktree Shop and
Shopify Collective. It should look and feel as polished as those, on phones
first and on desktop.

Creators need full control over what appears and in what order, so the page
never feels overloaded.

## Goals

- A **"Shop my picks"** section on the public creator profile, placed directly
  after a compact identity header (photo, name, location, tagline, social
  icons) and before the rest of the profile (bio, formats, full social links,
  featured work). See "Placement" below.
- Each item is a card: square product photo, brand name (small overline), and
  product name (max 2 lines, truncated). The whole card is the link. No price.
- Grid: 2 columns on phones, 3 on tablets, 4 on desktop. The first 12 visible
  items render; a "Show more (N)" button reveals the rest in place.
- Clicking a card goes to `/r/{code}` (the creator's tracked link), opening in
  a new tab on desktop. Click recording and redirect are reused unchanged.
- A new **"Shop" tab** in the creator profile editor where the creator can:
  - add products from their own existing Xurjin tracking links (no limit),
  - show/hide each item with a switch (hidden items stay in the list),
  - reorder by drag-and-drop (mouse and touch) and via a "⋯" menu with Move to
    top / Move up / Move down / Move to bottom / Remove from shop,
  - filter the list by All / Shown / Hidden (useful on phones),
  - see a live phone-sized preview of the public grid (desktop only),
  - open their public profile.
- An **"Add to shop" / "✓ In shop"** toggle on each link in the existing
  creator Links page (`/{locale}/creator/links`).
- Shop changes **go live immediately** (decided). They do not go through the
  profile's draft → Publish flow. The UI shows a small "Saved" status.
- Items that aren't currently eligible (brand disabled, partnership removed,
  product archived/disabled, no active link, offer not started or ended, no
  photo) are automatically left off the public page and shown to the creator
  with a reason tag (e.g. "Offer ended · not shown"). They come back automatically if the link becomes
  usable again. The creator's own show/hide choice is never changed by this.
- Works in Georgian and English, accessible (keyboard reorder, labelled
  switches, axe-clean), and covered by unit, integration, and e2e tests on
  desktop and Pixel 7.

## Non-goals

- No prices, sale badges, or stock state on cards.
- No outside affiliate links (Amazon, arbitrary URLs). Only Xurjin tracking
  links the creator owns.
- No collections/tabs/categories inside the shop (possible later).
- No custom per-item photo or title overrides; cards use the brand's catalog
  data (first product image, product title).
- No new analytics dashboard. Shop clicks are ordinary link clicks and already
  show up in existing performance views.
- No change to the Featured work section, the redirect, or click recording.

## Anti-goals (would be failure even if it "works")

- The shop looks like a generic admin list or a plain link list on mobile
  rather than a product catalog.
- A follower can hit a dead link from the public shop (an ended offer must
  never be shown publicly).
- A creator's hidden or removed item appears publicly.
- Reordering is fiddly or impossible on a phone.
- Shop clicks bypass `/r/{code}` and lose attribution.

## Current state (what we build on)

- Public profile: `app/[locale]/creators/[slug]/page.tsx` renders
  `src/modules/profiles/ui/creator-profile.tsx`; data via
  `getPublicCreatorProfile(slug)` in
  `src/modules/profiles/infrastructure/prisma-profile-repository.ts`. It only
  returns `PUBLISHED` profiles of `APPROVED` creators.
- Catalog data: `Product` (`prisma/schema.prisma`) has `title`, `imageUrls`
  (first = primary), `status`, `offerStartsAt`, `offerEndsAt`, and `brand`.
- Affiliate links: `TrackingLink` (creator + product + unique `code`,
  `status`). Usability rules live in
  `src/modules/partnerships/domain/disable-chain.ts` (`resolveLink`). The
  `/r/[code]` route (`src/modules/tracking`) records the click and redirects,
  or sends visitors to `/offer-ended`.
- Creator links listing: `app/[locale]/creator/links/page.tsx` using
  `listCreatorLinkCatalog` and `LinkList` from `src/modules/partnerships`.
- Profile editor: `src/modules/profiles/ui/profile-editor.tsx` with tabs
  `details | media | work | links`. All of these sit inside one `<form>` that
  saves to `draftData` and requires Publish.
- Existing reorder patterns to borrow from: up/down in
  `src/modules/profiles/ui/creator-work-editor.tsx`, native HTML5 drag in
  `src/modules/catalog/ui/product-form.tsx`. There is no DnD library and no
  third-party UI kit; the in-house design system is
  `src/modules/design-system/ui/`.
- Architecture: hexagonal modules (`domain/application/ports/infrastructure/
  http/ui`), imported only through each module's `index.ts`, enforced by
  `pnpm verify:boundaries`.

## Design

### Data

New table `CreatorShopItem` (`creator_shop_item`):

| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `creatorId` | uuid FK → Creator | |
| `productId` | uuid FK → Product | unique together with `creatorId` |
| `position` | int | 0-based order within the creator's shop |
| `visible` | boolean, default `true` | the creator's show/hide choice |
| `createdAt` / `updatedAt` | timestamptz | |

- Index on `(creatorId, position)`.
- **Keyed by product, not by tracking link** (author's call, from builder
  check). A creator can hold several links for the same product over time,
  but at most one active one (partial unique index
  `tracking_link_one_active_product_creator`). When a brand disables a link,
  the creator can mint a new one. Keying by product means the item keeps its
  position and hidden state, and it automatically uses the creator's
  **current active link** for that product. No duplicate rows appear, and the
  item "comes back" when a new link is minted.
- An item may only be added for a product where the creator has an active
  tracking link (enforced in the application layer). At render time, the
  item resolves to that creator's active link for the product. If there is
  none, the item is not shown publicly and is tagged in the editor.
- Deleting a row = "Remove from shop"; it never touches any tracking link.
- New items are added at the **top** (position 0, others shift down), matching
  how LTK/Linktree surface the newest pick first.

A separate table (rather than a JSON column on `CreatorProfile` like
`featuredWork`) is chosen because items reference live tracking links, need
referential integrity, and are saved independently of the profile draft.

### Public visibility rule

An item is shown on the public profile only if **all** of:

1. `visible = true`;
2. the creator has an active tracking link for the product and
   `resolveLink(...)` is active for it (brand approved, partnership approved,
   product not archived, link active);
3. `Product.status = ACTIVE`;
4. the offer window is open: `offerStartsAt` is null or ≤ now, and
   `offerEndsAt` is null or > now;
5. the product has at least one image.

Rule 5 keeps the catalog look intact. In the editor, an item that fails a
rule is tagged with the reason: "Offer ended", "Not started yet", "No photo",
or "Link unavailable", each followed by "· not shown".

Note: the `/r/{code}` redirect does **not** check the offer window today, so
an "ended" offer still redirects to the brand. Hiding such items from the
shop is a deliberate choice for a clean catalog. It does not mean the link is
dead, and the redirect is not changed by this work.

**What the picker offers** (author's call): any product for which the
creator has an active link that passes `resolveLink`. This includes offers
that haven't started yet and products without a photo. Those can be added
and arranged ahead of time; they carry their tag and appear publicly
automatically once they satisfy the full rule. The Links-page "Add to shop"
button uses the same condition.

The rule lives in one pure domain function. The public query and the editor's
status tags both use it, so they cannot drift apart.

### Module placement

The shop belongs to the **profiles** module (it is part of the creator's
public profile), reading link/product state through a port.
`partnerships` already owns links; the profiles module should not import its
internals. The builder decides the exact port shape. It must pass
`pnpm verify:boundaries`.

### Creator management (Shop tab)

- Lives in `profile-editor.tsx` as a fifth tab, **"Shop"** (ka/en strings),
  creator role only. It renders **outside** the draft `<form>`. It is its own
  component with its own server actions that save instantly, so it neither
  marks the profile dirty nor waits for Publish. The leave-guard must ignore
  it.
- Server actions (creator-authenticated, ownership-checked):
  `addShopItems(productIds[])`, `removeShopItem(productId)`,
  `setShopItemVisible(productId, visible)`,
  `reorderShopItems(orderedProductIds[])`. All are keyed by product id, which
  is unique per creator.
  Reorder sends the full ordered id list and the server rewrites positions in
  a transaction. Ids that don't belong to the creator are rejected.
- Optimistic UI (`useOptimistic`) with a "Saving… / ✓ Saved / Couldn't save,
  retry" status line. A failed action rolls back the list.
- **Add products** opens a picker (a dialog on desktop, a bottom sheet on
  phone) listing the creator's products that have an active link and are not
  yet in the shop, with search, thumbnail, brand and name. It supports
  multi-select and "Add (n)". See "What the picker offers" above.
- Rows: drag handle ⋮⋮, 48px thumbnail, brand overline, name, show/hide switch
  (with accessible label "Show on profile"), ⋯ menu. Hidden rows are dimmed.
  Unusable rows carry the warning tag and their switch still works (it records
  intent). A header line shows "N shown on profile · M hidden".
- Drag-and-drop must work with both mouse and touch. Use Pointer Events on the
  handle, with a lifted/shadowed dragging state and an auto-scroll near the
  edges. Keyboard: the handle is focusable, and Space picks up, arrows move,
  Space drops, Esc cancels, with live-region announcements. The ⋯ menu covers
  anyone who doesn't drag.
- Phone layout: All / Shown / Hidden filter chips; the ⋯ menu opens as a
  bottom sheet. Drag is only active in the "All" filter, since order is global.
- Desktop: two columns. The list is on the left and a live phone preview is on
  the right, showing the first visible items exactly as the public grid
  renders them (reuse the public card component).
- Empty state: an illustration-free EmptyState explaining the shop, with a
  primary "Add products" button. If the creator has no tracking links at all,
  the state links to the Links page instead.
- Since the shop only appears on a published profile, show a small banner when
  the profile is not published ("Your shop will be visible once your profile
  is published").

### Links page shortcut

Each link in `LinkList` (creator view) gets an "Add to shop" button that
toggles to "✓ In shop". Clicking "✓ In shop" removes the item. It reuses the
same server actions. Disabled/ended links don't show the button.

### Public shop section

- Rendered by a new `CreatorShop` component inside `creator-profile.tsx`.
  Heading "Shop my picks" (ka/en) with a count. If there are zero publicly
  visible items, the section is not rendered and the page looks exactly as
  it does today.
- **Placement** (follows the approved mockup, option A): on a phone the shop
  must be the first content below a compact header. Today a single
  `creator-intro` section holds portrait, name, location, tagline, bio,
  categories and facts, with socials in a separate section after it. When the
  shop has items, split it:
  - **Compact header:** portrait, name, location and tagline, plus a row of
    small round social icons (links to the same social URLs).
  - **Then the shop.**
  - **Then the rest, unchanged:** bio, categories and facts, the full social
    links section, featured work, and the action/disclosure area, in their
    current order.

  This requires restructuring the `creator-intro` markup and its grid in
  `app/profiles.css`. That is in scope. On desktop the header may stay
  side-by-side (portrait + identity) as long as the shop follows directly
  after it.
- Data: `getPublicCreatorProfile` (or a sibling query called by the page)
  returns the ordered visible items: link `code`, product title, first image
  URL, and brand display name. It is one query with no N+1.
- Card: an `<a href="/r/{code}">` wrapping a 1:1 image (`object-fit: cover`,
  `--radius-md`, slate-100 placeholder background), brand overline
  (`--type-overline`), name (`--type-small`, weight 600, 2-line clamp), and a
  small ↗ affordance on the image. Hover on desktop is a subtle image zoom and
  a darker name. Visible focus ring uses `--color-focus-ring`.
  `rel="sponsored noopener"`, `target="_blank"` on desktop pointer devices
  (same tab is fine on mobile; the builder picks the cleanest approach). The
  accessible name is "{brand} – {product}, opens shop".
- Images: lazy-loaded after the first row, with explicit width/height or
  aspect-ratio to avoid layout shift. Use the same image delivery approach the
  profile already uses for featured work.
- Grid spacing follows the tokens (`--space-12/16/24`). It has a 16px side
  gutter on phones, no horizontal scroll, and tap targets ≥ 44px.
- "Show more (N)" reveals the remaining items client-side. All items are
  server-rendered, and the button only toggles visibility, so content stays
  crawlable.
- The existing disclosure line ("contains affiliate links" or equivalent) must
  appear near the shop when the shop is shown. Reuse the existing disclosure
  copy if it fits; otherwise add a short ka/en line.
- Visual polish follows the project's design system (`DESIGN.md`, tokens,
  `app/profiles.css`). No new fonts or off-palette colors.

## Testing

- Unit: the visibility rule (each condition), reorder position rewriting,
  ownership rejection, editor interactions (switch, ⋯ menu moves, keyboard
  reorder, filter chips), public card rendering and "Show more".
- Integration (test DB): add/remove/toggle/reorder actions, the public query
  returns only eligible items in order, and items disappear when a product is
  archived or an offer ends and reappear when restored.
- E2E (desktop + Pixel 7, axe): a creator adds links, hides one, reorders, and
  sees the result on the public profile. A follower taps a card and lands on
  the `/r/{code}` redirect. Per the project's tester practice, phone viewports
  are covered too.

## Left to the builder

- Exact port/adapter shape between profiles and partnerships.
- Drag implementation details (Pointer Events vs. extending the native DnD in
  `product-form.tsx`), as long as touch and keyboard work as described.
- Exact ka/en copy beyond the strings named here.
- Whether the picker is a `<dialog>` or a custom sheet, as long as it is
  accessible and phone-friendly.
