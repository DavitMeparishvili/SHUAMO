# Creator Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creators curate a "Shop my picks" product grid on their public
profile from their own Xurjin tracking links, with show/hide and reorder
that go live instantly.

**Architecture:** A new `creator_shop_item` table, keyed by
`(creator_id, product_id)`, stores visibility and position. Everything
lives in the `profiles` module:
- a pure domain file decides availability and reorder moves;
- an infrastructure file reads and writes items and resolves each product to
  the creator's current active tracking link, using `resolveLink` from the
  `partnerships` index;
- server actions in `app/[locale]/creator/profile/shop-actions.ts` handle
  writes;
- UI is a public `CreatorShop` grid, a client `CreatorShopEditor` tab, and a
  `ShopToggleButton` slotted into the partnerships `LinkList`.

**Tech Stack:** Next.js 16 App Router (server components + server actions),
React 19 (`useOptimistic`, `useTransition`), Prisma 7 / PostgreSQL, zod 4,
Vitest + Testing Library, Playwright (desktop + Pixel 7) with axe, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-07-creator-shop-design.md`

## Global Constraints

- Public cards link to `/r/{code}` only. They never link to `backlinkUrl`
  directly. `rel="sponsored noopener"`, `target="_blank"`.
- No price anywhere in the shop UI.
- Shop writes go live immediately. They never touch `CreatorProfile.draftData`,
  never mark the profile editor dirty, and the leave guard ignores them.
- Public item rule: `visible` AND available. Available means:
  - an active link: an ACTIVE tracking link for the creator and product
    exists and `resolveLink` is active;
  - `Product.status === "ACTIVE"`;
  - `offerStartsAt` is null or ≤ now;
  - `offerEndsAt` is null or > now;
  - `imageUrls.length > 0`.
- Picker / "Add to shop" offers products where the creator has an ACTIVE link
  that passes `resolveLink`. Not-started offers and products without photos
  are allowed.
- New items are inserted at position 0; positions stay contiguous `0..n-1`.
- All writes are keyed by `productId` and scoped to the signed-in creator.
  A productId the creator doesn't own is rejected.
- Grid: 2 columns < 640px, 3 columns 640–1023px, 4 columns ≥ 1024px. The
  first 12 items show, then a "Show more (N)" button.
- All copy in ka + en via `creatorShopCopy(locale)` (inline pattern of
  `profile-design-copy.ts`). No new fonts or off-token colors; use
  `tokens.css` variables.
- Tap targets ≥ 44px; no horizontal page scroll at 360px wide.
- Modules import each other only through `index.ts`. Prisma only in
  `infrastructure/`. Run `pnpm verify:boundaries` before every commit.

## Review Focus

1. **Stale reorder:** a creator reorders in one tab after adding an item in
   another, so the submitted ids ≠ the stored set. Expect the server to
   reject with `invalid_order` and the UI to roll back and refresh, never to
   drop an item. Tested in Task 2 and Task 6.
2. **Brand disables a link, creator mints a new one:** expect the shop item
   to keep its position and switch to the new code. Tested in Task 2.
3. **Product archived after being added, then restored:** expect it to
   disappear publicly with an "Unavailable" tag in the editor, then reappear
   without the creator doing anything. Tested in Task 2.
4. **Long Georgian names on a 360px phone:** expect the name to clamp to 2
   lines and no horizontal scroll. Tested in Task 8.
5. **A large shop (40+ items):** expect "Show more" to reveal every item in
   order and reorder to keep positions contiguous. Tested in Task 2 and
   Task 4.

---

### Task 1: Shop domain rules

**Files:**
- Create: `src/modules/profiles/domain/creator-shop.ts`
- Test: `src/modules/profiles/domain/creator-shop.test.ts`
- Modify: `src/modules/profiles/index.ts` (add `export * from "./domain/creator-shop";`)

**Interfaces:**
- Produces:
  - `type ShopAvailability = "available" | "unavailable" | "not-started" | "ended" | "no-photo"`
  - `interface ShopItemFacts { linkActive: boolean; productActive: boolean; offerStartsAt: Date | null; offerEndsAt: Date | null; imageCount: number }`
  - `shopAvailability(facts: ShopItemFacts, now: Date): ShopAvailability`.
    Precedence: unavailable (`!linkActive || !productActive`) → not-started →
    ended → no-photo → available.
  - `isPubliclyShown(visible: boolean, availability: ShopAvailability): boolean`
  - `type ShopMove = "top" | "up" | "down" | "bottom"`
  - `moveShopItem<T>(items: readonly T[], index: number, move: ShopMove): T[]`
    returns a new array. Out-of-range or no-op moves return a copy unchanged.
  - `isSameIdSet(current: readonly string[], ordered: readonly string[]): boolean`
    is true iff same length, no duplicates, same members.
  - `SHOP_INITIAL_VISIBLE = 12`

- [ ] **Step 1: Write the failing tests**

```ts
const base = { linkActive: true, productActive: true, offerStartsAt: null, offerEndsAt: null, imageCount: 1 };
const now = new Date("2026-11-07T12:00:00Z");
it("is available with an active link, active product, open window and a photo", () =>
  expect(shopAvailability(base, now)).toBe("available"));
