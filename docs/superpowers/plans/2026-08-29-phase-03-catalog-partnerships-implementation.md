# Phase 3 — Catalog, Partnerships & Link Minting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An approved partnership produces one tracking link per active product, automatically, and the four-row disable chain resolves correctly for every one of them.

**Architecture:** Three tables and two pure functions. `resolveLink` (§5) decides whether a link is live, from a single joined row, with no I/O — Phase 4's redirect calls it on the hot path, so it must be a function, not a query. `linksToMint` decides which links a state change implies, also purely, so "approval mints one link per active product" and "a new product mints for every approved creator" are the same tested function called from two places.

**Tech Stack:** Prisma 7 · Zod 4 · React 19 server components and server actions · the Phase 1 component kit.

**Spec:** `docs/superpowers/specs/2026-08-28-shuamo-r1-design.md` §3.2, §4.1, §4.5, §4.6, §5, §7.2 identity block, Appendix A.3.

## Global Constraints

Inherited from the roadmap. The ones this phase exercises:

- There is no `Campaign` (§4.7). Partnership is brand-wide; the rate lives on the product.
- `PERCENT` is a **fraction** ≤ 1, stored `numeric(9,4)`. `FIXED` is GEL per unit.
- Products are **archived, never deleted**. No `DELETE` statement is written against `product`.
- SKUs are brand-scoped: `UNIQUE (brand_id, sku)`. Two brands may both use `P-9`, and Phase 5 depends on this being true.
- A `TrackingLink` exists only where `Partnership.status = APPROVED` held at mint time (§4.6). This is a point-in-time rule, enforced at mint, not a state constraint.
- Disabling is forward-looking only: clicks already recorded run out their full 30-day window (§5).
- Money and rates are exact decimals. Locales `ka` and `en`. WCAG 2.2 AA.
- Each task ends in a commit.

---

## Planned file structure

```
prisma/schema.prisma                                  + Product, Partnership, TrackingLink,
                                                        ProductStatus, PartnershipStatus,
                                                        RateType, LinkStatus
src/modules/catalog/domain/product-rate.ts            RateType <-> Rate, validation
src/modules/catalog/domain/product-rate.test.ts
src/modules/catalog/domain/image-urls.ts              the 8-element application rule
src/modules/catalog/domain/image-urls.test.ts
src/modules/catalog/ports/product-repository.ts
src/modules/catalog/application/create-product.ts     + test
src/modules/catalog/application/update-product.ts     + test
src/modules/catalog/application/archive-product.ts    + test
src/modules/catalog/infrastructure/prisma-product-repository.ts
src/modules/catalog/infrastructure/product.integration.test.ts
src/modules/catalog/http/product-handlers.ts          + test
src/modules/catalog/ui/product-form.tsx
src/modules/catalog/ui/product-list.tsx
src/modules/catalog/index.ts

src/modules/partnerships/domain/link-code.ts          code alphabet + shape
src/modules/partnerships/domain/link-code.test.ts
src/modules/partnerships/domain/link-minting.ts       linksToMint — pure
src/modules/partnerships/domain/link-minting.test.ts
src/modules/partnerships/domain/disable-chain.ts      resolveLink — pure, §5
src/modules/partnerships/domain/disable-chain.test.ts
src/modules/partnerships/ports/partnership-repository.ts
src/modules/partnerships/ports/link-repository.ts
src/modules/partnerships/application/apply-to-brand.ts        + test
src/modules/partnerships/application/decide-partnership.ts    + test
src/modules/partnerships/application/mint-links-for-product.ts + test
src/modules/partnerships/application/set-link-status.ts       + test
src/modules/partnerships/infrastructure/prisma-*.ts
src/modules/partnerships/infrastructure/minting.integration.test.ts
src/modules/partnerships/http/partnership-handlers.ts + test
src/modules/partnerships/ui/partnership-queue.tsx
src/modules/partnerships/ui/link-list.tsx
src/modules/partnerships/index.ts

app/[locale]/brand/products/page.tsx  ·  products/new/page.tsx  ·  products/[id]/page.tsx
app/[locale]/brand/creators/page.tsx
app/[locale]/creator/brands/page.tsx
app/[locale]/creator/links/page.tsx
scripts/seed-phase-03.ts
src/test/e2e/catalog.spec.ts                          @phase-3
```

---

### Task 1: Add the catalog and link tables

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `src/modules/catalog/infrastructure/product.integration.test.ts`

**Interfaces:**

- Consumes: `Brand`, `Creator` from Phase 2
- Produces: models `Product`, `Partnership`, `TrackingLink`; enums `ProductStatus`, `PartnershipStatus`, `RateType`, `LinkStatus`

- [ ] **Step 1: Write the failing constraint test**

`src/modules/catalog/infrastructure/product.integration.test.ts`. Every CHECK in Appendix A.3 gets an assertion — a constraint nobody has tried to violate is a constraint nobody has proved:

```ts
import { Prisma } from "@/src/generated/prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedBrand } from "@/src/test/fixtures/accounts";

describe("product table", () => {
  it("stores a percent rate as a fraction with four decimal places", async () => {
    const brand = await seedBrand();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: "P-9",
        title: "Perfume 100ml",
        priceGel: new Prisma.Decimal("250.00"),
        backlinkUrl: "https://aromashop.ge/p/perfume-100",
        commissionType: "PERCENT",
        commissionValue: new Prisma.Decimal("0.1250"),
      },
    });

    expect(product.commissionValue.toString()).toBe("0.125");
    expect(product.priceGel.toString()).toBe("250");
    expect(product.status).toBe("ACTIVE");
    expect(product.imageUrls).toEqual([]);
  });

  it("refuses a PERCENT rate above 1 — percent_is_fraction", async () => {
    const brand = await seedBrand();
    await expect(
      prisma.product.create({
        data: {
          brandId: brand.id,
          sku: "P-BAD",
          title: "Bad rate",
          priceGel: new Prisma.Decimal("1.00"),
          backlinkUrl: "https://example.ge",
          commissionType: "PERCENT",
          commissionValue: new Prisma.Decimal("12.5"),
        },
      }),
    ).rejects.toThrowError();
  });

  it("permits a FIXED rate above 1", async () => {
    const brand = await seedBrand();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: "P-FIX",
        title: "Fixed",
        priceGel: new Prisma.Decimal("100.00"),
        backlinkUrl: "https://example.ge",
        commissionType: "FIXED",
        commissionValue: new Prisma.Decimal("5.0000"),
      },
    });
    expect(product.commissionValue.toString()).toBe("5");
  });

  it("refuses a ninth image url — image_urls_bounded", async () => {
    const brand = await seedBrand();
    await expect(
      prisma.product.create({
        data: {
          brandId: brand.id,
          sku: "P-IMG",
          title: "Too many",
          priceGel: new Prisma.Decimal("1.00"),
          backlinkUrl: "https://example.ge",
          commissionType: "FIXED",
          commissionValue: new Prisma.Decimal("1"),
          imageUrls: Array.from({ length: 9 }, (_, i) => `https://cdn.ge/${i}.jpg`),
        },
      }),
    ).rejects.toThrowError();
  });

  it("scopes SKUs to the brand: two brands may both use P-9", async () => {
    const first = await seedBrand({ email: "one@example.ge" });
    const second = await seedBrand({ email: "two@example.ge" });
    const base = {
      sku: "P-9",
      title: "Shared SKU",
      priceGel: new Prisma.Decimal("10.00"),
      backlinkUrl: "https://example.ge",
      commissionType: "FIXED" as const,
      commissionValue: new Prisma.Decimal("1"),
    };

    await prisma.product.create({ data: { ...base, brandId: first.id } });
    await expect(
      prisma.product.create({ data: { ...base, brandId: second.id } }),
    ).resolves.toBeDefined();
  });

  it("refuses a duplicate SKU within one brand", async () => {
    const brand = await seedBrand();
    const base = {
      brandId: brand.id,
      sku: "P-DUP",
      title: "Dup",
      priceGel: new Prisma.Decimal("10.00"),
      backlinkUrl: "https://example.ge",
      commissionType: "FIXED" as const,
      commissionValue: new Prisma.Decimal("1"),
    };

    await prisma.product.create({ data: base });
    await expect(prisma.product.create({ data: base })).rejects.toThrowError();
  });

  it("refuses a negative price", async () => {
    const brand = await seedBrand();
    await expect(
      prisma.$executeRaw`
        INSERT INTO product (brand_id, sku, title, price_gel, backlink_url,
                             commission_type, commission_value)
        VALUES (${brand.id}::uuid, 'P-NEG', 'Neg', -1, 'https://x.ge', 'FIXED', 1)
      `,
    ).rejects.toThrowError();
  });
});
```

`src/test/fixtures/accounts.ts` is new here: a small helper that creates an approved brand or creator with sensible defaults. Every later phase's integration tests use it, so write it once and export `seedBrand`, `seedCreator`, `seedApprovedPartnership`.

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm test:integration
```

Expected: FAIL — `prisma.product` undefined.

- [ ] **Step 3: Write the schema**

```prisma
enum ProductStatus  { ACTIVE ARCHIVED }
enum PartnershipStatus { PENDING APPROVED REJECTED }
enum RateType     { PERCENT FIXED }
enum LinkStatus   { ACTIVE DISABLED }

model Product {
  id              String         @id @default(uuid()) @db.Uuid
  brandId         String         @map("brand_id") @db.Uuid
  sku             String
  title           String
  description     String         @default("")
  priceGel        Decimal        @map("price_gel") @db.Decimal(12, 2)
  imageUrls       String[]       @default([]) @map("image_urls")
  backlinkUrl     String         @map("backlink_url")
  commissionType  RateType       @map("commission_type")
  commissionValue Decimal        @map("commission_value") @db.Decimal(9, 4)
  status          ProductStatus  @default(ACTIVE)
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)

  brand Brand          @relation(fields: [brandId], references: [id], onDelete: Restrict)
  links TrackingLink[]

  @@unique([brandId, sku])
  @@map("product")
}

model Partnership {
  id        String            @id @default(uuid()) @db.Uuid
  brandId   String            @map("brand_id") @db.Uuid
  creatorId String            @map("creator_id") @db.Uuid
  status    PartnershipStatus @default(PENDING)
  createdAt DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)

  brand   Brand   @relation(fields: [brandId], references: [id], onDelete: Cascade)
  creator Creator @relation(fields: [creatorId], references: [id], onDelete: Restrict)

  @@unique([brandId, creatorId])
  @@index([creatorId, status], map: "partnership_creator_idx")
  @@map("partnership")
}

model TrackingLink {
  id        String     @id @default(uuid()) @db.Uuid
  productId String     @map("product_id") @db.Uuid
  creatorId String     @map("creator_id") @db.Uuid
  code      String     @unique
  status    LinkStatus @default(ACTIVE)
  createdAt DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)

  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)
  creator Creator @relation(fields: [creatorId], references: [id], onDelete: Restrict)

  @@unique([productId, creatorId])
  @@index([creatorId], map: "tracking_link_creator_idx")
  @@map("tracking_link")
}
```

