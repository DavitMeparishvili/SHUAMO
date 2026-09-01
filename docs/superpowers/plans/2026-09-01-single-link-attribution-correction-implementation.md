# Single-Link Attribution Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace catalog-wide automatic link minting and three-creator split attribution with immutable, on-demand creator/product links and full commission for the one creator identified by the shop's submitted click ID.

**Architecture:** An approved brand–creator partnership authorizes on-demand link creation. Each `TrackingLink` snapshots one product's offered `Rate`; a click resolves to that immutable link, and the pure Phase 5 calculator pays its creator on matching product lines only. Existing Phase 3 and 4 migrations remain untouched; a forward migration corrects the schema before Phase 5 is implemented.

**Tech Stack:** TypeScript 5.9 · Next.js 16 server actions · React 19 · Prisma 7.9 · PostgreSQL 17 · Zod 4 · decimal.js through `Money` and `Rate` · Vitest 4 · Playwright 1.62

**Spec:** `docs/superpowers/specs/2026-09-01-single-link-attribution-design.md` — read this file first. Rule IDs `ATTR-001` through `ATTR-010` are the traceability contract.

## Global Constraints

- Work directly in the primary checkout. Do not create or use a Git worktree.
- One link binds one brand, creator, product, and immutable rate snapshot.
- Any number of approved creators may hold links for one product; only one link per `(productId, creatorId)` may be `ACTIVE`.
- The submitted click ID selects the only earning creator. Cookies, fingerprints, other clicks, recency, and `creditable` never add or replace a creator.
- Only matching lines for the linked product earn; the earning creator receives the full calculated commission.
- `PERCENT` is a fraction no greater than `1`; `FIXED` is GEL per matching unit.
- Money remains exact decimal. Every money assertion compares storage strings, never JavaScript numbers.
- Existing migrations are immutable. Add a forward migration and test its backfill.
- Domain code performs no I/O and imports only through module public surfaces.
- Every task ends in a focused commit and leaves its targeted tests passing.

## Planned file structure

```text
docs/superpowers/specs/2026-08-28-shuamo-r1-design.md       canonical rule rewrite
docs/superpowers/plans/2026-08-29-shuamo-delivery-roadmap.md roadmap dependency rewrite
docs/superpowers/plans/2026-08-29-phase-03-*.md             historical correction banner
docs/superpowers/plans/2026-08-29-phase-05-*.md             superseded-plan pointer
docs/superpowers/plans/2026-08-29-phase-06-*.md             future webhook contract rewrite
prisma/schema.prisma                                        immutable link-rate fields
prisma/migrations/20260901*_single_link_attribution/        forward backfill and constraints
src/modules/partnerships/application/create-product-link.ts on-demand link command
src/modules/partnerships/http/link-handlers.ts               creator route contract
src/modules/partnerships/ports/link-repository.ts            link persistence boundary
src/modules/partnerships/infrastructure/prisma-link-repository.ts
app/[locale]/creator/links/actions.ts                        authenticated server action
app/[locale]/creator/links/page.tsx                          offers plus existing links
src/modules/attribution/domain/types.ts                      Phase 5 input/output contract
src/modules/attribution/domain/line-net.ts                   net and VAT rules
src/modules/attribution/domain/calculate.ts                  single-link calculator
src/modules/attribution/domain/*.test.ts                     examples, properties, purity
src/modules/attribution/index.ts                             public surface
scripts/verify-single-link-attribution.mjs                  stale-model drift guard
package.json                                                 correction verification command
```

---

### Task 1: Synchronize the canonical specification and active plans

**Files:**

- Modify: `docs/superpowers/specs/2026-08-28-shuamo-r1-design.md`
- Modify: `docs/superpowers/plans/2026-08-29-shuamo-delivery-roadmap.md`
- Modify: `docs/superpowers/plans/2026-08-29-phase-03-catalog-partnerships-implementation.md`
- Replace: `docs/superpowers/plans/2026-08-29-phase-05-attribution-calculator-implementation.md`
- Modify: `docs/superpowers/plans/2026-08-29-phase-06-conversions-api-implementation.md`
- Inspect: all Phase 7–11 implementation plans and `docs/superpowers/specs/2026-08-29-shuamo-r2-accounting-design.md`; the initial repository scan found no split-specific claims in them, so change them only if the Task 1 scan finds a current contradiction

**Interfaces:**

- Consumes: `ATTR-001`–`ATTR-010` from the approved design.
- Produces: one non-contradictory source hierarchy: R1 spec → roadmap → this correction plan → future Phase 6 plan.

- [ ] **Step 1: Replace the R1 attribution decision**

Replace every active assertion that commission is split among up to three creators with this normative text, preserving the rule IDs:

```markdown
### Single-link attribution

An approved partnership authorizes a creator to create product links. Each
tracking link binds exactly one creator and one product and snapshots the
product's offered commission terms when created (ATTR-001, ATTR-002,
ATTR-006). The shop returns the recorded click ID after a successful sale;
that click's tracking link identifies the only earning creator (ATTR-003,
ATTR-010). Only order lines matching the link's product earn commission, and
the creator receives the full calculated amount without a split (ATTR-004,
ATTR-005). Product-rate edits affect new links only (ATTR-007).
```

Rewrite R1 §6.3 as the exact flow `click → tracking_link → creator/product/rate`, update §10's checklist to use the proof in the approved design §8, and update Appendix A so `tracking_link` owns `commission_type` and `commission_value`, `conversion` has no `split_degraded`, and each conversion item has at most one attribution.

- [ ] **Step 2: Correct the roadmap and dependency graph**