it("unavailable wins over every other reason", () =>
  expect(shopAvailability({ ...base, linkActive: false, imageCount: 0, offerEndsAt: new Date("2026-01-01") }, now)).toBe("unavailable"));
it("not-started when offerStartsAt is in the future", () =>
  expect(shopAvailability({ ...base, offerStartsAt: new Date("2026-12-01") }, now)).toBe("not-started"));
it("ended when offerEndsAt <= now", () =>
  expect(shopAvailability({ ...base, offerEndsAt: now }, now)).toBe("ended"));
it("no-photo when there are no images", () =>
  expect(shopAvailability({ ...base, imageCount: 0 }, now)).toBe("no-photo"));
it("shows publicly only when visible and available", () => {
  expect(isPubliclyShown(true, "available")).toBe(true);
  expect(isPubliclyShown(false, "available")).toBe(false);
  expect(isPubliclyShown(true, "ended")).toBe(false);
});
it.each([
  ["top", 2, ["c", "a", "b", "d"]],
  ["up", 2, ["a", "c", "b", "d"]],
  ["down", 1, ["a", "c", "b", "d"]],
  ["bottom", 0, ["b", "c", "d", "a"]],
  ["up", 0, ["a", "b", "c", "d"]],
  ["down", 3, ["a", "b", "c", "d"]],
] as const)("moveShopItem %s from %i", (move, index, expected) =>
  expect(moveShopItem(["a", "b", "c", "d"], index, move)).toEqual(expected));
it("isSameIdSet rejects missing, extra and duplicate ids", () => {
  expect(isSameIdSet(["a", "b"], ["b", "a"])).toBe(true);
  expect(isSameIdSet(["a", "b"], ["a"])).toBe(false);
  expect(isSameIdSet(["a", "b"], ["a", "a"])).toBe(false);
  expect(isSameIdSet(["a", "b"], ["a", "c"])).toBe(false);
});
```

- [ ] **Step 2: Run to verify it fails**
Run: `pnpm vitest run --config vitest.config.ts src/modules/profiles/domain/creator-shop.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the functions listed under Interfaces**

- [ ] **Step 4: Run the tests again**
Same command. Expected: PASS.

- [ ] **Step 5: Commit**
`pnpm verify:boundaries && git add src/modules/profiles && git commit -m "feat: add creator shop domain rules"`

---

### Task 2: Schema, migration and shop repository

**Files:**
- Modify: `prisma/schema.prisma`:
  - add model `CreatorShopItem`;
  - add `shopItems CreatorShopItem[]` to `Creator` and to `Product`.
- Create: `prisma/migrations/20261107120000_creator_shop/migration.sql`
  (generate it with `pnpm prisma migrate dev --name creator_shop --create-only`,
  then rename the folder to this timestamp)
- Create: `src/modules/profiles/infrastructure/prisma-creator-shop-repository.ts`
- Test: `src/modules/profiles/infrastructure/creator-shop.integration.test.ts`
- Modify: `src/modules/profiles/index.ts` (export the repository file)

Model:

```prisma
model CreatorShopItem {
  id        String   @id @default(uuid()) @db.Uuid
  creatorId String   @map("creator_id") @db.Uuid
  productId String   @map("product_id") @db.Uuid
  position  Int
  visible   Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  creator Creator @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([creatorId, productId])
  @@index([creatorId, position], map: "creator_shop_item_position_idx")
  @@map("creator_shop_item")
}
```

**Interfaces:**
- Consumes: Task 1 (`shopAvailability`, `isPubliclyShown`, `isSameIdSet`);
  `resolveLink` from `@/src/modules/partnerships`.