- [ ] **Step 4: Add the CHECK constraints by hand**

Prisma cannot express these. Append to the generated migration:

```sql
ALTER TABLE "product"
  ADD CONSTRAINT product_price_non_negative CHECK (price_gel >= 0),
  ADD CONSTRAINT product_rate_non_negative  CHECK (commission_value >= 0),
  ADD CONSTRAINT percent_is_fraction
    CHECK (commission_type <> 'PERCENT' OR commission_value <= 1),
  ADD CONSTRAINT image_urls_bounded CHECK (cardinality(image_urls) <= 8);
```

- [ ] **Step 5: Diff against Appendix A.3 and run**

Check specifically: `numeric(12,2)` on `price_gel`, `numeric(9,4)` on `commission_value`, `text[]` defaulting to `'{}'`, `ON DELETE RESTRICT` on `product.brand_id` but `CASCADE` on `partnership.brand_id` — the spec differs between them deliberately, and getting it backwards means either an undeletable brand or a silently vanishing catalogue.

```bash
pnpm db:migrate --name phase_3_catalog && pnpm db:migrate:test && pnpm test:integration
```

Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma src/modules/catalog src/test/fixtures
git commit -m "feat: add the catalog, partnership, and tracking link tables"
```

---

### Task 2: Implement the disable chain

**Files:**

- Create: `src/modules/partnerships/domain/disable-chain.ts`, `disable-chain.test.ts`

**Interfaces:**

- Consumes: nothing — this is the purest function in the phase
- Produces:
  - `type DisableReason = "BRAND_DISABLED" | "CREATOR_REMOVED" | "PRODUCT_ARCHIVED" | "LINK_DISABLED"`
  - `type LinkState = { brandStatus: ApprovalStatus; partnershipStatus: PartnershipStatus | undefined; productStatus: ProductStatus; linkStatus: LinkStatus }`
  - `type LinkResolution = { active: true } | { active: false; reason: DisableReason }`
  - `resolveLink(state: LinkState): LinkResolution`

Phase 4's redirect calls this on every click, so it takes a plain object and returns a plain object.

- [ ] **Step 1: Write the failing table-driven test**

`src/modules/partnerships/domain/disable-chain.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type LinkState, resolveLink } from "./disable-chain";

const live: LinkState = {
  brandStatus: "APPROVED",
  partnershipStatus: "APPROVED",
  productStatus: "ACTIVE",
  linkStatus: "ACTIVE",
};

describe("resolveLink", () => {
  it("is active when every row passes", () => {
    expect(resolveLink(live)).toEqual({ active: true });
  });

  it.each([
    ["a suspended brand", { brandStatus: "SUSPENDED" }, "BRAND_DISABLED"],
    ["a pending brand", { brandStatus: "PENDING" }, "BRAND_DISABLED"],
    ["a rejected partnership", { partnershipStatus: "REJECTED" }, "CREATOR_REMOVED"],
    ["a pending partnership", { partnershipStatus: "PENDING" }, "CREATOR_REMOVED"],
    ["a missing partnership", { partnershipStatus: undefined }, "CREATOR_REMOVED"],
    ["an archived product", { productStatus: "ARCHIVED" }, "PRODUCT_ARCHIVED"],
    ["a disabled link", { linkStatus: "DISABLED" }, "LINK_DISABLED"],
  ] as const)("reports %s as %s", (_name, override, reason) => {
    expect(resolveLink({ ...live, ...override })).toEqual({ active: false, reason });
  });

  it("reports the first failing row, not the last — order is the contract", () => {
    // A suspended brand whose product is also archived is BRAND_DISABLED.
    // §5: first match wins and determines the reason shown.
    expect(
      resolveLink({
        brandStatus: "SUSPENDED",
        partnershipStatus: "REJECTED",
        productStatus: "ARCHIVED",
        linkStatus: "DISABLED",
      }),
    ).toEqual({ active: false, reason: "BRAND_DISABLED" });
  });

  it("prefers CREATOR_REMOVED over PRODUCT_ARCHIVED", () => {
    expect(
      resolveLink({ ...live, partnershipStatus: "REJECTED", productStatus: "ARCHIVED" }),
    ).toEqual({ active: false, reason: "CREATOR_REMOVED" });
  });

  it("prefers PRODUCT_ARCHIVED over LINK_DISABLED", () => {
    expect(
      resolveLink({ ...live, productStatus: "ARCHIVED", linkStatus: "DISABLED" }),
    ).toEqual({ active: false, reason: "PRODUCT_ARCHIVED" });
  });
});
```

- [ ] **Step 2: Run, confirm failure, implement**

```bash
pnpm vitest run src/modules/partnerships/domain/disable-chain.test.ts   # FAIL
```

```ts
export type DisableReason =
  | "BRAND_DISABLED"
  | "CREATOR_REMOVED"
  | "PRODUCT_ARCHIVED"
  | "LINK_DISABLED";

export type LinkResolution =
  | { readonly active: true }
  | { readonly active: false; readonly reason: DisableReason };

export interface LinkState {
  readonly brandStatus: "PENDING" | "APPROVED" | "SUSPENDED";
  readonly partnershipStatus: "PENDING" | "APPROVED" | "REJECTED" | undefined;
  readonly productStatus: "ACTIVE" | "ARCHIVED";
  readonly linkStatus: "ACTIVE" | "DISABLED";
}