Replace the Phase 3/5 global rules and insert the correction before Phase 5:

```text
Phase 3  Catalog, partnerships & link authorization
  -> Phase 4  Redirect & click tracking
    -> Single-link attribution correction
      -> Phase 5  Exact-link commission calculator
        -> Phase 6  Conversion webhook & order lifecycle
```

Phase 3 must say links are created on demand by an approved creator for one active product. Phase 5 must say it calculates one full attribution from immutable link terms. Phase 6 must say it resolves only the submitted click and does not query visitor candidates.

- [ ] **Step 3: Make obsolete implementation plans impossible to execute accidentally**

Add this banner immediately below the Phase 3 plan title:

```markdown
> **Historical plan:** Phase 3 was implemented before the single-link
> attribution correction. Automatic catalog-wide minting in this document is
> superseded by `2026-09-01-single-link-attribution-correction-implementation.md`.
> Do not recreate that behavior.
```

Replace the old Phase 5 plan body with:

```markdown
# Phase 5 — Attribution Calculator Implementation Plan

> **SUPERSEDED on 2026-09-01. Do not execute this plan.** The former
> multi-creator split model conflicts with the approved product decision.
> Execute `2026-09-01-single-link-attribution-correction-implementation.md`,
> Tasks 6–8, which implement `ATTR-003` through `ATTR-010`.
```

- [ ] **Step 4: Rewrite the future Phase 6 contract**

Remove candidate-click queries, `splitDegraded`, three-row invariants, share conservation, and creator recency. Its repository input must resolve this shape from one click ID:

```ts
interface ResolvedConversionClick {
  readonly clickId: string;
  readonly brandId: string;
  readonly occurredAt: Date;
  readonly creatorId: string;
  readonly productId: string;
  readonly sku: string;
  readonly rate: Rate;
}
```

Replace the database invariant “at most 3 attribution rows per line” with “at most 1 attribution row per conversion item,” while keeping order idempotency and immutable attribution amounts.

The Phase 6 test list must include these exact future test names:

- `ATTR-008 replays one shop order without another conversion or commission`
- `ATTR-009 attributes a recorded click after its link is disabled`
- `ATTR-010 does not reject the cited click when creditable is false`

- [ ] **Step 5: Run the active-document contradiction scan**

Run:

```powershell
rg -n -i "up to 3|at most 3|split equally|brand-scoped split|candidate-click|splitDegraded" `
  docs/superpowers/specs/2026-08-28-shuamo-r1-design.md `
  docs/superpowers/plans/2026-08-29-shuamo-delivery-roadmap.md `
  docs/superpowers/plans/2026-08-29-phase-05-attribution-calculator-implementation.md `
  docs/superpowers/plans/2026-08-29-phase-06-conversions-api-implementation.md
```

Expected: no matches except text explicitly saying the former behavior is superseded. Search all later plans and specs as well; change current behavior claims, but retain clearly labelled historical decision records.

- [ ] **Step 6: Commit**

```powershell
git add docs/superpowers
git commit -m "docs: synchronize single-link attribution requirements"
```

---

### Task 2: Add immutable rate snapshots with a forward migration

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260901230000_single_link_attribution/migration.sql`
- Create: `src/modules/partnerships/infrastructure/link-rate-migration.integration.test.ts`
- Modify: fixtures and integration tests that create `TrackingLink` rows

**Interfaces:**

- Consumes: existing `Product.commissionType` and `Product.commissionValue`.
- Produces: `TrackingLink.commissionType`, `TrackingLink.commissionValue`, and database-enforced one-active-link-per-product/creator.

- [ ] **Step 1: Write the failing migration invariant tests**

Create tests that insert explicit snapshots and prove `ATTR-001`, `ATTR-006`, and `ATTR-007`:

```ts
it("ATTR-006 stores immutable link terms independently of the product", async () => {
  const { brand, creator } = await seedApprovedPartnership();
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      sku: `RATE-${crypto.randomUUID()}`,
      title: "Rate fixture",
      priceGel: "100.00",
      backlinkUrl: "https://shop.example.ge/rate-fixture",
      commissionType: "FIXED",
      commissionValue: "8.0000",
    },
  });
  const link = await prisma.trackingLink.create({
    data: {
      productId: product.id,
      creatorId: creator.id,
      code: "RATE0001",
      commissionType: "FIXED",
      commissionValue: "8.0000",
    },
  });

  await prisma.product.update({
    where: { id: product.id },
    data: { commissionValue: "12.0000" },
  });

  expect(
    (await prisma.trackingLink.findUniqueOrThrow({ where: { id: link.id } }))
      .commissionValue.toFixed(4),
  ).toBe("8.0000");

  await expect(prisma.trackingLink.update({
    where: { id: link.id },
    data: { commissionValue: "12.0000" },
  })).rejects.toThrow();
});

it("ATTR-001 permits 100 active creators on one product", async () => {
  // Seed 100 approved creators, each with a distinct code and identical
  // product/rate snapshot; createMany must insert all 100 rows.
  expect(await prisma.trackingLink.count({ where: { productId } })).toBe(100);
});