- Produces (all exported from the repository file):
  - `interface CreatorShopEditorItem { productId: string; position: number; visible: boolean; availability: ShopAvailability; title: string; brandName: string; imageUrl: string | null; code: string | null }`
  - `interface PublicShopItem { productId: string; code: string; title: string; brandName: string; imageUrl: string }`
  - `interface ShopCandidate { productId: string; title: string; brandName: string; imageUrl: string | null }`
  - `type ShopWriteResult = { ok: true } | { ok: false; error: "not_eligible" | "not_found" | "invalid_order" }`
  - `listCreatorShopForOwner(creatorId: string, now?: Date): Promise<CreatorShopEditorItem[]>`, ordered by position.
  - `listPublicCreatorShop(creatorId: string, now?: Date): Promise<PublicShopItem[]>`,
    which is the editor list filtered by `isPubliclyShown`.
  - `listShopCandidates(creatorId: string): Promise<ShopCandidate[]>`:
    eligible products not already in the shop, newest link first.
  - `listShopProductIds(creatorId: string): Promise<string[]>`
  - `addShopItems(creatorId: string, productIds: string[]): Promise<ShopWriteResult>`
  - `removeShopItem(creatorId: string, productId: string): Promise<ShopWriteResult>`
  - `setShopItemVisible(creatorId: string, productId: string, visible: boolean): Promise<ShopWriteResult>`
  - `reorderShopItems(creatorId: string, orderedProductIds: string[]): Promise<ShopWriteResult>`

Implementation notes:
- **Reads:** one `findMany` on `creatorShopItem` with `product` (title,
  status, offer dates, imageUrls, brand { name, status, partnerships where
  creatorId }) and `product.links` filtered to `{ creatorId, status: "ACTIVE" }`,
  `take: 1`, ordered `createdAt desc`. That gives no N+1.
- **Link state:**
  - `linkActive` = the link exists and `resolveLink({...}).active`;
  - `productActive` = `status === "ACTIVE"`;
  - map `DISABLED` to `"ARCHIVED"` when building `LinkState.productStatus`.
- **Eligibility:** `addShopItems` and `listShopCandidates` share one private
  `eligibleLinkWhere(creatorId)`. It is the same shape as
  `resolvedActiveWhere` in partnerships: link ACTIVE, product ACTIVE, brand
  APPROVED, partnership APPROVED.
- **`addShopItems`:**
  - In one `$transaction`, skip ids already in the shop.
  - If any remaining id is not eligible, return `not_eligible` and write
    nothing.
  - Shift existing positions by `k`, then insert the new items at
    `0..k-1` in the given order.
- **`removeShopItem`:** delete the row, then re-compact positions in the same
  transaction.
- **`reorderShopItems`:** load current productIds. If `!isSameIdSet`, return
  `invalid_order`. Otherwise update each row's position to its index. Use
  `$transaction` with the per-row updates, which is fine at this scale.

- [ ] **Step 1: Add the model, create and apply the migration**
Run: `pnpm prisma migrate dev --name creator_shop --create-only`, rename the
folder, then `pnpm db:migrate`, `pnpm db:migrate:test`, `pnpm db:generate`.
Expected: the migration SQL creates `creator_shop_item` with the unique
constraint and the index; `pnpm typecheck` passes.

- [ ] **Step 2: Write the failing integration tests**
Use `seedLink`, `seedApprovedPartnership` and `prisma` from
`src/test/fixtures/accounts`.
`describe("creator shop persistence")`:
  - `adds new items at the top in the given order`: add [p1], then [p2, p3].
    `listCreatorShopForOwner` productIds equal `[p2, p3, p1]` and positions
    equal `[0, 1, 2]`.
  - `ignores products already in the shop`: add [p1] twice, length 1.
  - `rejects a product the creator has no active link for`: another
    creator's product → `{ ok: false, error: "not_eligible" }` and nothing is
    written (also for a link with `status: "DISABLED"`).
  - `reorders and rejects stale orders`: reorder `[p3, p1, p2]` → ok and
    positions match. Reorder `[p3, p1]` → `invalid_order`, unchanged.
    Reorder `[p3, p1, p2, pX]` → `invalid_order`.
  - `keeps positions contiguous across 40 items after a remove`: add 40,
    remove the 10th, positions equal `0..38`.
  - `public list excludes hidden, archived, ended, not-started and photo-less items`.
    Each case is set via `prisma.product.update` / `setShopItemVisible`.
    `listPublicCreatorShop` returns only the eligible item, and
    `listCreatorShopForOwner` reports the matching `availability`.
  - `archived product reappears when restored`: archive → absent; set ACTIVE
    → present again at the same position.
  - `follows the creator's new active link after the old one is disabled`:
    disable link A (code "AAA"); create link B (code "BBB") for the same
    product/creator. The public item has `code === "BBB"` and the same
    position.
  - `candidates exclude items already in the shop and ineligible links`.

- [ ] **Step 3: Run to verify they fail**
Run: `pnpm vitest run --config vitest.integration.config.ts src/modules/profiles/infrastructure/creator-shop.integration.test.ts`
Expected: FAIL, functions not exported.

- [ ] **Step 4: Implement the repository per the notes above**

- [ ] **Step 5: Run the tests again**
Same command. Expected: PASS.

- [ ] **Step 6: Commit**
`pnpm verify:boundaries && pnpm typecheck && git add prisma src/modules/profiles && git commit -m "feat: persist creator shop items"`