/**
 * §5. Four rows, evaluated in order; first match wins and names the reason.
 * The order is the contract, not an implementation detail: a buyer sent to a
 * suspended brand's archived product must be told the brand is gone, because
 * that is the fact the creator needs to act on.
 */
export function resolveLink(state: LinkState): LinkResolution {
  if (state.brandStatus !== "APPROVED") {
    return { active: false, reason: "BRAND_DISABLED" };
  }
  if (state.partnershipStatus !== "APPROVED") {
    return { active: false, reason: "CREATOR_REMOVED" };
  }
  if (state.productStatus === "ARCHIVED") {
    return { active: false, reason: "PRODUCT_ARCHIVED" };
  }
  if (state.linkStatus === "DISABLED") {
    return { active: false, reason: "LINK_DISABLED" };
  }
  return { active: true };
}
```

- [ ] **Step 3: Run and commit**

```bash
pnpm vitest run src/modules/partnerships/domain
git add src/modules/partnerships/domain
git commit -m "feat: resolve the four-row disable chain as a pure function"
```

---

### Task 3: Generate link codes and decide what to mint

**Files:**

- Create: `src/modules/partnerships/domain/link-code.ts`, `link-code.test.ts`
- Create: `src/modules/partnerships/domain/link-minting.ts`, `link-minting.test.ts`

**Interfaces:**

- Consumes: `RandomSource` from `@/src/modules/identity` (re-exported through its index)
- Produces:
  - `generateLinkCode(random: RandomSource): string` — 8 Crockford base32 characters
  - `isLinkCode(value: string): boolean`
  - `linksToMint(input: { products: readonly { id: string; status: ProductStatus }[]; creators: readonly { id: string; partnershipStatus: PartnershipStatus }[]; existing: readonly { productId: string; creatorId: string }[] }): { productId: string; creatorId: string }[]`

- [ ] **Step 1: Write the failing minting test**

`link-minting.test.ts` — this one function carries three of the phase's rules, so its test names them:

```ts
import { describe, expect, it } from "vitest";
import { linksToMint } from "./link-minting";

const active = (id: string) => ({ id, status: "ACTIVE" as const });
const archived = (id: string) => ({ id, status: "ARCHIVED" as const });
const approved = (id: string) => ({ id, partnershipStatus: "APPROVED" as const });