it("permits historical links but refuses two active links for one pair", async () => {
  await createLink({ code: "OLD00001", status: "DISABLED" });
  await createLink({ code: "NEW00001", status: "ACTIVE" });
  await expect(createLink({ code: "NEW00002", status: "ACTIVE" })).rejects.toThrow();
});
```

- [ ] **Step 2: Run the new integration test and confirm failure**

Run:

```powershell
pnpm vitest run --config vitest.integration.config.ts src/modules/partnerships/infrastructure/link-rate-migration.integration.test.ts
```

Expected: FAIL because the link snapshot columns and partial uniqueness do not exist.

- [ ] **Step 3: Modify the Prisma model**

Use this model shape:

```prisma
model TrackingLink {
  id              String     @id @default(uuid()) @db.Uuid
  productId       String     @map("product_id") @db.Uuid
  creatorId       String     @map("creator_id") @db.Uuid
  code            String     @unique
  commissionType  RateType   @map("commission_type")
  commissionValue Decimal    @map("commission_value") @db.Decimal(9, 4)
  status          LinkStatus @default(ACTIVE)
  createdAt       DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)

  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)
  creator Creator @relation(fields: [creatorId], references: [id], onDelete: Restrict)
  clicks  Click[]

  @@index([productId, creatorId], map: "tracking_link_product_creator_idx")
  @@index([creatorId], map: "tracking_link_creator_idx")
  @@map("tracking_link")
}
```

Prisma cannot express the required partial unique index; keep it in SQL and assert it in integration tests.

- [ ] **Step 4: Generate and inspect the forward migration**

Create `prisma/migrations/20260901230000_single_link_attribution/migration.sql` directly with `apply_patch`; do not ask Prisma to rewrite or apply existing migrations. Use this safe order:

```sql
ALTER TABLE "tracking_link"
  ADD COLUMN commission_type "RateType",
  ADD COLUMN commission_value numeric(9,4);

UPDATE tracking_link AS l
SET commission_type = p.commission_type,
    commission_value = p.commission_value
FROM product AS p
WHERE p.id = l.product_id;

ALTER TABLE "tracking_link"
  ALTER COLUMN commission_type SET NOT NULL,
  ALTER COLUMN commission_value SET NOT NULL,
  ADD CONSTRAINT tracking_link_commission_non_negative
    CHECK (commission_value >= 0),
  ADD CONSTRAINT tracking_link_percent_is_fraction
    CHECK (commission_type <> 'PERCENT' OR commission_value <= 1);

DROP INDEX "tracking_link_product_id_creator_id_key";

CREATE INDEX tracking_link_product_creator_idx
  ON tracking_link (product_id, creator_id);

CREATE UNIQUE INDEX tracking_link_one_active_product_creator
  ON tracking_link (product_id, creator_id)
  WHERE status = 'ACTIVE';

CREATE FUNCTION prevent_tracking_link_agreement_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
     OR NEW.code IS DISTINCT FROM OLD.code
     OR NEW.commission_type IS DISTINCT FROM OLD.commission_type
     OR NEW.commission_value IS DISTINCT FROM OLD.commission_value THEN
    RAISE EXCEPTION 'tracking link identity and commission terms are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tracking_link_agreement_immutable
BEFORE UPDATE ON tracking_link
FOR EACH ROW
EXECUTE FUNCTION prevent_tracking_link_agreement_update();
```

The Phase 3 migration defines the dropped object as the unique index `tracking_link_product_id_creator_id_key`; retain that exact name in the forward migration.

- [ ] **Step 5: Update existing link fixtures mechanically**

Every `prisma.trackingLink.create`, `createMany`, and seed input must include the snapshot copied from its product:

```ts
commissionType: product.commissionType,
commissionValue: product.commissionValue,
```

Replace composite-key `upsert` calls in `scripts/seed-phase-03.ts` and `scripts/seed-phase-04.ts` with stable-ID or stable-code upserts because the lifetime composite unique key no longer exists.

- [ ] **Step 6: Run migration and integration verification**

```powershell
pnpm db:generate
pnpm db:migrate:test
pnpm test:integration
```

Expected: PASS, including backfill, 100 creators, historical rows, and active uniqueness.

- [ ] **Step 7: Commit**

```powershell
git add prisma src scripts
git commit -m "feat: snapshot immutable rates on tracking links"
```

---

### Task 3: Remove automatic catalog-wide link minting

**Files:**

- Delete: `src/modules/partnerships/domain/link-minting.ts`
- Delete: `src/modules/partnerships/domain/link-minting.test.ts`
- Delete: `src/modules/partnerships/application/mint-links-for-product.ts`
- Delete: `src/modules/partnerships/application/mint-links-for-product.test.ts`
- Modify: `src/modules/catalog/application/create-product.ts`
- Modify: `src/modules/catalog/application/create-product.test.ts`
- Modify: `src/modules/partnerships/application/decide-partnership.ts`
- Modify: `src/modules/partnerships/application/decide-partnership.test.ts`
- Modify: `src/modules/partnerships/application/apply-to-brand.ts`
- Modify: corresponding tests and `src/modules/partnerships/index.ts`
- Modify: `src/infrastructure/phase-3-services.ts`
- Replace: `src/infrastructure/phase-3-concurrency.integration.test.ts`
- Modify: `src/modules/partnerships/infrastructure/minting.integration.test.ts`

**Interfaces:**

- Consumes: product creation and partnership decisions.
- Produces: those commands without any link side effect; link creation becomes Task 4's explicit command.

- [ ] **Step 1: Rewrite failing behavior tests**

Use explicit negative assertions:

```ts
it("ATTR-002 product creation never creates creator links", async () => {
  const result = await createProduct({
    products: fakeProducts,
  })("b1", validProduct);

  expect(result).toEqual({ ok: true, value: { id: "p1" } });
});

it("partnership approval authorizes links without creating them", async () => {
  const result = await decidePartnership({ partnerships: fakePartnerships })(
    "b1",
    "pt1",
    "APPROVE",
  );
  expect(result).toEqual({ ok: true, value: undefined });
});