---

### Task 3: Shop server actions

**Files:**
- Create: `src/modules/profiles/application/creator-shop-input.ts`
- Test: `src/modules/profiles/application/creator-shop-input.test.ts`
- Create: `app/[locale]/creator/profile/shop-actions.ts`
- Modify: `src/modules/profiles/index.ts`

**Interfaces:**
- Consumes: Task 2 write functions and `ShopWriteResult`.
- Produces:
  - `shopProductIdsSchema` (zod): an array of uuids, 1–200 items, unique.
  - `shopProductIdSchema` (zod): a uuid.
  - Server actions, each `"use server"`. Each one calls
    `requireCreator(await currentViewer())` (not ok →
    `{ ok: false, error: "unauthenticated" }`), validates its input
    (invalid → `{ ok: false, error: "invalid" }`), calls the repository, then
    runs `revalidatePath` on `/${locale}/creator/profile` and
    `/${locale}/creator/links`:
    - `addShopItemsAction(locale: Locale, productIds: string[]): Promise<ShopActionResult>`
    - `removeShopItemAction(locale: Locale, productId: string): Promise<ShopActionResult>`
    - `setShopItemVisibleAction(locale: Locale, productId: string, visible: boolean): Promise<ShopActionResult>`
    - `reorderShopItemsAction(locale: Locale, orderedProductIds: string[]): Promise<ShopActionResult>`
  - `type ShopActionResult = ShopWriteResult | { ok: false; error: "unauthenticated" | "invalid" }`,
    exported from `creator-shop-input.ts`.

- [ ] **Step 1: Write failing schema tests**
  - Accepts `[uuid1, uuid2]`.
  - Rejects `[]`, `["x"]`, `[uuid1, uuid1]`, and 201 uuids.
  - `shopProductIdSchema` rejects `"../x"`.
- [ ] **Step 2: Run to verify they fail**
`pnpm vitest run --config vitest.config.ts src/modules/profiles/application/creator-shop-input.test.ts`
Expected: FAIL.
- [ ] **Step 3: Implement the schemas and the four actions**
- [ ] **Step 4: Run the tests and typecheck**
Same command, plus `pnpm typecheck`. Expected: PASS.
- [ ] **Step 5: Commit**
`pnpm verify:boundaries && git add app src/modules/profiles && git commit -m "feat: add creator shop server actions"`

---

### Task 4: Public shop grid component

**Files:**
- Create: `src/modules/profiles/ui/creator-shop-copy.ts`
- Create: `src/modules/profiles/ui/creator-shop.tsx` (`"use client"`)
- Test: `src/modules/profiles/ui/creator-shop.test.tsx`
- Modify: `app/profiles.css` (new `.creator-shop*` rules)
- Modify: `src/modules/profiles/index.ts`

**Interfaces:**
- Consumes: `PublicShopItem` and `SHOP_INITIAL_VISIBLE`.
- Produces:
  - `creatorShopCopy(locale: Locale)` returns the keys below. Exact copy:

    | key | en | ka |
    | --- | --- | --- |
    | `heading` | "Shop my picks" | "ჩემი რჩეული პროდუქტები" |
    | `showMore` | "Show more ({count})" | "მეტის ნახვა ({count})" |
    | `opensShop` | "{brand} – {title}, opens shop" | "{brand} – {title}, გაიხსნება მაღაზია" |
    | `disclosure` | "Contains affiliate links. I may earn a commission." | "შეიცავს პარტნიორულ ბმულებს. შესაძლოა მივიღო საკომისიო." |

    The editor keys from Task 6 are added to the same function.
  - `ShopCard({ item, copy }: { item: PublicShopItem; copy: Pick<ReturnType<typeof creatorShopCopy>, "opensShop"> }): JSX.Element`
    is the card used by both the grid and the editor preview.
  - `CreatorShop({ items, locale }: { items: PublicShopItem[]; locale: Locale }): JSX.Element | null`
    returns null when there are no items.

Markup and behaviour:
- `<section className="creator-shop profile-section" aria-labelledby="creator-shop-heading">`
- h2 heading with the count.
- `<ul className="creator-shop-grid">` of `<li>` containing an `<a>`:
  - `href="/r/{code}"`, `target="_blank"`, `rel="sponsored noopener"`,
    `aria-label` = `opensShop`.
  - Inside: `.creator-shop-image` (an img with `loading` set to `"lazy"` for
    index ≥ 4, `width=400 height=400`, `alt=""`), a small ↗ badge
    (aria-hidden), `.creator-shop-brand` (overline) and
    `.creator-shop-name` (2-line clamp).
- Items past 12 render with `hidden` until "Show more" is clicked. Every item
  is in the server HTML.