describe("linksToMint", () => {
  it("mints one link per active product on approval", () => {
    const result = linksToMint({
      products: [active("p1"), active("p2"), active("p3")],
      creators: [approved("c1")],
      existing: [],
    });

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.productId).sort()).toEqual(["p1", "p2", "p3"]);
  });

  it("mints for every approved creator when a product is added", () => {
    const result = linksToMint({
      products: [active("p-new")],
      creators: [approved("c1"), approved("c2")],
      existing: [],
    });

    expect(result).toEqual([
      { productId: "p-new", creatorId: "c1" },
      { productId: "p-new", creatorId: "c2" },
    ]);
  });

  it("never mints for an archived product", () => {
    expect(
      linksToMint({
        products: [active("p1"), archived("p2")],
        creators: [approved("c1")],
        existing: [],
      }),
    ).toEqual([{ productId: "p1", creatorId: "c1" }]);
  });

  it("never mints for a non-APPROVED partnership — §4.6", () => {
    for (const status of ["PENDING", "REJECTED"] as const) {
      expect(
        linksToMint({
          products: [active("p1")],
          creators: [{ id: "c1", partnershipStatus: status }],
          existing: [],
        }),
      ).toEqual([]);
    }
  });

  it("does not duplicate an existing link", () => {
    expect(
      linksToMint({
        products: [active("p1"), active("p2")],
        creators: [approved("c1")],
        existing: [{ productId: "p1", creatorId: "c1" }],
      }),
    ).toEqual([{ productId: "p2", creatorId: "c1" }]);
  });

  it("re-approving a partnership mints nothing new", () => {
    expect(
      linksToMint({
        products: [active("p1")],
        creators: [approved("c1")],
        existing: [{ productId: "p1", creatorId: "c1" }],
      }),
    ).toEqual([]);
  });

  it("returns nothing when there is nothing to mint", () => {
    expect(linksToMint({ products: [], creators: [], existing: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, confirm failure, implement**

```ts
export function linksToMint(input: {
  products: readonly { id: string; status: "ACTIVE" | "ARCHIVED" }[];
  creators: readonly {
    id: string;
    partnershipStatus: "PENDING" | "APPROVED" | "REJECTED";
  }[];
  existing: readonly { productId: string; creatorId: string }[];
}): { productId: string; creatorId: string }[] {
  const already = new Set(
    input.existing.map((link) => `${link.productId}:${link.creatorId}`),
  );

  const pairs: { productId: string; creatorId: string }[] = [];

  for (const product of input.products) {
    if (product.status !== "ACTIVE") continue;
    for (const creator of input.creators) {
      if (creator.partnershipStatus !== "APPROVED") continue;
      if (already.has(`${product.id}:${creator.id}`)) continue;
      pairs.push({ productId: product.id, creatorId: creator.id });
    }
  }

  return pairs;
}
```

- [ ] **Step 3: Write and satisfy the link-code test**

```ts
import { describe, expect, it } from "vitest";
import { generateLinkCode, isLinkCode } from "./link-code";

describe("link codes", () => {
  it("is eight characters of unambiguous base32", () => {
    const code = generateLinkCode({ bytes: (n) => new Uint8Array(n).fill(9) });
    expect(code).toMatch(/^[0-9A-HJ-NP-TV-Z]{8}$/);
  });

  it("excludes I, L, O and U so a code can be read aloud", () => {
    const code = generateLinkCode({
      bytes: (n) => Uint8Array.from({ length: n }, (_, i) => i),
    });
    expect(code).not.toMatch(/[ILOU]/);
  });

  it("accepts a well-formed code and rejects anything else", () => {
    expect(isLinkCode("K7M2QPXZ")).toBe(true);
    expect(isLinkCode("K7M2QP")).toBe(false);
    expect(isLinkCode("k7m2qpxz")).toBe(false);
    expect(isLinkCode("K7M2QPXI")).toBe(false);
  });
});
```

A code is 8 characters rather than 6 because `UNIQUE (code)` is the redirect's lookup key and a collision means a retry loop on the hot write path. 8 characters of 32-symbol alphabet is 40 bits, so collisions stay theoretical at pilot volume.

- [ ] **Step 4: Run and commit**

```bash
pnpm vitest run src/modules/partnerships/domain
git add src/modules/partnerships/domain
git commit -m "feat: generate link codes and decide which links to mint"
```

---

### Task 4: Create, edit and archive products

**Files:**

- Create: `src/modules/catalog/domain/product-rate.ts`, `product-rate.test.ts`
- Create: `src/modules/catalog/domain/image-urls.ts`, `image-urls.test.ts`
- Create: `src/modules/catalog/ports/product-repository.ts`
- Create: `src/modules/catalog/application/create-product.ts`, `update-product.ts`, `archive-product.ts` and their tests
- Create: `src/modules/catalog/infrastructure/prisma-product-repository.ts`
- Create: `src/modules/catalog/http/product-handlers.ts`, `product-handlers.test.ts`
- Create: `src/modules/catalog/index.ts`

**Interfaces:**

- Consumes: `Money`, `Rate` from `@/src/modules/shared`; `linksToMint` through `@/src/modules/partnerships`
- Produces:
  - `parseProductRate(input: { type: "PERCENT" | "FIXED"; value: string }): Result<Rate, RateError>`
  - `parseImageUrls(values: readonly string[]): Result<string[], ImageUrlError>`
  - `createProduct(deps)(brandId, input): Promise<Result<{ id: string; mintedLinks: number }, CreateProductError>>`
  - `archiveProduct(deps)(brandId, productId): Promise<Result<void, "not_found" | "not_yours">>`

- [ ] **Step 1: Write the failing rate-parsing test**

The rate field is where a brand's typo becomes a hundredfold commission error, so it is tested as if that were guaranteed to happen:

```ts
import { describe, expect, it } from "vitest";
import { parseProductRate } from "./product-rate";

describe("parseProductRate", () => {
  it("accepts a fraction for PERCENT", () => {
    const result = parseProductRate({ type: "PERCENT", value: "0.125" });
    expect(result.ok && result.value.storedValue).toBe("0.125");
  });

  it("rejects a whole number of percent, which is the dangerous typo", () => {
    const result = parseProductRate({ type: "PERCENT", value: "12.5" });
    expect(result).toEqual({ ok: false, error: "percent_must_be_a_fraction" });
  });

  it("accepts exactly 1 for PERCENT — a full-margin giveaway is legal", () => {
    expect(parseProductRate({ type: "PERCENT", value: "1" }).ok).toBe(true);
  });

  it("accepts a large FIXED value", () => {
    expect(parseProductRate({ type: "FIXED", value: "250.00" }).ok).toBe(true);
  });

  it("rejects more than four decimal places", () => {
    expect(parseProductRate({ type: "PERCENT", value: "0.12345" })).toEqual({
      ok: false,
      error: "too_many_decimal_places",
    });
  });

  it("rejects a negative value of either kind", () => {
    expect(parseProductRate({ type: "PERCENT", value: "-0.1" }).ok).toBe(false);
    expect(parseProductRate({ type: "FIXED", value: "-1" }).ok).toBe(false);
  });

  it("rejects a value that is not a number", () => {
    expect(parseProductRate({ type: "FIXED", value: "ten" }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing image-url test**

```ts
import { describe, expect, it } from "vitest";
import { parseImageUrls } from "./image-urls";

describe("parseImageUrls", () => {
  it("accepts up to eight https urls and preserves their order", () => {
    const urls = Array.from({ length: 8 }, (_, i) => `https://cdn.ge/${i}.jpg`);
    expect(parseImageUrls(urls)).toEqual({ ok: true, value: urls });
  });

  it("accepts an empty list — §4.1 says empty is legal", () => {
    expect(parseImageUrls([])).toEqual({ ok: true, value: [] });
  });

  it("rejects a ninth url", () => {
    expect(
      parseImageUrls(Array.from({ length: 9 }, (_, i) => `https://cdn.ge/${i}.jpg`)),
    ).toEqual({ ok: false, error: "too_many_images" });
  });

  it("rejects http, which would break the page it is embedded in", () => {
    expect(parseImageUrls(["http://cdn.ge/1.jpg"])).toEqual({
      ok: false,
      error: "insecure_url",
    });
  });

  it("rejects an empty string", () => {
    expect(parseImageUrls([""])).toEqual({ ok: false, error: "empty_url" });
  });
});
```

- [ ] **Step 3: Run, confirm failure, implement both**

```bash
pnpm vitest run src/modules/catalog/domain   # FAIL: modules not found
```

Both are small pure functions returning `Result`. `parseImageUrls` enforces the rule Appendix A.3 explicitly says a CHECK cannot express — per-element validation over an array — which is why it lives in the domain and is tested here.

- [ ] **Step 4: Write the failing create-product test**

The behaviour worth testing at the application layer is the one that surprises people: creating a product mints links.

```ts
import { describe, expect, it } from "vitest";
import { createProduct } from "./create-product";

describe("createProduct", () => {
  it("mints a link for every approved creator — §3.2", async () => {
    const minted: unknown[] = [];

    const result = await createProduct({
      products: {
        create: async (input) => ({ id: "p-new", ...input }),
        findBrandSku: async () => undefined,
      },
      partnerships: { listApprovedCreatorIds: async () => ["c1", "c2"] },
      links: {
        listForProducts: async () => [],
        createMany: async (pairs) => void minted.push(...pairs),
      },
      random: { bytes: (n) => new Uint8Array(n).fill(1) },
    })("b1", validInput);

    expect(result.ok).toBe(true);
    expect(minted).toHaveLength(2);
  });

  it("mints nothing when the brand has no approved creators", async () => {
    const minted: unknown[] = [];
    await createProduct({
      products: { create: async (i) => ({ id: "p", ...i }), findBrandSku: async () => undefined },
      partnerships: { listApprovedCreatorIds: async () => [] },
      links: { listForProducts: async () => [], createMany: async (p) => void minted.push(...p) },
      random: { bytes: (n) => new Uint8Array(n) },
    })("b1", validInput);

    expect(minted).toEqual([]);
  });

  it("refuses a duplicate SKU before touching the link table", async () => {
    let mintCalled = false;
    const result = await createProduct({
      products: {
        create: async () => { throw new Error("must not be reached"); },
        findBrandSku: async () => ({ id: "existing" }),
      },
      partnerships: { listApprovedCreatorIds: async () => ["c1"] },
      links: { listForProducts: async () => [], createMany: async () => void (mintCalled = true) },
      random: { bytes: (n) => new Uint8Array(n) },
    })("b1", validInput);

    expect(result).toEqual({ ok: false, error: "duplicate_sku" });
    expect(mintCalled).toBe(false);
  });
});
```

- [ ] **Step 5: Implement, wrapping the write in one transaction**

The product insert and the link inserts are one transaction. A product that exists with no links is a product whose creators silently cannot promote it, and that failure is invisible until someone asks why a creator has no link.

- [ ] **Step 6: Implement archive**

`archiveProduct` sets `status = ARCHIVED`. It **does not** touch `tracking_link`: the links stay, and `resolveLink` reports `PRODUCT_ARCHIVED` for them. That is what makes §5's "in-flight clicks stay creditable" true without any extra machinery — the click rows are untouched, and only the redirect changes behaviour.

Write the test that asserts exactly this:

```ts
it("archives without deleting or disabling any link", async () => {
  const touched: string[] = [];
  await archiveProduct({
    products: { setStatus: async (id, status) => void touched.push(`${id}:${status}`), findOwned: async () => ({ id: "p1", brandId: "b1" }) },
    links: { setStatusForProduct: async () => void touched.push("LINKS TOUCHED") },
  })("b1", "p1");

  expect(touched).toEqual(["p1:ARCHIVED"]);
});
```

- [ ] **Step 7: Run everything and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/catalog
git commit -m "feat: create, edit and archive products, minting links on creation"
```

---

### Task 5: Apply, invite, approve and reject

**Files:**

- Create: `src/modules/partnerships/application/apply-to-brand.ts`, `decide-partnership.ts` and their tests
- Create: `src/modules/partnerships/application/set-link-status.ts`, `mint-links-for-product.ts` and their tests
- Create: `src/modules/partnerships/infrastructure/*`, `minting.integration.test.ts`
- Create: `src/modules/partnerships/http/partnership-handlers.ts`, `partnership-handlers.test.ts`
- Create: `src/modules/partnerships/index.ts`

**Interfaces:**

- Consumes: `linksToMint`, `generateLinkCode`, the repositories
- Produces:
  - `applyToBrand(deps)(creatorId, brandId): Promise<Result<{ partnershipId: string }, "already_exists" | "brand_not_found">>`
  - `inviteCreator(deps)(brandId, creatorId): Promise<Result<{ partnershipId: string; mintedLinks: number }, "already_exists" | "creator_not_found" | "creator_not_approved">>`
  - `decidePartnership(deps)(brandId, partnershipId, decision: "APPROVE" | "REJECT"): Promise<Result<{ mintedLinks: number }, ...>>`

`inviteCreator` and `applyToBrand` create the same row from opposite ends. The
difference is the status it lands in: an application starts `PENDING` and waits
for the brand, while an invitation the brand initiated is already the brand's
consent, so it lands `APPROVED` and mints immediately. Test both:

```ts
it("an application from a creator lands PENDING and mints nothing", async () => {
  const minted: unknown[] = [];
  const result = await applyToBrand(deps({ onMint: (p) => minted.push(...p) }))("c1", "b1");

  expect(result.ok).toBe(true);
  expect(await statusOf(result.value.partnershipId)).toBe("PENDING");
  expect(minted).toEqual([]);
});

it("an invitation from a brand lands APPROVED and mints at once", async () => {
  const result = await inviteCreator(deps({ activeProducts: ["p1", "p2"] }))("b1", "c1");

  expect(result.ok && result.value.mintedLinks).toBe(2);
  expect(await statusOf(result.value.partnershipId)).toBe("APPROVED");
});

it("refuses to invite a creator who is not APPROVED by an administrator", async () => {
  // §3.4: the marketplace is curated. A brand cannot admit a creator SHUAMO
  // has not approved.
  const result = await inviteCreator(deps({ creatorStatus: "PENDING" }))("b1", "c1");
  expect(result).toEqual({ ok: false, error: "creator_not_approved" });
});

it("refuses a duplicate in either direction", async () => {
  await applyToBrand(deps())("c1", "b1");
  expect((await inviteCreator(deps({ existing: true }))("b1", "c1")).ok).toBe(false);
});
```
  - `setLinkStatus(deps)(actor, linkId, status): Promise<Result<void, ...>>`

- [ ] **Step 1: Write the failing decision test**

```ts
describe("decidePartnership", () => {
  it("mints one link per active product on approval", async () => {
    const created: unknown[] = [];

    const result = await decidePartnership({
      partnerships: {
        findForBrand: async () => ({ id: "pt1", brandId: "b1", creatorId: "c1", status: "PENDING" }),
        setStatus: async () => undefined,
      },
      products: { listActiveForBrand: async () => [{ id: "p1", status: "ACTIVE" }, { id: "p2", status: "ACTIVE" }] },
      links: { listForCreator: async () => [], createMany: async (pairs) => void created.push(...pairs) },
      random: { bytes: (n) => new Uint8Array(n).fill(2) },
    })("b1", "pt1", "APPROVE");

    expect(result).toEqual({ ok: true, value: { mintedLinks: 2 } });
    expect(created).toHaveLength(2);
  });

  it("mints nothing on rejection", async () => {
    const created: unknown[] = [];
    const result = await decidePartnership({
      partnerships: {
        findForBrand: async () => ({ id: "pt1", brandId: "b1", creatorId: "c1", status: "PENDING" }),
        setStatus: async () => undefined,
      },
      products: { listActiveForBrand: async () => [{ id: "p1", status: "ACTIVE" }] },
      links: { listForCreator: async () => [], createMany: async (p) => void created.push(...p) },
      random: { bytes: (n) => new Uint8Array(n) },
    })("b1", "pt1", "REJECT");

    expect(result).toEqual({ ok: true, value: { mintedLinks: 0 } });
    expect(created).toEqual([]);
  });

  it("refuses to decide a partnership belonging to another brand", async () => {
    const result = await decidePartnership({
      partnerships: { findForBrand: async () => undefined, setStatus: async () => undefined },
      products: { listActiveForBrand: async () => [] },
      links: { listForCreator: async () => [], createMany: async () => undefined },
      random: { bytes: (n) => new Uint8Array(n) },
    })("b-other", "pt1", "APPROVE");

    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("re-approving an approved partnership mints no duplicates", async () => {
    const created: unknown[] = [];
    await decidePartnership({
      partnerships: {
        findForBrand: async () => ({ id: "pt1", brandId: "b1", creatorId: "c1", status: "APPROVED" }),
        setStatus: async () => undefined,
      },
      products: { listActiveForBrand: async () => [{ id: "p1", status: "ACTIVE" }] },
      links: { listForCreator: async () => [{ productId: "p1", creatorId: "c1" }], createMany: async (p) => void created.push(...p) },
      random: { bytes: (n) => new Uint8Array(n) },
    })("b1", "pt1", "APPROVE");

    expect(created).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement, in one transaction**

The status change and the link inserts commit together, for the same reason as Task 4 Step 5.

- [ ] **Step 3: Write the integration test that proves the point-in-time rule**

`minting.integration.test.ts` goes through the real database, because §4.6's "links minted only for `APPROVED` partnerships" is the invariant Appendix A.6 says no constraint can express:

```ts
it("mints no link for a partnership that was never approved", async () => {
  const { brand, creator } = await seedBrandAndCreator();
  await prisma.partnership.create({
    data: { brandId: brand.id, creatorId: creator.id, status: "PENDING" },
  });
  await seedProduct(brand.id, "P-1");

  const links = await prisma.trackingLink.count({ where: { creatorId: creator.id } });
  expect(links).toBe(0);
});

it("mints for a product added after approval", async () => {
  const { brand, creator } = await seedApprovedPartnership();
  await createProductThroughApplication(brand.id, "P-LATER");

  const link = await prisma.trackingLink.findFirst({
    where: { creatorId: creator.id, product: { sku: "P-LATER" } },
  });
  expect(link).not.toBeNull();
  expect(link?.status).toBe("ACTIVE");
});

it("refuses two links for the same product and creator", async () => {
  const { link } = await seedLink();
  await expect(
    prisma.trackingLink.create({
      data: { productId: link.productId, creatorId: link.creatorId, code: "OTHERCOD" },
    }),
  ).rejects.toThrowError();
});
```

- [ ] **Step 4: Run and commit**

```bash
pnpm test:unit && pnpm db:migrate:test && pnpm test:integration
git add src/modules/partnerships
git commit -m "feat: apply, approve and reject partnerships, minting links on approval"
```

---

### Task 6: Build the catalog and partnership screens

**Files:**

- Create: `app/[locale]/brand/products/page.tsx`, `products/new/page.tsx`, `products/[id]/page.tsx`
- Create: `app/[locale]/brand/creators/page.tsx`
- Create: `app/[locale]/creator/brands/page.tsx`, `creator/links/page.tsx`
- Create: `src/modules/catalog/ui/product-form.tsx`, `product-list.tsx`
- Create: `src/modules/partnerships/ui/partnership-queue.tsx`, `link-list.tsx`
- Modify: the message catalogues

**Interfaces:**

- Consumes: `requireBrand` / `requireCreator` from `@/src/modules/identity`; the Phase 1 kit
- Produces: five screens, both locales

- [ ] **Step 1: Build the product form**

Fields: SKU, title, description, price, up to 8 image URLs, backlink URL, commission type, commission value.

The rate control is the one that needs design attention rather than a plain number input:

- A segmented control chooses `PERCENT` or `FIXED`, because the two are different units and a dropdown hides that.
- With `PERCENT` selected, the input shows a `%` suffix and the user types `12.5`; the form converts to `0.125` on submit. The stored fraction is shown beneath as `= 0.125`, so what the database holds is never a surprise.
- A live preview reads: *"On a 250.00 ₾ sale, a creator earns 31.25 ₾"*, using `MoneyAmount`.
- Editing an existing rate shows a `Banner` at `warning` tone stating, in both locales, that the new rate applies to clicks that have not yet converted, and that the archive-and-republish path exists (§1.2 risk 3). This is the interface making a documented risk visible rather than leaving it in a spec.

- [ ] **Step 2: Build the product list**

A `DataTable` of SKU, title, price, rate, status, and link count. Archived products stay in the list under a filter, greyed, with an `ARCHIVED` `StatusPill` — never removed, because §3.2 says archive is the only deletion and a list that hides them implies otherwise.

- [ ] **Step 3: Build the partnership queue**

For the brand: pending applications with Approve and Reject. Approving states, in the confirmation, how many links it will mint — the number is the thing the brand is actually agreeing to.

For the creator: a brand list with Apply, and the status of each application.

- [ ] **Step 4: Build the creator link list**

Per link: brand, product title, rate, status via `resolveLink`, and the full URL in a `CopyField`. When the link is not active, the `StatusPill` carries the reason from the disable chain, in the creator's locale — a creator whose link has stopped working needs to know which of the four rows failed.

- [ ] **Step 5: Add every string to both catalogues**

Including the four disable reasons and the rate-change warning. `t()` throws on a missing key, so a missed string fails the build rather than shipping.

- [ ] **Step 6: Seed and prove the journey**

`scripts/seed-phase-03.ts` builds on the Phase 2 seed: Aromashop with 3 active products and 1 archived; Nino and Dato approved; a third creator pending. Expected end state: **6 tracking links** — 3 products × 2 approved creators, and none for the archived product or the pending creator.

`src/test/e2e/catalog.spec.ts`:

```ts
test("@phase-3 brand publishes a product and both creators get a link", async ({ page }) => {
  await signInAsBrand(page, "en");
  await page.goto("/en/brand/products/new");
  await page.getByLabel("SKU").fill("P-NEW");
  await page.getByLabel("Title").fill("New product");
  await page.getByLabel("Price").fill("100.00");
  await page.getByLabel("Backlink URL").fill("https://aromashop.ge/p/new");
  await page.getByRole("radio", { name: "%" }).check();
  await page.getByLabel(/commission/i).fill("10");
  await page.getByRole("button", { name: /publish/i }).click();

  await expect(page.getByText(/2 links/i)).toBeVisible();
});

test("@phase-3 archiving a product reports PRODUCT_ARCHIVED on its links", async ({ page }) => {
  await signInAsCreator(page, "ka");
  await page.goto("/ka/creator/links");
  await expect(page.getByText("პროდუქტი დაარქივებულია")).toBeVisible();
});

test("@phase-3 a creator sees a copyable link code", async ({ page }) => {
  await signInAsCreator(page, "en");
  await page.goto("/en/creator/links");
  await expect(page.getByRole("button", { name: /copy/i }).first()).toBeVisible();
});
```

- [ ] **Step 7: Wire the gate and run it**

```json
{
  "seed:phase-3": "tsx scripts/seed-phase-03.ts",
  "verify:phase-3": "pnpm verify:phase-2 && pnpm db:migrate:test && pnpm test:integration && pnpm build && pnpm seed:phase-3 && pnpm test:e2e --grep @phase-3"
}
```

```bash
pnpm verify:phase-3
```

- [ ] **Step 8: Commit**

```bash
git add app src/modules scripts package.json src/test/e2e/catalog.spec.ts
git commit -m "feat: add the catalog, partnership and link screens"
```

---

## Phase 3 completion checklist

- [ ] `pnpm verify:phase-3` passes.
- [ ] `resolveLink` reports the **first** failing row for every combination, proved by the four ordering tests.
- [ ] Approving a partnership mints exactly one link per active product; re-approving mints none.
- [ ] A creator's application lands `PENDING` and mints nothing; a brand's invitation lands `APPROVED` and mints at once; neither can produce a duplicate row.
- [ ] A brand cannot invite a creator an administrator has not approved.
- [ ] Adding a product mints exactly one link per approved creator; a pending creator gets none.
- [ ] No tracking link exists anywhere in the seeded fixture for a non-`APPROVED` partnership, checked by an integration query, not by inspection.
- [ ] A `PERCENT` rate of `12.5` is rejected by the Zod schema **and** by the database CHECK — both proved.
- [ ] Two brands can both own SKU `P-9`.
- [ ] `grep -rn "\.delete(" src/modules/catalog` returns nothing against `product`.
- [ ] Archiving a product changes `product.status` and touches no `tracking_link` row.
- [ ] The rate editor shows the stored fraction and a worked earnings example, and warns on edit about §1.2 risk 3.
- [ ] All four disable reasons render in Georgian and English on the creator's link list.
- [ ] `pnpm seed:phase-3` produces exactly 6 tracking links, and is idempotent.