it("brand invitation creates an approved partnership without links", async () => {
  expect(await inviteCreator(deps)("b1", "c1")).toEqual({
    ok: true,
    value: { partnershipId: "pt1" },
  });
});
```

- [ ] **Step 2: Run focused tests and confirm they fail against auto-minting**

```powershell
pnpm vitest run src/modules/catalog/application/create-product.test.ts src/modules/partnerships/application/decide-partnership.test.ts src/modules/partnerships/application/apply-to-brand.test.ts
```

Expected: FAIL because current results include `mintedLinks` and current commands create links.

- [ ] **Step 3: Remove link dependencies and side effects**

Reduce command results to:

```ts
createProduct(deps)(brandId, input)
  : Promise<Result<{ id: string }, CreateProductError>>

decidePartnership(deps)(brandId, partnershipId, decision)
  : Promise<Result<void, "not_found">>

inviteCreator(deps)(brandId, creatorId)
  : Promise<Result<{ partnershipId: string },
      "already_exists" | "creator_not_found" | "creator_not_approved">>
```

Delete `linksToMint`, `mintLinksForProduct`, their exports, and all unused random/link/product dependencies from these paths. Keep product and partnership transactions only where they protect their own writes.

- [ ] **Step 4: Replace the old concurrency proof**

Delete the product-creation-versus-partnership-approval race test. Add an integration test proving those operations create zero links even when concurrent:

```ts
const [productResult, approvalResult] = await Promise.all([
  createProductForBrand(brand.id, productInput),
  decidePartnershipForBrand(brand.id, partnership.id, "APPROVE"),
]);
expect(productResult.ok).toBe(true);
expect(approvalResult.ok).toBe(true);
expect(await prisma.trackingLink.count({
  where: { product: { brandId: brand.id }, creatorId: creator.id },
})).toBe(0);
```

- [ ] **Step 5: Run Phase 3 unit and integration tests**

```powershell
pnpm test:unit
pnpm test:integration
pnpm typecheck
```

Expected: PASS with no automatic minting references in production source.

- [ ] **Step 6: Commit**

```powershell
git add src
git commit -m "refactor: make product links explicitly creator initiated"
```

---

### Task 4: Implement on-demand creator product links

**Files:**

- Create: `src/modules/partnerships/application/create-product-link.ts`
- Create: `src/modules/partnerships/application/create-product-link.test.ts`
- Modify: `src/modules/partnerships/ports/link-repository.ts`
- Modify: `src/modules/partnerships/infrastructure/prisma-link-repository.ts`
- Modify: `src/modules/catalog/ports/product-repository.ts`
- Modify: `src/modules/catalog/infrastructure/prisma-product-repository.ts`
- Modify: `src/modules/partnerships/index.ts`
- Modify: `src/infrastructure/phase-3-services.ts`
- Create or replace: `src/modules/partnerships/infrastructure/product-link-creation.integration.test.ts`

**Interfaces:**

- Consumes: approved partnership; active product offer `{ id, brandId, commissionType, commissionValue }`.
- Produces: `createProductLink(deps)(creatorId, productId): Promise<Result<ProductLinkCreated, ProductLinkError>>`.

- [ ] **Step 1: Define the command contract in a failing unit test**

```ts
type ProductLinkError =
  | "product_not_found"
  | "partnership_not_approved"
  | "active_link_exists";

interface ProductLinkCreated {
  readonly linkId: string;
  readonly code: string;
  readonly commissionType: "PERCENT" | "FIXED";
  readonly commissionValue: string;
}

it("ATTR-002 and ATTR-006 create one product link with offered terms", async () => {
  const writes: unknown[] = [];
  const result = await createProductLink({
    products: { findActiveOffer: async () => ({
      id: "p1", brandId: "b1", commissionType: "PERCENT", commissionValue: "0.1250",
    }) },
    partnerships: { find: async () => ({ id: "pt1", brandId: "b1", creatorId: "c1", status: "APPROVED" }) },
    links: {
      findActive: async () => undefined,
      create: async (input) => { writes.push(input); return { id: "l1", ...input }; },
    },
    random: { bytes: (count) => new Uint8Array(count).fill(1) },
  })("c1", "p1");

  expect(result).toEqual({ ok: true, value: {
    linkId: "l1", code: expect.any(String),
    commissionType: "PERCENT", commissionValue: "0.1250",
  } });
  expect(writes).toEqual([expect.objectContaining({
    productId: "p1", creatorId: "c1",
    commissionType: "PERCENT", commissionValue: "0.1250",
  })]);
});
```

Add separate tests for archived/missing product, missing/pending/rejected partnership, existing active link, and repository unique-conflict mapping to `active_link_exists`.

- [ ] **Step 2: Run and confirm failure**

```powershell
pnpm vitest run src/modules/partnerships/application/create-product-link.test.ts
```

Expected: FAIL because the command does not exist.

- [ ] **Step 3: Add focused port methods**

```ts
// catalog/ports/product-repository.ts
findActiveOffer(productId: string): Promise<{
  id: string;
  brandId: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
} | undefined>;

// partnerships/ports/link-repository.ts
findActive(productId: string, creatorId: string): Promise<{ id: string } | undefined>;
create(input: {
  productId: string;
  creatorId: string;
  code: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
}): Promise<{ id: string; code: string; commissionType: "PERCENT" | "FIXED"; commissionValue: string }>;
```

The Prisma adapter converts decimal strings at its boundary. It catches only the active-pair unique violation and returns or throws a typed `ActiveLinkExistsError`; do not translate unrelated database failures.

Define the typed error next to the repository contract:

```ts
export class ActiveLinkExistsError extends Error {
  constructor() {
    super("an active link already exists for this product and creator");
    this.name = "ActiveLinkExistsError";
  }
}
```

- [ ] **Step 4: Implement the application command**

Order the checks and write exactly once:

```ts
const offer = await deps.products.findActiveOffer(productId);
if (offer === undefined) return { ok: false, error: "product_not_found" };