- Disclosure `<p className="creator-shop-disclosure">` sits under the grid.

CSS:
- Grid columns as in Global Constraints. Gaps `var(--space-12)` on phone and
  `var(--space-16)`/`var(--space-24)` on wide screens.
- Image `aspect-ratio: 1`, `object-fit: cover`, `border-radius: var(--radius-md)`,
  background `var(--color-slate-100)`.
- Hover (`@media (hover: hover)`): image `scale(1.03)` and name colour
  `var(--color-signal)`.
- `:focus-visible` outline uses `var(--color-focus-ring)`.
- `@media (prefers-reduced-motion: reduce)` disables the transform.

- [ ] **Step 1: Write failing tests**
  - `renders nothing without items`: container is empty.
  - `links each card to the tracked redirect`: the first link has
    `href "/r/CODE1"`, `rel "sponsored noopener"`, and accessible name
    "Brand – Title, opens shop".
  - `shows no price`: `queryByText(/₾|GEL/)` is null.
  - `shows 12 of 40 items then reveals the rest in order`: 12 visible links.
    Click "Show more (28)". 40 visible links, the last is item 40, and the
    button is gone.
- [ ] **Step 2: Run to verify they fail**
`pnpm vitest run --config vitest.config.ts src/modules/profiles/ui/creator-shop.test.tsx`
Expected: FAIL.
- [ ] **Step 3: Implement the copy, the components and the CSS**
- [ ] **Step 4: Run the tests again** Expected: PASS.
- [ ] **Step 5: Commit**
`pnpm verify:boundaries && pnpm lint && git add app/profiles.css src/modules/profiles && git commit -m "feat: add public creator shop grid"`

---

### Task 5: Shop-first profile layout

**Files:**
- Modify: `src/modules/profiles/ui/creator-profile.tsx`
- Modify: `app/[locale]/creators/[slug]/page.tsx`
- Modify: `app/profiles.css` (`.creator-intro` compact variant, `.creator-about`)
- Test: `src/modules/profiles/ui/creator-profile-shop.test.tsx`

**Interfaces:**
- Consumes: `CreatorShop`, `PublicShopItem`, `listPublicCreatorShop`.
- Produces: `CreatorProfile` gains an optional prop
  `shop?: PublicShopItem[]` (default `[]`).

Behaviour:
- **When `shop.length === 0`:** the output is byte-for-byte what it is today.
  Do not touch that branch's markup.
- **When `shop.length > 0`, the order is:**
  1. `<section className="creator-intro compact">` with portrait,
     `creator-identity` (h1, location), the tagline paragraph, and a
     `.creator-social-icons` row. The row reuses `ExternalLink` + `Icon` per
     social link, icon only, with the platform label as accessible name.
  2. `<CreatorShop items={shop} locale={locale} />`.
  3. `<section className="creator-about profile-section">` with the
     description, categories chips and facts `dl`.
  4. The existing socials section, work section, action and disclosure,
     unchanged.
- Page: fetch `listPublicCreatorShop(profile.creatorId)` in the existing
  `Promise.all` after the profile resolves, and pass it as `shop`.

- [ ] **Step 1: Write failing tests**
  - `keeps today's layout without a shop`: no `.creator-shop`; the
    `.creator-intro` contains `.creator-bio`.
  - `puts the shop directly after a compact header`: in document order, the
    h1 comes before the "Shop my picks" heading, which comes before the
    description text, which comes before `.creator-socials`.
  - `header social icons have accessible names`: a link named "Instagram"
    exists inside `.creator-intro`.
- [ ] **Step 2: Run to verify they fail**
`pnpm vitest run --config vitest.config.ts src/modules/profiles/ui/creator-profile-shop.test.tsx`
- [ ] **Step 3: Implement the layout, wire the page, and add the CSS.** On
  desktop the compact intro stays side-by-side, portrait plus identity.
- [ ] **Step 4: Run these tests and the existing profile tests**
`pnpm vitest run --config vitest.config.ts src/modules/profiles` Expected: PASS.
- [ ] **Step 5: Commit**
`pnpm verify:boundaries && pnpm lint && git add app src/modules/profiles && git commit -m "feat: show creator shop first on public profile"`

---

### Task 6: Shop editor tab

**Files:**
- Create: `src/modules/profiles/ui/use-sortable-list.ts`
- Create: `src/modules/profiles/ui/creator-shop-editor.tsx` (`"use client"`)
- Create: `src/modules/profiles/ui/creator-shop-picker.tsx` (`"use client"`)
- Test: `src/modules/profiles/ui/creator-shop-editor.test.tsx`
- Modify: `src/modules/profiles/ui/creator-shop-copy.ts` (editor keys)
- Modify: `src/modules/profiles/ui/profile-editor.tsx` (optional `shop` tab)
- Modify: `app/[locale]/creator/profile/page.tsx`
- Modify: `app/profiles.css` (`.shop-editor*`, `.shop-sheet`, `.shop-switch`)
- Modify: `src/modules/profiles/index.ts`