const partnership = await deps.partnerships.find(offer.brandId, creatorId);
if (partnership?.status !== "APPROVED") {
  return { ok: false, error: "partnership_not_approved" };
}
if (await deps.links.findActive(productId, creatorId)) {
  return { ok: false, error: "active_link_exists" };
}

const code = generateLinkCode(deps.random);
try {
  const link = await deps.links.create({
    productId,
    creatorId,
    code,
    commissionType: offer.commissionType,
    commissionValue: offer.commissionValue,
  });
  return { ok: true, value: {
    linkId: link.id,
    code: link.code,
    commissionType: link.commissionType,
    commissionValue: link.commissionValue,
  } };
} catch (error) {
  if (error instanceof ActiveLinkExistsError) {
    return { ok: false, error: "active_link_exists" };
  }
  throw error;
}
```

- [ ] **Step 5: Prove concurrency, history, and rate isolation in PostgreSQL**

Integration tests must call `createProductLinkForCreator` concurrently twice and assert one success, one `active_link_exists`, and exactly one active row. Then disable it, change the product rate, create a second link, and assert the old and new rows retain different rates.

- [ ] **Step 6: Run focused and boundary verification**

```powershell
pnpm vitest run src/modules/partnerships/application/create-product-link.test.ts
pnpm vitest run --config vitest.integration.config.ts src/modules/partnerships/infrastructure/product-link-creation.integration.test.ts
pnpm verify:boundaries
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src
git commit -m "feat: let approved creators create immutable product links"
```

---

### Task 5: Expose link creation to creators and update fixtures

**Files:**

- Create: `src/modules/partnerships/http/link-handlers.ts`
- Create: `src/modules/partnerships/http/link-handlers.test.ts`
- Create: `app/[locale]/creator/links/actions.ts`
- Modify: `app/[locale]/creator/links/page.tsx`
- Modify: `src/modules/partnerships/ui/link-list.tsx`
- Create: `src/modules/partnerships/ui/link-offer-list.tsx`
- Create: `src/modules/partnerships/ui/link-offer-list.test.tsx`
- Modify: `src/modules/partnerships/infrastructure/prisma-link-repository.ts`
- Modify: `src/modules/localization/messages/en.json`
- Modify: `src/modules/localization/messages/ka.json`
- Modify: `scripts/seed-phase-03.ts`
- Modify: `scripts/seed-phase-04.ts`
- Modify: `src/test/e2e/catalog.spec.ts`

**Interfaces:**

- Consumes: Task 4's `createProductLinkForCreator` service.
- Produces: authenticated creator action and UI for choosing one active product at its offered rate.

- [ ] **Step 1: Write the route-contract tests**

```ts
it("creates one link for the authenticated creator and selected product", async () => {
  const response = await createProductLinkHandler(async (creatorId, productId) => ({
    ok: true,
    value: { linkId: "l1", code: "ABCDEFGH", commissionType: "FIXED", commissionValue: "8.0000" },
  }))("c1", new Request("https://shuamo.test", {
    method: "POST",
    body: JSON.stringify({ productId: "p1" }),
  }));
  expect(response.status).toBe(201);
});

it.each([
  ["product_not_found", 404],
  ["partnership_not_approved", 403],
  ["active_link_exists", 409],
] as const)("maps %s to %i", async (error, status) => {
  // Stub the command with the named error and assert the response status.
});
```

- [ ] **Step 2: Run and confirm failure**

```powershell
pnpm vitest run src/modules/partnerships/http/link-handlers.test.ts src/modules/partnerships/ui/link-offer-list.test.tsx
```

Expected: FAIL because the handler and offer component do not exist.

- [ ] **Step 3: Implement the server action and offer query**

Add `listLinkOffersForCreator(creatorId)` returning active products from approved partnerships with no active link:

```ts
interface CreatorProductOffer {
  productId: string;
  title: string;
  brandName: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
}
```

The server action obtains `creatorId` only from `requireCreator(currentViewer())`, accepts only `productId` from form data, invokes the service, and revalidates the creator and brand link pages.

- [ ] **Step 4: Render explicit acceptance**

Each offer card must display brand, product, and formatted rate next to a button whose localized meaning is “Create link at this rate.” Existing link cards must display `link.commissionType` and `link.commissionValue`, not the product's current rate.

Add matching real Georgian and English keys and rely on the existing catalogue parity test.

- [ ] **Step 5: Update deterministic seeds**

Seeds may create explicit intended links, but each row must include its immutable rate snapshot. Use link `id` or `code` for upsert. Do not recreate the former product × approved-creator loop as production behavior; fixture loops are allowed only to establish named test data.

- [ ] **Step 6: Add the browser proof**

The Phase 3 Playwright test must prove:

```text
approved creator opens available products
→ chooses one product
→ sees one copyable link and its agreed rate
→ another active product still has no link
```

- [ ] **Step 7: Run UI and Phase 3 verification**

```powershell
pnpm test:unit
pnpm test:integration
pnpm build
pnpm seed:phase-3
pnpm test:e2e --grep @phase-3
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add app src scripts
git commit -m "feat: add creator initiated product link flow"
```

---

### Task 6: Define the single-link calculator and commissionable net

**Files:**

- Create: `src/modules/attribution/domain/types.ts`
- Create: `src/modules/attribution/domain/line-net.ts`
- Create: `src/modules/attribution/domain/line-net.test.ts`
- Modify: `src/modules/shared/domain/money.ts`
- Modify: `src/modules/shared/domain/money.test.ts`

**Interfaces:**

- Consumes: `Money` and `Rate` from `@/src/modules/shared`.
- Produces: `CalculationInput`, `CalculationResult`, and `commissionableNet` for Task 7.

- [ ] **Step 1: Write the domain types**

```ts
import type { Money, Rate } from "@/src/modules/shared";