**Interfaces:**
- Consumes: Task 1 `moveShopItem`, `isPubliclyShown`; Task 2 types; Task 3
  `ShopActionResult` and actions (passed in as props, bound with `locale`);
  Task 4 `ShopCard`.
- Produces:
  - `useSortableList<T>(items: T[], getId: (t: T) => string, onReorder: (next: T[]) => void)`.
    It returns `{ handleProps(id): HTMLAttributes<HTMLElement>, itemProps(id): HTMLAttributes<HTMLElement>, draggingId: string | null, announcement: string }`.
    - Pointer Events on the handle with `setPointerCapture`; use
      `touch-action: none` on the handle only.
    - The order is computed from the pointer Y against item midpoints.
    - Auto-scroll within 48px of the viewport edges.
    - Keyboard on the focused handle: Space/Enter picks up, ArrowUp/ArrowDown
      moves, Space/Enter drops (calls `onReorder`), Escape restores the
      original order.
    - `announcement` feeds an `aria-live="polite"` region.
  - `CreatorShopEditor` props:
    `{ locale: Locale; items: CreatorShopEditorItem[]; candidates: ShopCandidate[]; profileUrl: string | null; published: boolean; hasAnyLinks: boolean; actions: { add(ids: string[]): Promise<ShopActionResult>; remove(id: string): Promise<ShopActionResult>; setVisible(id: string, visible: boolean): Promise<ShopActionResult>; reorder(ids: string[]): Promise<ShopActionResult> } }`
  - `ProfileEditor` gains the optional prop `shop?: ReactNode`. When present
    and `role === "creator"`, it adds a fifth tab
    `["shop", creatorShopCopy(locale).tab]`. When `tab === "shop"`:
    - the draft `<form>` and footer are hidden and `shop` renders instead;
    - `markDirty` and `ProfileLeaveGuard` are unaffected.

Editor copy keys (en / ka):

| key | en | ka |
| --- | --- | --- |
| `tab` | "Shop" | "მაღაზია" |
| `title` | "My shop" | "ჩემი მაღაზია" |
| `summary` | "{shown} shown on profile · {hidden} hidden" | "პროფილზე ჩანს {shown} · დამალულია {hidden}" |
| `add` | "Add products" | "პროდუქტების დამატება" |
| `addCount` | "Add ({count})" | "დამატება ({count})" |
| `viewProfile` | "View profile" | "პროფილის ნახვა" |
| `show` | "Show on profile" | "პროფილზე ჩვენება" |
| `moveTop`, `moveUp`, `moveDown`, `moveBottom` | "Move to top", "Move up", "Move down", "Move to bottom" | "თავში გადატანა", "ზემოთ", "ქვემოთ", "ბოლოში გადატანა" |
| `remove` | "Remove from shop" | "მაღაზიიდან წაშლა" |
| `filterAll`, `filterShown`, `filterHidden` | "All", "Shown", "Hidden" | "ყველა", "ჩანს", "დამალული" |
| `saving`, `saved`, `failed`, `retry` | "Saving…", "Saved", "Couldn't save.", "Retry" | "ინახება…", "შენახულია", "ვერ შეინახა.", "ხელახლა" |
| `reason.unavailable`, `reason.not-started`, `reason.ended`, `reason.no-photo` | "Link unavailable · not shown", "Not started yet · not shown", "Offer ended · not shown", "No photo · not shown" | "ბმული მიუწვდომელია · არ ჩანს", "ჯერ არ დაწყებულა · არ ჩანს", "შეთავაზება დასრულდა · არ ჩანს", "ფოტო არ არის · არ ჩანს" |
| `emptyTitle`, `emptyBody` | "Build your shop", "Pick products from your Xurjin links. Followers see them as a catalog on your profile." | "შექმენით თქვენი მაღაზია", "აირჩიეთ პროდუქტები თქვენი Xurjin ბმულებიდან. გამომწერები მათ კატალოგის სახით ნახავენ." |
| `noLinks` | "Get links first" | "ჯერ აიღეთ ბმულები" |
| `unpublished` | "Your shop will be visible once your profile is published." | "მაღაზია გამოჩნდება პროფილის გამოქვეყნების შემდეგ." |
| `search` | "Search products" | "პროდუქტების ძებნა" |
| `preview` | "Live preview" | "ცოცხალი გადახედვა" |
| `more` | "More actions for {title}" | "მეტი მოქმედება: {title}" |
| `picked`, `dropped`, `moved` | "Picked up {title}", "Dropped {title} at position {n}", "Moved to position {n}" | "აიღეთ {title}", "{title} ჩაიდო პოზიციაზე {n}", "გადავიდა პოზიციაზე {n}" |
| `allAdded` | "Every product you have a link for is already in your shop." | "ყველა პროდუქტი, რომლის ბმულიც გაქვთ, უკვე მაღაზიაშია." |