export interface CitedLinkTerms {
  readonly clickId: string;
  readonly brandId: string;
  readonly creatorId: string;
  readonly productId: string;
  readonly sku: string;
  readonly rate: Rate;
}

export interface LineItemInput {
  readonly sku: string;
  readonly qty: number;
  readonly unitPrice: Money;
  readonly lineDiscount: Money;
  readonly lineVat: Money | undefined;
}

export interface CalculationInput {
  readonly link: CitedLinkTerms;
  readonly lineItems: readonly LineItemInput[];
  readonly brandVatRegistered: boolean;
}

export interface CalculatedAttribution {
  readonly creatorId: string;
  readonly clickId: string;
  readonly productId: string;
  readonly amount: Money;
}

export interface CalculatedLine {
  readonly sku: string;
  readonly commissionableNet: Money;
  readonly commission: Money;
  readonly attribution: CalculatedAttribution | undefined;
}

export interface CalculationResult {
  readonly lines: readonly CalculatedLine[];
}
```

- [ ] **Step 2: Write the failing net tests**

Copy the exact net/VAT cases from the former Phase 5 plan, but keep the focused signature:

```ts
commissionableNet({
  unitPrice: Money.of("250.00"),
  qty: 1,
  lineDiscount: Money.of("25.00"),
  lineVat: undefined,
  brandVatRegistered: true,
}).toStorageString(); // "190.68"
```

Cover quantity, supplied VAT, derived 18% VAT, non-VAT brands, excessive discounts clamped to zero, and invalid negative quantity rejected at the webhook boundary rather than silently repaired here. First add and test this exact-decimal primitive because `Money` deliberately exposes no generic decimal escape hatch:

```ts
dividedByDecimal(divisor: string): Money {
  const parsed = parseDecimalText(divisor, "Money.dividedByDecimal");
  if (parsed.isZero()) {
    throw new RangeError("Money.dividedByDecimal takes a non-zero divisor");
  }
  return new Money(this.value.dividedBy(parsed));
}
```

Its unit tests cover `Money.of("225.00").dividedByDecimal("1.18")`, zero rejection, malformed text rejection, and preservation of the unrounded exact intermediate.

- [ ] **Step 3: Run and confirm failure**

```powershell
pnpm vitest run src/modules/attribution/domain/line-net.test.ts
```

Expected: FAIL because `line-net.ts` does not exist.

- [ ] **Step 4: Implement the exact-decimal net**

```ts
export function commissionableNet(input: {
  unitPrice: Money;
  qty: number;
  lineDiscount: Money;
  lineVat: Money | undefined;
  brandVatRegistered: boolean;
}): Money {
  const grossAfterDiscount = input.unitPrice
    .times(input.qty)
    .minus(input.lineDiscount);
  if (grossAfterDiscount.isNegative() || grossAfterDiscount.isZero()) {
    return Money.ZERO;
  }
  const explicitOrDerivedVat = input.lineVat ?? (
    input.brandVatRegistered
      ? grossAfterDiscount.minus(grossAfterDiscount.dividedByDecimal("1.18"))
      : Money.ZERO
  );
  const net = grossAfterDiscount.minus(explicitOrDerivedVat);
  return net.isNegative() ? Money.ZERO : net.roundToTetri();
}
```

Do not expose decimal.js or convert the intermediate to a JavaScript number.

- [ ] **Step 5: Run and commit**

```powershell
pnpm vitest run src/modules/attribution/domain/line-net.test.ts src/modules/shared/domain/money.test.ts
pnpm typecheck
git add src/modules/attribution src/modules/shared
git commit -m "feat: define single-link attribution inputs and line net"
```

---

### Task 7: Calculate one full attribution for matching product lines

**Files:**

- Create: `src/modules/attribution/domain/calculate.ts`
- Create: `src/modules/attribution/domain/calculate.test.ts`
- Create: `src/modules/attribution/index.ts`

**Interfaces:**

- Consumes: Task 6's `CalculationInput` and `commissionableNet`.
- Produces: `calculateAttributions(input: CalculationInput): CalculationResult`.

- [ ] **Step 1: Write the failing contract tests**

Use one fixed fixture and name tests with rule IDs:

```ts
const link = {
  clickId: "ck_1",
  brandId: "b1",
  creatorId: "c1",
  productId: "p1",
  sku: "A",
  rate: Rate.percent("0.12"),
};

it("ATTR-004 pays zero when the order contains only another product", () => {
  const result = calculateAttributions(input({
    link,
    lineItems: [line({ sku: "B", unitPrice: Money.of("100.00") })],
  }));
  expect(result.lines[0]?.commission.toStorageString()).toBe("0.00");
  expect(result.lines[0]?.attribution).toBeUndefined();
});

it("ATTR-005 assigns the full matching commission to the link creator", () => {
  const result = calculateAttributions(input({
    link,
    lineItems: [line({ sku: "A", unitPrice: Money.of("100.00") })],
  }));
  expect(result.lines[0]?.commission.toStorageString()).toBe("12.00");
  expect(result.lines[0]?.attribution).toMatchObject({
    creatorId: "c1", clickId: "ck_1", productId: "p1",
  });
  expect(result.lines[0]?.attribution?.amount.toStorageString()).toBe("12.00");
});
```

Also cover mixed carts, two separate matching lines, `FIXED × qty`, VAT, zero/negative net, empty cart, and exact half-up commission rounding. Assert one attribution at most per line and no references to other creators.

- [ ] **Step 2: Run and confirm failure**

```powershell
pnpm vitest run src/modules/attribution/domain/calculate.test.ts
```

Expected: FAIL because `calculate.ts` does not exist.

- [ ] **Step 3: Implement the minimal direct calculator**

```ts
export function calculateAttributions(input: CalculationInput): CalculationResult {
  return {
    lines: input.lineItems.map((item) => {
      const net = commissionableNet({
        unitPrice: item.unitPrice,
        qty: item.qty,
        lineDiscount: item.lineDiscount,
        lineVat: item.lineVat,
        brandVatRegistered: input.brandVatRegistered,
      });

      if (item.sku !== input.link.sku || net.isZero()) {
        return {
          sku: item.sku,
          commissionableNet: net,
          commission: Money.ZERO,
          attribution: undefined,
        };
      }

      const commission = input.link.rate.commissionFor(net, item.qty).roundToTetri();
      return {
        sku: item.sku,
        commissionableNet: net,
        commission,
        attribution: {
          creatorId: input.link.creatorId,
          clickId: input.link.clickId,
          productId: input.link.productId,
          amount: commission,
        },
      };
    }),
  };
}
```

Do not add candidate clicks, cookies, click windows, creator arrays, share helpers, or degradation flags to this module.

- [ ] **Step 4: Export only the public calculator contract**

`src/modules/attribution/index.ts` exports `calculateAttributions` and the types from `types.ts`. Keep `line-net.ts` private.

- [ ] **Step 5: Run and commit**

```powershell
pnpm vitest run src/modules/attribution
pnpm verify:boundaries
pnpm typecheck
git add src/modules/attribution
git commit -m "feat: calculate full commission for the cited product link"
```

---

### Task 8: Prove purity, properties, and stale-model removal

**Files:**

- Create: `src/modules/attribution/domain/calculate.property.test.ts`
- Create: `src/modules/attribution/domain/purity.test.ts`
- Create: `scripts/verify-single-link-attribution.mjs`
- Modify: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: completed single-link calculator and synchronized active docs.
- Produces: `pnpm verify:attribution-correction` and 100% branch coverage for the attribution domain.

- [ ] **Step 1: Add deterministic property tests**

For at least 5,000 seeded random matching lines, assert:

```ts
expect(result.lines).toHaveLength(lineItems.length);
for (const calculated of result.lines) {
  if (calculated.sku !== link.sku || calculated.commissionableNet.isZero()) {
    expect(calculated.attribution).toBeUndefined();
    expect(calculated.commission.toStorageString()).toBe("0.00");
  } else {
    expect(calculated.attribution?.creatorId).toBe(link.creatorId);
    expect(calculated.attribution?.amount.toStorageString())
      .toBe(calculated.commission.toStorageString());
  }
}
```

Use the deterministic `mulberry32` generator pattern already documented in the superseded Phase 5 plan, but never use `Math.random` inside production domain code.

- [ ] **Step 2: Add the purity test**

Scan non-test files in `src/modules/attribution/domain` and reject Prisma, `fetch`, `Date.now`, zero-argument `new Date()`, `node:crypto`, `Math.random`, `fpHash`, visitor identifiers, and `creditable`.

- [ ] **Step 3: Add the stale-model drift guard**

Create a Node script using `globSync` and exact active-file allowlists:

```js
import { readFileSync, globSync } from "node:fs";

const sourcePatterns = [
  /\bcandidateClicks\b/,
  /\bselectCreators\b/,
  /\bdistributeShares\b/,
  /\bsplitDegraded\b/,
  /\.slice\(0,\s*3\)/,
];
const activeDocs = [
  "docs/superpowers/specs/2026-08-28-shuamo-r1-design.md",
  "docs/superpowers/plans/2026-08-29-shuamo-delivery-roadmap.md",
  "docs/superpowers/plans/2026-08-29-phase-06-conversions-api-implementation.md",
];
const docPatterns = [/up to 3/i, /at most 3/i, /split equally/i, /brand-scoped split/i];