Behaviour:
- `useOptimistic` over `items`. Every action runs in `startTransition`, and
  the status line shows saving / saved / failed+retry.
- On `{ ok: false }`, roll back by dropping the optimistic state and call
  `router.refresh()`. `invalid_order` always refreshes.
- Rows show:
  - a handle button (aria-label "Reorder {title}");
  - a 48px thumbnail, brand overline and name;
  - the reason tag when `availability !== "available"`;
  - a switch: `<button role="switch" aria-checked>`, labelled by `show`;
  - a ⋯ button that opens a menu.
- The ⋯ menu is a popover on wide screens and a bottom sheet (`<dialog>`)
  below 640px. It has the four moves (via `moveShopItem` → `reorder`) and
  Remove.
- Filter chips render below 640px only. Dragging is enabled only in "All".
- Header: title, summary, "View profile ↗" (when `profileUrl`), and
  "Add products".
- Desktop (≥ 1024px): a right column with the preview. It shows the first 4
  `isPubliclyShown` items rendered with `ShopCard` inside a phone frame.
- Banner `unpublished` when `!published`.
- Empty state uses the design-system `EmptyState`:
  - primary "Add products";
  - or `noLinks` linking to `/${locale}/creator/links` when `!hasAnyLinks`.
- Picker (`creator-shop-picker.tsx`):
  - a `<dialog>` with the `search` input filtering title/brand;
  - a checkbox list with thumbnails;
  - an "Add (n)" button that calls `actions.add`;
  - the `allAdded` message when there are no candidates.
- Page: `app/[locale]/creator/profile/page.tsx` loads
  `listCreatorShopForOwner`, `listShopCandidates`, and whether the creator
  has any link (`listShopCandidates(...).length > 0 || items.length > 0`).
  It passes `shop={<CreatorShopEditor … actions={{ add: addShopItemsAction.bind(null, locale), … }} />}`.
  `profileUrl` = `/${locale}/creators/${slug}` when published, else null.

- [ ] **Step 1: Write failing tests** (actions are `vi.fn` resolving
  `{ ok: true }` unless stated)
  - `toggling the switch calls setVisible and updates the summary`.
  - `"Move to top" from the ⋯ menu calls reorder with the moved order`.
  - `keyboard reorder`: focus the handle of item 3, press Space, ArrowUp,
    ArrowUp, Space. `reorder` is called with `[c, a, b]`, and the live
    region says "Dropped C at position 1".
  - `Escape cancels a keyboard drag`: reorder is not called and the order is
    unchanged.
  - `rolls back when reorder fails with invalid_order`: the original order is
    restored and "Couldn't save." is visible.
  - `shows reason tags`: an item with `availability: "ended"` shows
    "Offer ended · not shown".
  - `Hidden filter shows only hidden items`.
  - `picker adds selected candidates`: open it, check 2, click "Add (2)", and
    `add` is called with those ids.
  - `empty state links to Links page when the creator has no links`.
  - `ProfileEditor shop tab hides the draft form`: render `ProfileEditor`
    with `shop={<p>shop body</p>}`, click "Shop". "shop body" is visible and
    the save button is not.
- [ ] **Step 2: Run to verify they fail**
`pnpm vitest run --config vitest.config.ts src/modules/profiles/ui/creator-shop-editor.test.tsx`
- [ ] **Step 3: Implement the hook, editor, picker, tab wiring, page and CSS**
- [ ] **Step 4: Run all profile unit tests**
`pnpm vitest run --config vitest.config.ts src/modules/profiles` Expected: PASS.
- [ ] **Step 5: Commit**
`pnpm verify:boundaries && pnpm lint && pnpm typecheck && git add app src/modules/profiles && git commit -m "feat: add creator shop editor tab"`

---

### Task 7: "Add to shop" on the Links page

**Files:**
- Create: `src/modules/profiles/ui/shop-toggle-button.tsx` (`"use client"`)
- Modify: `src/modules/partnerships/ui/link-list.tsx` (optional `trailing` slot)
- Modify: `app/[locale]/creator/links/page.tsx`
- Test: `src/modules/profiles/ui/shop-toggle-button.test.tsx`
- Modify: `src/modules/profiles/index.ts`, `creator-shop-copy.ts`
  (`addToShop`: "Add to shop" / "მაღაზიაში დამატება"; `inShop`: "In shop" /
  "მაღაზიაშია")

**Interfaces:**
- Consumes: Task 3 `addShopItemsAction` and `removeShopItemAction`; Task 2
  `listShopProductIds`.
- Produces:
  - `LinkList` gains the prop
    `trailing?: (link: { productId: string; active: boolean }) => ReactNode`.
    It renders inside each link card's actions area. `active` is that link's
    `resolveLink(...).active`.
  - `ShopToggleButton({ productId, inShop, locale, add, remove }: { productId: string; inShop: boolean; locale: Locale; add(ids: string[]): Promise<ShopActionResult>; remove(id: string): Promise<ShopActionResult> })`
    is optimistic and keeps the button's accessible name in sync.
- Page: load `listShopProductIds(creatorId)` into a `Set`. Pass `trailing`
  returning `null` when `!active`, otherwise `<ShopToggleButton … />`.

- [ ] **Step 1: Write failing tests**
  - `adds then shows In shop`: click "Add to shop". `add` is called with
    `[id]` and the button reads "✓ In shop" with `aria-pressed="true"`.
  - `removes when already in shop`.
  - `reverts when the action fails`.
- [ ] **Step 2: Run to verify they fail**
`pnpm vitest run --config vitest.config.ts src/modules/profiles/ui/shop-toggle-button.test.tsx`
- [ ] **Step 3: Implement the button, the slot and the page wiring**
- [ ] **Step 4: Run these tests and the partnerships UI tests**
`pnpm vitest run --config vitest.config.ts src/modules/profiles src/modules/partnerships` Expected: PASS.
- [ ] **Step 5: Commit**
`pnpm verify:boundaries && pnpm lint && git add app src/modules && git commit -m "feat: add to shop from creator links"`

---

### Task 8: Seed and end-to-end coverage (desktop + Pixel 7)

**Files:**
- Create: `scripts/seed-creator-shop.ts`. Follow the structure of
  `scripts/seed-team-leads.ts`:
  - idempotent and local-only;
  - password `Shop-demo-only-2026!`;
  - ids prefixed `95000000-0000-4000-8000-`.
- Create: `src/test/e2e/creator-shop.spec.ts`

Seed contents:
- An approved brand "Shop Demo Brand".
- An approved creator `shop-creator@example.test` with a PUBLISHED profile
  at slug `shop-demo`.
- An approved partnership.
- 15 products with ACTIVE links. Images use `/images/creator.webp`, and one
  title is a 90-character Georgian string.
- 1 product whose offer ended yesterday, with a link.
- The shop is cleared on every run. The script prints JSON
  `{ slug, codes: string[] }`.

- [ ] **Step 1: Write the spec** (it runs in both Playwright projects;
  `isMobile` decides the phone paths):
  - `creator builds a shop and followers see it`:
    1. Sign in and open `/en/creator/profile`, then the "Shop" tab.
    2. Click "Add products", select all 16, and click "Add (16)". The list
       shows 16 rows and the ended one carries "Offer ended · not shown".
    3. Hide one item via its switch.
    4. Move the last shown item to the top via ⋯ → "Move to top" (a bottom
       sheet on phone).
    5. Reload the page. The order and the hidden state persist.
    6. Visit `/en/creators/shop-demo`. "Shop my picks" appears before the
       about text, the first card is the moved item, there are 12 visible
       cards, and "Show more (2)" reveals 14.
    7. The hidden and ended items are absent.
    8. Axe reports no violations, in both the editor and the public page.
  - `card goes through the tracked redirect`: the first card's href matches
    `/r/[A-Za-z0-9]+$`. `page.request.get(href, { maxRedirects: 0 })` has
    status 302.
  - `no horizontal scroll and names clamp on phones` (mobile only):
    `document.documentElement.scrollWidth <= window.innerWidth`, and the
    Georgian card name's `getBoundingClientRect().height` ≤ 2 ×
    computed line-height + 1.
  - `drag reorders on desktop` (desktop only): drag the handle of row 3
    above row 1 with `page.mouse`, then reload. Row 1 is the dragged item.
  - `ka locale renders the shop heading`: `/ka/creators/shop-demo` shows
    "ჩემი რჩეული პროდუქტები".
- [ ] **Step 2: Build and run**
`pnpm build && pnpm test:e2e src/test/e2e/creator-shop.spec.ts`
Expected: all tests pass in both the desktop and Pixel 7 projects.
- [ ] **Step 3: Run the full verification**
`pnpm format:check && pnpm lint && pnpm verify:boundaries && pnpm typecheck && pnpm test:unit && pnpm test:integration`
Expected: all pass.
- [ ] **Step 4: Commit**
`git add scripts src/test/e2e && git commit -m "test: cover creator shop end to end on desktop and mobile"`