const sourceFiles = globSync("src/**/*.{ts,tsx}");
const offenders = [];
for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  if (sourcePatterns.some((pattern) => pattern.test(text))) offenders.push(file);
}
for (const file of activeDocs) {
  const text = readFileSync(file, "utf8");
  if (docPatterns.some((pattern) => pattern.test(text))) offenders.push(file);
}
if (offenders.length > 0) {
  throw new Error(`Stale split-attribution model remains in:\n${[...new Set(offenders)].join("\n")}`);
}
```

Tests may mention forbidden production identifiers only when proving their absence; exclude `*.test.*` from the source glob.

- [ ] **Step 4: Configure coverage and the phase command**

Add attribution-domain thresholds of 100% branches, functions, lines, and statements. Add:

```json
"verify:attribution-model": "node scripts/verify-single-link-attribution.mjs",
"verify:attribution-correction": "pnpm verify:phase-4 && pnpm verify:attribution-model && pnpm test:coverage"
```

Add the missing coverage script exactly as `"test:coverage": "vitest run --config vitest.config.ts --coverage"`. In `vitest.config.ts`, add:

```ts
coverage: {
  provider: "v8",
  include: ["src/modules/attribution/domain/**"],
  thresholds: {
    "src/modules/attribution/domain/**": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
},
```

- [ ] **Step 5: Run and close real gaps**

```powershell
pnpm verify:attribution-model
pnpm vitest run src/modules/attribution
pnpm test:coverage
```

Expected: PASS. For uncovered branches, add a meaningful case or delete dead code; do not exclude reachable calculator code.

- [ ] **Step 6: Commit**

```powershell
git add src/modules/attribution scripts/verify-single-link-attribution.mjs vitest.config.ts package.json
git commit -m "test: enforce the single-link attribution contract"
```

---

### Task 9: Align redirect language and future conversion boundaries

**Files:**

- Modify: `prisma/schema.prisma` comments around `Click`
- Modify: `src/modules/tracking/application/record-click.ts` comments
- Modify: `src/modules/tracking/infrastructure/fp-hash-containment.test.ts`
- Modify: `src/modules/tracking/ports/link-lookup.ts` only if rate fields accidentally entered the redirect hot path
- Modify: `docs/superpowers/plans/2026-08-29-phase-06-conversions-api-implementation.md` if Task 1's type names drifted during implementation

**Interfaces:**

- Consumes: existing Phase 4 redirect and the Task 7 calculator contract.
- Produces: a clear Phase 6 seam: infrastructure resolves one click into `CitedLinkTerms`; the calculator never performs click lookup.

- [ ] **Step 1: Add the containment assertion**

Extend the existing containment test to assert that attribution-domain production files contain none of:

```ts
[/visitorId/, /fp_?[Hh]ash/, /creditable/, /candidate/i]
```

- [ ] **Step 2: Correct misleading comments without changing redirect behavior**

Use this meaning consistently:

```text
visitorId and fpHash deduplicate click analytics only;
the conversion's submitted click ID resolves the earning tracking link.
```

Do not add link-rate columns to the redirect lookup. A click already stores `trackingLinkId`, and Phase 6 can join the immutable rate when the webhook arrives.

- [ ] **Step 3: Verify the Phase 6 boundary matches Task 6**

The future plan must map its resolved database row into exactly:

```ts
const link: CitedLinkTerms = {
  clickId: row.clickId,
  brandId: row.brandId,
  creatorId: row.creatorId,
  productId: row.productId,
  sku: row.sku,
  rate: row.commissionType === "PERCENT"
    ? Rate.percent(row.commissionValue)
    : Rate.fixed(row.commissionValue),
};
```

The resolver, not the calculator, rejects unknown, cross-brand, future, and expired clicks. It must not reject the cited click merely because `creditable = false`.

- [ ] **Step 4: Run Phase 4 regression verification**

```powershell
pnpm vitest run src/modules/tracking
pnpm test:integration
pnpm verify:phase-4
```

Expected: PASS with redirect URL, cookie, and dedup behavior unchanged.

- [ ] **Step 5: Commit**

```powershell
git add prisma src/modules/tracking docs/superpowers/plans/2026-08-29-phase-06-conversions-api-implementation.md
git commit -m "docs: align click tracking with exact-link attribution"
```

---

### Task 10: Final traceability and completion gate

**Files:**

- Modify: this plan's completion checkboxes only as tasks finish
- Modify: `docs/superpowers/plans/2026-08-29-shuamo-delivery-roadmap.md` phase status only if the roadmap records execution status

**Interfaces:**

- Consumes: Tasks 1–9.
- Produces: evidence that every approved design rule is implemented or deliberately deferred to the already-corrected Phase 6 plan.

- [ ] **Step 1: Produce the traceability evidence**

Run:

```powershell
foreach ($id in 1..10) {
  $rule = 'ATTR-{0:D3}' -f $id
  rg -n $rule docs src
}
```

Expected: every ID appears in the approved spec and at least one executable test or, for webhook-only behavior not implemented until Phase 6, in a named Phase 6 test step. `ATTR-001`, `002`, `006`, and `007` must already have PostgreSQL integration coverage; `ATTR-004` and `005` must have calculator unit coverage.

- [ ] **Step 2: Run the complete correction command**

```powershell
pnpm verify:attribution-correction
```

Expected: exit 0, including Phase 0–4 regressions, schema migration from an empty test database, single-link drift guard, and attribution coverage.

- [ ] **Step 3: Inspect the final diff for accidental scope**

```powershell
git status --short
git diff --check
git log --oneline --decorate -12
```

Expected: no uncommitted changes, no whitespace errors, and focused commits corresponding to Tasks 1–9.

- [ ] **Step 4: Complete the checklist**

```text
[ ] Unlimited creators can link one product.
[ ] One active link per creator/product is database-enforced.
[ ] Link rates are immutable snapshots.
[ ] Existing links survive product-rate changes.
[ ] Product and partnership changes create no links automatically.
[ ] Creator chooses one product and explicitly creates its link.
[ ] Matching lines pay one creator the full amount.
[ ] Nonmatching lines pay zero.
[ ] Candidate selection, share distribution, creator cap, and splitDegraded are absent.
[ ] Phase 6 is specified to resolve exactly one submitted click.
[ ] Active specs, roadmap, phase plans, schema, code, and tests agree.
```

- [ ] **Step 5: Commit any final plan-status-only changes**

```powershell
git add docs/superpowers/plans
git commit -m "docs: record single-link attribution correction completion"
```

## Completion definition

This correction is complete only when `pnpm verify:attribution-correction` passes and the traceability search accounts for all ten rules. Passing calculator tests alone is insufficient: link authorization, immutable database terms, removal of automatic minting, active document synchronization, and the Phase 6 exact-click contract are all required deliverables.
