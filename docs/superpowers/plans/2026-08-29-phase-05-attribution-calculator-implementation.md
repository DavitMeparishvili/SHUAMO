# Phase 5 — Attribution Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pure function `(citedClick, candidateClicks, lineItems, products) → Attribution[]` that is exhaustively proved, performs no I/O, and is the only place in SHUAMO where a commission amount is decided.

**Architecture:** One module, `src/modules/attribution`, whose `domain/` folder contains the entire calculator and imports nothing but `Money`, `Rate`, and its own files. It is built strictly test-first: every test in this plan is written and seen to fail before the corresponding code exists. The candidate filter is applied *inside* the calculator as well as in Phase 6's SQL, so every §6.3 selection rule is a unit test rather than a query nobody can assert against.

**Tech Stack:** TypeScript only. No Prisma, no `fetch`, no `Date.now`, no `crypto` — the clock arrives as a parameter.

**Spec:** `docs/superpowers/specs/2026-08-28-shuamo-r1-design.md` §1.2 risk 4, §3.1, §6.3, §9, §10, §4.6.

## Global Constraints

Inherited from the roadmap. This phase is where they are actually load-bearing:

- **Split scope is brand-scoped**, exactly as §6.3 is written. A creator who sent the visitor shares every line of the order, including products they never promoted. The test named for this decision exists to keep it visible and reversible.
- Commission is split among **at most 3** creators. The cited click's creator never loses its slot to more recent clickers.
- **`fpHash` never enters the candidate set**, at any distance. Phase 4's containment test stays green through this phase.
- Rounding: line commission rounded to 0.01 GEL (half-up), then each share **floored** to 0.01; the remainder is handed out one tetri each in recency order, cited creator first.
- `PERCENT` is a fraction; `FIXED` is GEL per unit multiplied by `qty`.
- Money is exact decimal throughout. Assertions compare decimal strings, never floats.
- **100% branch coverage of `src/modules/attribution/domain/`**, enforced in CI.
- Each task ends in a commit.

---

## Planned file structure

```
src/modules/attribution/domain/types.ts              the input and output shapes
src/modules/attribution/domain/candidates.ts         selectCreators — §6.3 lines 1-9
src/modules/attribution/domain/candidates.test.ts
src/modules/attribution/domain/line-net.ts           commissionableNet + VAT derivation
src/modules/attribution/domain/line-net.test.ts
src/modules/attribution/domain/shares.ts             floor-and-remainder distribution
src/modules/attribution/domain/shares.test.ts
src/modules/attribution/domain/calculate.ts          the whole function
src/modules/attribution/domain/calculate.test.ts     the §10 checklist
src/modules/attribution/domain/calculate.property.test.ts
src/modules/attribution/domain/purity.test.ts        no I/O in the import graph
src/modules/attribution/index.ts
vitest.config.ts                                     coverage thresholds for this folder
```

---

### Task 1: Define the shapes

**Files:**

- Create: `src/modules/attribution/domain/types.ts`

**Interfaces:**

- Consumes: `Money`, `Rate` from `@/src/modules/shared`
- Produces — every later task and Phase 6 depend on these exact names:

```ts
import type { Money, Rate } from "@/src/modules/shared";

export const ATTRIBUTION_WINDOW_DAYS = 30;

// Nullable columns arrive from Prisma as `null` and are converted to
// `undefined` at the repository boundary in Phase 6. The domain speaks one
// absence, not two, so `visitorId === undefined` is the only check the
// calculator ever makes.

/** A click that may take a share. Carries everything §6.3 filters on. */
export interface CandidateClick {
  readonly clickId: string;
  readonly brandId: string;
  readonly creatorId: string;
  readonly visitorId: string | undefined;
  readonly creditable: boolean;
  readonly occurredAt: Date;
}

/** The click the brand echoed in `?xu=`. Seeds the visitor lookup, then goes nowhere (§4.4). */
export interface CitedClick {
  readonly clickId: string;
  readonly brandId: string;
  readonly creatorId: string;
  readonly visitorId: string | undefined;
  readonly occurredAt: Date;
}

export interface LineItemInput {
  readonly sku: string;
  readonly qty: number;
  readonly unitPrice: Money;
  readonly lineDiscount: Money;
  /** Absent means "derive it", and only if the brand is VAT-registered (§6.3). */
  readonly lineVat: Money | undefined;
}

export interface CatalogProduct {
  readonly productId: string;
  readonly sku: string;
  readonly rate: Rate;
}

export interface CalculationInput {
  readonly citedClick: CitedClick | undefined;
  readonly candidateClicks: readonly CandidateClick[];
  readonly lineItems: readonly LineItemInput[];
  readonly products: readonly CatalogProduct[];
  readonly brandId: string;
  readonly brandVatRegistered: boolean;
  readonly conversionOccurredAt: Date;
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
  readonly attributions: readonly CalculatedAttribution[];
}

export interface CalculationResult {
  readonly lines: readonly CalculatedLine[];
  /** True on the no-cookie path: single-click attribution (§9). */
  readonly splitDegraded: boolean;
}
```

- [ ] **Step 1: Write the file, then commit**

There is no test for a types file. Write it, run `pnpm typecheck`, and commit.

```bash
pnpm typecheck
git add src/modules/attribution/domain/types.ts
git commit -m "feat: define the attribution calculator's input and output shapes"
```

---

### Task 2: Select the creators

**Files:**

- Create: `src/modules/attribution/domain/candidates.ts`, `candidates.test.ts`

**Interfaces:**

- Consumes: `types.ts`
- Produces:
  - `selectCreators(input: { citedClick; candidateClicks; brandId; conversionOccurredAt }): { creatorId: string; clickId: string }[]` — ordered, cited creator first, capped at 3
  - `isWithinWindow(clickAt: Date, conversionAt: Date): boolean`

This function is §6.3's first nine lines, and it is where every filtering rule lives.

- [ ] **Step 1: Write the failing test**

`candidates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { selectCreators } from "./candidates";
import type { CandidateClick, CitedClick } from "./types";

const ORDER_AT = new Date("2026-08-12T00:00:00Z");
const VISITOR = "11111111-1111-4111-8111-111111111111";
const BRAND = "brand-1";

function click(overrides: Partial<CandidateClick> & { clickId: string }): CandidateClick {
  return {
    brandId: BRAND,
    creatorId: `creator-of-${overrides.clickId}`,
    visitorId: VISITOR,
    creditable: true,
    occurredAt: ORDER_AT,
    ...overrides,
  };
}

function cited(overrides: Partial<CitedClick> = {}): CitedClick {
  return {
    clickId: "ck_cited",
    brandId: BRAND,
    creatorId: "nino",
    visitorId: VISITOR,
    occurredAt: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

const daysBefore = (n: number) =>
  new Date(ORDER_AT.getTime() - n * 24 * 60 * 60 * 1000);

describe("selectCreators", () => {
  it("returns one creator when one clicked", () => {
    const result = selectCreators({
      citedClick: cited({ creatorId: "nino" }),
      candidateClicks: [click({ clickId: "ck_1", creatorId: "nino", occurredAt: daysBefore(1) })],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result).toEqual([{ creatorId: "nino", clickId: "ck_1" }]);
  });

  it("orders creators by their most recent candidate click, descending", () => {
    const result = selectCreators({
      citedClick: undefined,
      candidateClicks: [
        click({ clickId: "ck_old", creatorId: "nino", occurredAt: daysBefore(11) }),
        click({ clickId: "ck_new", creatorId: "dato", occurredAt: daysBefore(1) }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result.map((r) => r.creatorId)).toEqual(["dato", "nino"]);
  });

  it("represents each creator by their MOST RECENT click, not their first", () => {
    const result = selectCreators({
      citedClick: undefined,
      candidateClicks: [
        click({ clickId: "ck_early", creatorId: "nino", occurredAt: daysBefore(10) }),
        click({ clickId: "ck_late", creatorId: "nino", occurredAt: daysBefore(2) }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result).toEqual([{ creatorId: "nino", clickId: "ck_late" }]);
  });

  it("moves the cited creator to the front, ahead of more recent clickers", () => {
    const result = selectCreators({
      citedClick: cited({ creatorId: "nino" }),
      candidateClicks: [
        click({ clickId: "ck_n", creatorId: "nino", occurredAt: daysBefore(11) }),
        click({ clickId: "ck_d", creatorId: "dato", occurredAt: daysBefore(1) }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result.map((r) => r.creatorId)).toEqual(["nino", "dato"]);
  });

  it("caps at three creators", () => {
    const result = selectCreators({
      citedClick: undefined,
      candidateClicks: [
        click({ clickId: "c1", creatorId: "a", occurredAt: daysBefore(1) }),
        click({ clickId: "c2", creatorId: "b", occurredAt: daysBefore(2) }),
        click({ clickId: "c3", creatorId: "c", occurredAt: daysBefore(3) }),
        click({ clickId: "c4", creatorId: "d", occurredAt: daysBefore(4) }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result.map((r) => r.creatorId)).toEqual(["a", "b", "c"]);
  });

  it("keeps the cited creator when three others clicked more recently", () => {
    const result = selectCreators({
      citedClick: cited({ creatorId: "nino" }),
      candidateClicks: [
        click({ clickId: "c1", creatorId: "a", occurredAt: daysBefore(1) }),
        click({ clickId: "c2", creatorId: "b", occurredAt: daysBefore(2) }),
        click({ clickId: "c3", creatorId: "c", occurredAt: daysBefore(3) }),
        click({ clickId: "cn", creatorId: "nino", occurredAt: daysBefore(20) }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    // The click that carried ?xu= delivered the buyer; it never loses its slot.
    expect(result.map((r) => r.creatorId)).toEqual(["nino", "a", "b"]);
  });

  it("excludes clicks belonging to another brand — cross-brand SKU safety", () => {
    const result = selectCreators({
      citedClick: undefined,
      candidateClicks: [
        click({ clickId: "mine", creatorId: "nino", occurredAt: daysBefore(1) }),
        click({ clickId: "theirs", creatorId: "other", brandId: "brand-2", occurredAt: daysBefore(1) }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result.map((r) => r.creatorId)).toEqual(["nino"]);
  });

  it("excludes clicks from a different visitor", () => {
    const result = selectCreators({
      citedClick: cited(),
      candidateClicks: [
        click({ clickId: "ours", creatorId: "nino", occurredAt: daysBefore(1) }),
        click({
          clickId: "stranger",
          creatorId: "dato",
          visitorId: "22222222-2222-4222-8222-222222222222",
          occurredAt: daysBefore(1),
        }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result.map((r) => r.creatorId)).toEqual(["nino"]);
  });

  it("excludes non-creditable clicks from candidacy", () => {
    const result = selectCreators({
      citedClick: undefined,
      candidateClicks: [
        click({ clickId: "dup", creatorId: "dato", creditable: false, occurredAt: daysBefore(1) }),
        click({ clickId: "ok", creatorId: "nino", occurredAt: daysBefore(2) }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result.map((r) => r.creatorId)).toEqual(["nino"]);
  });

  it("excludes a click 30 days and one second before the order", () => {
    const result = selectCreators({
      citedClick: undefined,
      candidateClicks: [
        click({
          clickId: "expired",
          creatorId: "nino",
          occurredAt: new Date(ORDER_AT.getTime() - (30 * 86_400_000 + 1000)),
        }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result).toEqual([]);
  });

  it("includes a click exactly 30 days before the order", () => {
    const result = selectCreators({
      citedClick: undefined,
      candidateClicks: [
        click({
          clickId: "boundary",
          creatorId: "nino",
          occurredAt: new Date(ORDER_AT.getTime() - 30 * 86_400_000),
        }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result.map((r) => r.clickId)).toEqual(["boundary"]);
  });

  it("excludes a click after the order", () => {
    const result = selectCreators({
      citedClick: undefined,
      candidateClicks: [
        click({ clickId: "future", creatorId: "nino", occurredAt: new Date(ORDER_AT.getTime() + 1000) }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result).toEqual([]);
  });

  it("keeps the cited creator's slot even when their own click was deduplicated", () => {
    // §6.2 step 4: a non-creditable cited click loses its own candidacy, not
    // its visitor. But if it is the only click that creator has, the cited
    // creator still takes a slot, represented by the cited click itself.
    const result = selectCreators({
      citedClick: cited({ creatorId: "nino", clickId: "ck_cited" }),
      candidateClicks: [
        click({ clickId: "ck_cited", creatorId: "nino", creditable: false, occurredAt: daysBefore(1) }),
        click({ clickId: "ck_d", creatorId: "dato", occurredAt: daysBefore(2) }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(result).toEqual([
      { creatorId: "nino", clickId: "ck_cited" },
      { creatorId: "dato", clickId: "ck_d" },
    ]);
  });

  it("returns nothing when there is no cited click and no candidate", () => {
    expect(
      selectCreators({
        citedClick: undefined,
        candidateClicks: [],
        brandId: BRAND,
        conversionOccurredAt: ORDER_AT,
      }),
    ).toEqual([]);
  });

  it("breaks a tie between two equally recent clicks deterministically", () => {
    const at = daysBefore(3);
    const first = selectCreators({
      citedClick: undefined,
      candidateClicks: [
        click({ clickId: "cb", creatorId: "b", occurredAt: at }),
        click({ clickId: "ca", creatorId: "a", occurredAt: at }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });
    const second = selectCreators({
      citedClick: undefined,
      candidateClicks: [
        click({ clickId: "ca", creatorId: "a", occurredAt: at }),
        click({ clickId: "cb", creatorId: "b", occurredAt: at }),
      ],
      brandId: BRAND,
      conversionOccurredAt: ORDER_AT,
    });

    expect(first).toEqual(second);
  });
});
```

The tie-break test matters more than it looks: without a deterministic secondary sort, two clicks at the same millisecond make the remainder tetri land on whichever creator the database happened to return first, and the same order recalculated would pay someone else.

- [ ] **Step 2: Run and confirm every test fails**

```bash
pnpm vitest run src/modules/attribution/domain/candidates.test.ts
```

Expected: FAIL — module not found, 15 tests.

- [ ] **Step 3: Implement**

```ts
import {
  ATTRIBUTION_WINDOW_DAYS,
  type CandidateClick,
  type CitedClick,
} from "./types";

const WINDOW_MS = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function isWithinWindow(clickAt: Date, conversionAt: Date): boolean {
  const age = conversionAt.getTime() - clickAt.getTime();
  return age >= 0 && age <= WINDOW_MS;
}

export function selectCreators(input: {
  citedClick: CitedClick | undefined;
  candidateClicks: readonly CandidateClick[];
  brandId: string;
  conversionOccurredAt: Date;
}): { creatorId: string; clickId: string }[] {
  const visitorId = input.citedClick?.visitorId;

  const eligible = input.candidateClicks.filter(
    (click) =>
      click.brandId === input.brandId &&
      click.creditable &&
      click.visitorId !== undefined &&
      click.visitorId === visitorId &&
      isWithinWindow(click.occurredAt, input.conversionOccurredAt),
  );

  // Each creator represented by their most recent eligible click.
  const byCreator = new Map<string, CandidateClick>();
  for (const click of eligible) {
    const held = byCreator.get(click.creatorId);
    if (held === undefined || click.occurredAt > held.occurredAt) {
      byCreator.set(click.creatorId, click);
    }
  }

  // The cited creator holds a slot even if their own click was deduplicated.
  const cited = input.citedClick;
  if (cited !== undefined && !byCreator.has(cited.creatorId)) {
    byCreator.set(cited.creatorId, {
      clickId: cited.clickId,
      brandId: cited.brandId,
      creatorId: cited.creatorId,
      visitorId: cited.visitorId,
      creditable: false,
      occurredAt: cited.occurredAt,
    });
  }

  const ordered = [...byCreator.values()].sort((a, b) => {
    const byRecency = b.occurredAt.getTime() - a.occurredAt.getTime();
    // Deterministic tie-break: without it, equal timestamps make the
    // remainder tetri land on whichever row the database returned first.
    return byRecency !== 0 ? byRecency : a.creatorId.localeCompare(b.creatorId);
  });

  if (cited !== undefined) {
    const index = ordered.findIndex((click) => click.creatorId === cited.creatorId);
    if (index > 0) {
      const [promoted] = ordered.splice(index, 1);
      if (promoted !== undefined) ordered.unshift(promoted);
    }
  }

  return ordered
    .slice(0, 3)
    .map((click) => ({ creatorId: click.creatorId, clickId: click.clickId }));
}
```

- [ ] **Step 4: Run and commit**

```bash
pnpm vitest run src/modules/attribution/domain/candidates.test.ts
git add src/modules/attribution/domain
git commit -m "feat: select and order the creators eligible for a share"
```

---

### Task 3: Compute the commissionable net

**Files:**

- Create: `src/modules/attribution/domain/line-net.ts`, `line-net.test.ts`

**Interfaces:**

- Consumes: `Money`
- Produces: `commissionableNet(input: { unitPrice: Money; qty: number; lineDiscount: Money; lineVat: Money | undefined; brandVatRegistered: boolean }): Money` — always rounded to the tetri, never negative

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { Money } from "@/src/modules/shared";
import { commissionableNet } from "./line-net";

const base = {
  unitPrice: Money.of("250.00"),
  qty: 1,
  lineDiscount: Money.of("0.00"),
  lineVat: Money.of("0.00"),
  brandVatRegistered: false,
};

describe("commissionableNet", () => {
  it("is line total less discount less VAT", () => {
    expect(
      commissionableNet({
        ...base,
        lineDiscount: Money.of("25.00"),
        lineVat: Money.of("34.32"),
      }).toStorageString(),
    ).toBe("190.68");
  });

  it("multiplies by the quantity", () => {
    expect(
      commissionableNet({ ...base, unitPrice: Money.of("100.00"), qty: 3 }).toStorageString(),
    ).toBe("300.00");
  });

  it("derives VAT at 18% when the brand is registered and lineVat is absent", () => {
    // (250 - 25) / 1.18 = 190.6779… -> 190.68
    expect(
      commissionableNet({
        ...base,
        lineDiscount: Money.of("25.00"),
        lineVat: undefined,
        brandVatRegistered: true,
      }).toStorageString(),
    ).toBe("190.68");
  });

  it("derives VAT for the laptop line in the §6.3 worked example", () => {
    // 2000 / 1.18 = 1694.9152… -> 1694.92
    expect(
      commissionableNet({
        unitPrice: Money.of("2000.00"),
        qty: 1,
        lineDiscount: Money.of("0.00"),
        lineVat: undefined,
        brandVatRegistered: true,
      }).toStorageString(),
    ).toBe("1694.92");
  });

  it("treats the line total as the net when the brand is not VAT-registered and lineVat is absent", () => {
    expect(
      commissionableNet({
        ...base,
        lineVat: undefined,
        brandVatRegistered: false,
      }).toStorageString(),
    ).toBe("250.00");
  });

  it("prefers a supplied lineVat over derivation, even for a registered brand", () => {
    expect(
      commissionableNet({
        ...base,
        lineVat: Money.of("10.00"),
        brandVatRegistered: true,
      }).toStorageString(),
    ).toBe("240.00");
  });

  it("clamps a negative net to zero rather than storing a negative", () => {
    // commissionable_net has CHECK (>= 0); a discount exceeding the line
    // total is a brand data error, not a reason to reject the whole order.
    expect(
      commissionableNet({
        ...base,
        lineDiscount: Money.of("300.00"),
      }).toStorageString(),
    ).toBe("0.00");
  });

  it("returns zero when the line total is zero", () => {
    expect(
      commissionableNet({ ...base, unitPrice: Money.of("0.00") }).toStorageString(),
    ).toBe("0.00");
  });

  it("rounds the net to the tetri before it is used or stored", () => {
    const net = commissionableNet({
      unitPrice: Money.of("100.00"),
      qty: 1,
      lineDiscount: Money.of("0.00"),
      lineVat: undefined,
      brandVatRegistered: true,
    });
    // 100 / 1.18 = 84.7457… -> 84.75
    expect(net.toStorageString()).toBe("84.75");
  });
});
```

The clamp-to-zero decision resolves an ambiguity: §6.3 says "if net <= 0: commission = 0", and Appendix A.4 has `CHECK (commissionable_net >= 0)`. Storing a negative would violate the constraint and rejecting the order would lose a real sale, so the net is clamped and the commission is zero. Record this in the code comment, not only here.

- [ ] **Step 2: Run, confirm failure, implement**

```ts
import { Money } from "@/src/modules/shared";

const VAT_DIVISOR = "1.18";

export function commissionableNet(input: {
  unitPrice: Money;
  qty: number;
  lineDiscount: Money;
  lineVat: Money | undefined;
  brandVatRegistered: boolean;
}): Money {
  const lineTotal = input.unitPrice.times(input.qty).minus(input.lineDiscount);

  if (lineTotal.isNegative() || lineTotal.isZero()) return Money.ZERO;

  const net =
    input.lineVat !== undefined
      ? lineTotal.minus(input.lineVat)
      : input.brandVatRegistered
        ? lineTotal.dividedByDecimal(VAT_DIVISOR)
        : lineTotal;

  // Appendix A.4 has CHECK (commissionable_net >= 0). A discount exceeding
  // the line total is a brand data error; clamping keeps the order recordable
  // and §6.3 pays it nothing, which is the right outcome either way.
  return net.isNegative() ? Money.ZERO : net.roundToTetri();
}
```

`dividedByDecimal(divisor: string)` is a small addition to `Money` in Phase 0's file — add it with its own test in `money.test.ts` in the same commit.

- [ ] **Step 3: Run and commit**

```bash
pnpm vitest run src/modules/attribution/domain src/modules/shared
git add src/modules
git commit -m "feat: compute the commissionable net with VAT derivation"
```

---

### Task 4: Distribute the shares

**Files:**

- Create: `src/modules/attribution/domain/shares.ts`, `shares.test.ts`

**Interfaces:**

- Consumes: `Money`
- Produces: `distributeShares(commission: Money, recipients: number): Money[]` — in recency order, cited first; sums exactly to `commission`

- [ ] **Step 1: Write the failing test**

Every worked example from §6.3, plus the properties:

```ts
import { describe, expect, it } from "vitest";
import { Money } from "@/src/modules/shared";
import { distributeShares } from "./shares";

const asStrings = (shares: Money[]) => shares.map((s) => s.toStorageString());

describe("distributeShares", () => {
  it("gives the whole commission to a single recipient", () => {
    expect(asStrings(distributeShares(Money.of("22.88"), 1))).toEqual(["22.88"]);
  });

  it("splits evenly when it divides", () => {
    expect(asStrings(distributeShares(Money.of("22.88"), 2))).toEqual(["11.44", "11.44"]);
  });

  it("hands the odd tetri to the first recipient — §6.3 laptop line", () => {
    expect(asStrings(distributeShares(Money.of("50.85"), 2))).toEqual(["25.43", "25.42"]);
  });

  it("handles 10.00 across three", () => {
    expect(asStrings(distributeShares(Money.of("10.00"), 3))).toEqual([
      "3.34",
      "3.33",
      "3.33",
    ]);
  });

  it("handles 0.05 across three without inverting recency order", () => {
    expect(asStrings(distributeShares(Money.of("0.05"), 3))).toEqual([
      "0.02",
      "0.02",
      "0.01",
    ]);
  });

  it("gives a zero commission to everyone as zero", () => {
    expect(asStrings(distributeShares(Money.of("0.00"), 3))).toEqual([
      "0.00",
      "0.00",
      "0.00",
    ]);
  });

  it("handles a commission smaller than the number of recipients", () => {
    expect(asStrings(distributeShares(Money.of("0.02"), 3))).toEqual([
      "0.01",
      "0.01",
      "0.00",
    ]);
  });

  it("never gives a later recipient more than an earlier one", () => {
    for (const amount of ["0.01", "0.05", "10.00", "22.88", "50.85", "999.99"]) {
      for (const n of [1, 2, 3]) {
        const shares = distributeShares(Money.of(amount), n);
        for (let i = 1; i < shares.length; i += 1) {
          expect(shares[i]!.compare(shares[i - 1]!)).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it("sums exactly to the commission", () => {
    for (const amount of ["0.01", "0.05", "10.00", "22.88", "50.85", "1694.92"]) {
      for (const n of [1, 2, 3]) {
        const total = distributeShares(Money.of(amount), n).reduce(
          (sum, share) => sum.plus(share),
          Money.ZERO,
        );
        expect(total.toStorageString()).toBe(Money.of(amount).toStorageString());
      }
    }
  });

  it("throws rather than guessing for zero recipients", () => {
    expect(() => distributeShares(Money.of("10.00"), 0)).toThrowError();
  });
});
```

- [ ] **Step 2: Run, confirm failure, implement**

```ts
import { Money } from "@/src/modules/shared";

const TETRI = Money.of("0.01");

/**
 * Floors each share rather than rounding, then hands the remaining tetri out
 * one each in order. Rounding half-up would make the remainder negative for
 * the 0.05-across-3 case and pay the most recent clicker LESS than the
 * others, which inverts the whole ordering the split is built on (§6.3).
 */
export function distributeShares(commission: Money, recipients: number): Money[] {
  if (!Number.isInteger(recipients) || recipients < 1) {
    throw new RangeError(`distributeShares needs at least one recipient, got ${recipients}`);
  }

  const share = commission.dividedByInteger(recipients).floorToTetri();
  const distributed = share.times(recipients);
  const remainderTetri = Number(
    commission.minus(distributed).dividedByDecimal("0.01").toString(),
  );

  return Array.from({ length: recipients }, (_, index) =>
    index < remainderTetri ? share.plus(TETRI) : share,
  );
}
```

- [ ] **Step 3: Run and commit**

```bash
pnpm vitest run src/modules/attribution/domain/shares.test.ts
git add src/modules/attribution/domain
git commit -m "feat: distribute commission shares by flooring and handing out the remainder"
```

---

### Task 5: Assemble the calculator

**Files:**

- Create: `src/modules/attribution/domain/calculate.ts`, `calculate.test.ts`
- Create: `src/modules/attribution/index.ts`

**Interfaces:**

- Consumes: everything above
- Produces: `calculateAttributions(input: CalculationInput): CalculationResult`

- [ ] **Step 1: Write the failing test — the §10 checklist**

`calculate.test.ts`. This is the phase's centrepiece; every test is named for the row of §10 it discharges:

```ts
import { describe, expect, it } from "vitest";
import { Money, Rate } from "@/src/modules/shared";
import { calculateAttributions } from "./calculate";

const ORDER_AT = new Date("2026-08-12T00:00:00Z");
const VISITOR = "11111111-1111-4111-8111-111111111111";
const BRAND = "brand-1";
const daysBefore = (n: number) => new Date(ORDER_AT.getTime() - n * 86_400_000);

const perfume = {
  productId: "p-perfume",
  sku: "P-9",
  rate: Rate.percent("0.12"),
};
const laptop = { productId: "p-laptop", sku: "L-4", rate: Rate.percent("0.03") };

const ninoClick = {
  clickId: "ck_nino",
  brandId: BRAND,
  creatorId: "nino",
  visitorId: VISITOR,
  creditable: true,
  occurredAt: daysBefore(11),
};
const datoClick = { ...ninoClick, clickId: "ck_dato", creatorId: "dato", occurredAt: daysBefore(1) };

const cart = [
  {
    sku: "P-9",
    qty: 1,
    unitPrice: Money.of("250.00"),
    lineDiscount: Money.of("25.00"),
    lineVat: undefined,
  },
  {
    sku: "L-4",
    qty: 1,
    unitPrice: Money.of("2000.00"),
    lineDiscount: Money.of("0.00"),
    lineVat: undefined,
  },
];

function calculate(overrides = {}) {
  return calculateAttributions({
    citedClick: { ...datoClick, visitorId: VISITOR },
    candidateClicks: [ninoClick, datoClick],
    lineItems: cart,
    products: [perfume, laptop],
    brandId: BRAND,
    brandVatRegistered: true,
    conversionOccurredAt: ORDER_AT,
    ...overrides,
  });
}

const amountsFor = (result: ReturnType<typeof calculate>, sku: string) =>
  Object.fromEntries(
    result.lines
      .find((line) => line.sku === sku)!
      .attributions.map((a) => [a.creatorId, a.amount.toStorageString()]),
  );

describe("calculateAttributions — the §6.3 worked example", () => {
  it("pays the perfume line 11.44 each", () => {
    const result = calculate();
    expect(result.lines[0]?.commissionableNet.toStorageString()).toBe("190.68");
    expect(result.lines[0]?.commission.toStorageString()).toBe("22.88");
    expect(amountsFor(result, "P-9")).toEqual({ dato: "11.44", nino: "11.44" });
  });

  it("pays the laptop line 25.43 and 25.42", () => {
    const result = calculate();
    expect(result.lines[1]?.commissionableNet.toStorageString()).toBe("1694.92");
    expect(result.lines[1]?.commission.toStorageString()).toBe("50.85");
    expect(amountsFor(result, "L-4")).toEqual({ dato: "25.43", nino: "25.42" });
  });

  it("computes the creator set once per conversion, not once per line", () => {
    const result = calculate();
    const perLine = result.lines.map((line) =>
      line.attributions.map((a) => a.creatorId).sort(),
    );
    expect(perLine[0]).toEqual(perLine[1]);
  });
});

describe("calculateAttributions — §10 checklist", () => {
  it("splits across 1, 2 and 3 creators", () => {
    for (const [clicks, expected] of [
      [[datoClick], 1],
      [[ninoClick, datoClick], 2],
      [[ninoClick, datoClick, { ...ninoClick, clickId: "ck_a", creatorId: "ana", occurredAt: daysBefore(3) }], 3],
    ] as const) {
      const result = calculate({ candidateClicks: clicks });
      expect(result.lines[0]?.attributions).toHaveLength(expected);
    }
  });

  it("caps at three and keeps the cited creator", () => {
    const recent = ["a", "b", "c"].map((id, i) => ({
      ...ninoClick,
      clickId: `ck_${id}`,
      creatorId: id,
      occurredAt: daysBefore(i + 1),
    }));

    const result = calculate({
      citedClick: { ...ninoClick, visitorId: VISITOR },
      candidateClicks: [...recent, ninoClick],
    });

    const paid = result.lines[0]!.attributions.map((a) => a.creatorId);
    expect(paid).toHaveLength(3);
    expect(paid[0]).toBe("nino");
  });

  it("does not attribute a cross-brand SKU collision", () => {
    const otherBrandClick = { ...ninoClick, clickId: "ck_x", brandId: "brand-2", creatorId: "stranger" };
    const result = calculate({ candidateClicks: [datoClick, otherBrandClick] });

    expect(result.lines[0]?.attributions.map((a) => a.creatorId)).toEqual(["dato"]);
  });

  it("SPLITS BRAND-WIDE: nino, who promoted only the perfume, still shares the laptop", () => {
    // This is §1.2 risk 4 and the §13.1 decision, made visible.
    // Recorded decision: brand-scoped. If this test is ever changed to
    // product scope, that is a product decision, not a refactor.
    const result = calculate();
    expect(amountsFor(result, "L-4")).toHaveProperty("nino", "25.42");
  });

  it("earns nothing on a line whose SKU is not in the catalogue, but records the line", () => {
    const result = calculate({
      lineItems: [{ sku: "UNKNOWN", qty: 1, unitPrice: Money.of("100.00"), lineDiscount: Money.of("0.00"), lineVat: Money.of("0.00") }],
      products: [perfume],
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.commission.toStorageString()).toBe("0.00");
    expect(result.lines[0]?.attributions).toEqual([]);
    expect(result.lines[0]?.commissionableNet.toStorageString()).toBe("100.00");
  });

  it("earns nothing on a zero or negative net, but records the line", () => {
    const result = calculate({
      lineItems: [{ sku: "P-9", qty: 1, unitPrice: Money.of("100.00"), lineDiscount: Money.of("150.00"), lineVat: Money.of("0.00") }],
      products: [perfume],
    });

    expect(result.lines[0]?.commissionableNet.toStorageString()).toBe("0.00");
    expect(result.lines[0]?.commission.toStorageString()).toBe("0.00");
    expect(result.lines[0]?.attributions).toEqual([]);
  });

  it("multiplies a FIXED rate by the quantity", () => {
    const result = calculate({
      lineItems: [{ sku: "P-9", qty: 4, unitPrice: Money.of("50.00"), lineDiscount: Money.of("0.00"), lineVat: Money.of("0.00") }],
      products: [{ ...perfume, rate: Rate.fixed("5.00") }],
      candidateClicks: [datoClick],
    });

    expect(result.lines[0]?.commission.toStorageString()).toBe("20.00");
  });

  it("excludes expired and non-creditable clicks", () => {
    const expired = { ...ninoClick, clickId: "ck_old", occurredAt: new Date(ORDER_AT.getTime() - 31 * 86_400_000) };
    const deduped = { ...ninoClick, clickId: "ck_dup", creatorId: "ana", creditable: false };

    const result = calculate({ candidateClicks: [datoClick, expired, deduped] });
    expect(result.lines[0]?.attributions.map((a) => a.creatorId)).toEqual(["dato"]);
  });

  it("degrades to single-click attribution with no cookie", () => {
    const result = calculate({
      citedClick: { ...datoClick, visitorId: undefined },
      candidateClicks: [ninoClick, datoClick],
    });

    expect(result.splitDegraded).toBe(true);
    expect(result.lines[0]?.attributions).toHaveLength(1);
    expect(result.lines[0]?.attributions[0]?.creatorId).toBe("dato");
    expect(result.lines[0]?.attributions[0]?.amount.toStorageString()).toBe("22.88");
  });

  it("is not degraded when a cookie was present", () => {
    expect(calculate().splitDegraded).toBe(false);
  });

  it("returns no attributions and no degradation when there is no cited click", () => {
    const result = calculate({ citedClick: undefined, candidateClicks: [] });
    expect(result.lines.every((line) => line.attributions.length === 0)).toBe(true);
  });

  it("records the product id that produced each amount", () => {
    const result = calculate();
    expect(result.lines[0]?.attributions.every((a) => a.productId === "p-perfume")).toBe(true);
    expect(result.lines[1]?.attributions.every((a) => a.productId === "p-laptop")).toBe(true);
  });

  it("records the earning creator's own click, not the cited one", () => {
    const result = calculate();
    const nino = result.lines[0]?.attributions.find((a) => a.creatorId === "nino");
    expect(nino?.clickId).toBe("ck_nino");
  });

  it("emits at most one attribution per creator per line", () => {
    const twoNinoClicks = [ninoClick, { ...ninoClick, clickId: "ck_nino2", occurredAt: daysBefore(2) }];
    const result = calculate({ candidateClicks: twoNinoClicks });

    expect(result.lines[0]?.attributions).toHaveLength(1);
  });

  it("sums each line's attributions to that line's commission exactly — §4.6", () => {
    const result = calculate();
    for (const line of result.lines) {
      const total = line.attributions.reduce((sum, a) => sum.plus(a.amount), Money.ZERO);
      if (line.attributions.length === 0) continue;
      expect(total.toStorageString()).toBe(line.commission.toStorageString());
    }
  });

  it("handles an empty cart", () => {
    expect(calculate({ lineItems: [] }).lines).toEqual([]);
  });
});
```

- [ ] **Step 2: Run and confirm the whole file fails**

```bash
pnpm vitest run src/modules/attribution/domain/calculate.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { Money } from "@/src/modules/shared";
import { selectCreators } from "./candidates";
import { commissionableNet } from "./line-net";
import { distributeShares } from "./shares";
import type { CalculationInput, CalculationResult, CalculatedLine } from "./types";

export function calculateAttributions(input: CalculationInput): CalculationResult {
  const splitDegraded =
    input.citedClick !== undefined && input.citedClick.visitorId === undefined;

  // The no-cookie path is single-click attribution (§9): the cited click
  // alone, because without a visitor id there is nothing to look candidates
  // up by, and fpHash must never be used for identity (§6.3).
  const creators = splitDegraded
    ? [{ creatorId: input.citedClick!.creatorId, clickId: input.citedClick!.clickId }]
    : selectCreators({
        citedClick: input.citedClick,
        candidateClicks: input.candidateClicks,
        brandId: input.brandId,
        conversionOccurredAt: input.conversionOccurredAt,
      });

  const bySku = new Map(input.products.map((product) => [product.sku, product]));

  const lines: CalculatedLine[] = input.lineItems.map((item) => {
    const net = commissionableNet({
      unitPrice: item.unitPrice,
      qty: item.qty,
      lineDiscount: item.lineDiscount,
      lineVat: item.lineVat,
      brandVatRegistered: input.brandVatRegistered,
    });

    const product = bySku.get(item.sku);

    if (product === undefined || net.isZero() || creators.length === 0) {
      return {
        sku: item.sku,
        commissionableNet: net,
        commission: Money.ZERO,
        attributions: [],
      };
    }

    const commission = product.rate.commissionFor(net, item.qty).roundToTetri();
    const shares = distributeShares(commission, creators.length);

    return {
      sku: item.sku,
      commissionableNet: net,
      commission,
      attributions: creators.map((creator, index) => ({
        creatorId: creator.creatorId,
        clickId: creator.clickId,
        productId: product.productId,
        amount: shares[index]!,
      })),
    };
  });

  return { lines, splitDegraded };
}
```

- [ ] **Step 4: Run every test**

```bash
pnpm vitest run src/modules/attribution
```

Expected: PASS. If the two worked-example tests disagree with the spec by a single tetri, **fix the code, never the expectation** — those numbers are in §6.3 and are the contract.

- [ ] **Step 5: Export the public surface and commit**

`src/modules/attribution/index.ts` re-exports `calculateAttributions`, the types, and `ATTRIBUTION_WINDOW_DAYS`. Nothing else — Phase 6 needs exactly that.

```bash
git add src/modules/attribution
git commit -m "feat: assemble the attribution calculator"
```

---

### Task 6: Prove the properties and the purity

**Files:**

- Create: `src/modules/attribution/domain/calculate.property.test.ts`
- Create: `src/modules/attribution/domain/purity.test.ts`
- Modify: `vitest.config.ts`, `package.json`

**Interfaces:**

- Consumes: the finished calculator
- Produces: `verify:phase-5`, and a coverage gate on `src/modules/attribution/domain/`

- [ ] **Step 1: Write the property tests**

Examples prove the cases someone thought of. These prove the ones nobody did:

```ts
import { describe, expect, it } from "vitest";
import { Money, Rate } from "@/src/modules/shared";
import { calculateAttributions } from "./calculate";
import { distributeShares } from "./shares";

// A tiny deterministic PRNG — a seeded generator makes a failure
// reproducible, which Math.random does not.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("share distribution properties", () => {
  it("sums exactly to the commission for random amounts and 1..3 recipients", () => {
    const random = mulberry32(20260829);

    for (let i = 0; i < 5000; i += 1) {
      const tetri = Math.floor(random() * 10_000_000);
      const commission = Money.of(`${Math.floor(tetri / 100)}.${String(tetri % 100).padStart(2, "0")}`);
      const n = 1 + Math.floor(random() * 3);

      const shares = distributeShares(commission, n);
      const total = shares.reduce((sum, share) => sum.plus(share), Money.ZERO);

      expect(total.toStorageString()).toBe(commission.toStorageString());
    }
  });

  it("never orders shares increasing by recency for random amounts", () => {
    const random = mulberry32(4711);

    for (let i = 0; i < 5000; i += 1) {
      const tetri = Math.floor(random() * 10_000_000);
      const commission = Money.of(`${Math.floor(tetri / 100)}.${String(tetri % 100).padStart(2, "0")}`);
      const shares = distributeShares(commission, 1 + Math.floor(random() * 3));

      for (let j = 1; j < shares.length; j += 1) {
        expect(shares[j]!.compare(shares[j - 1]!)).toBeLessThanOrEqual(0);
      }
    }
  });
});

describe("calculator properties", () => {
  it("every line's attributions sum to that line's commission, for random carts", () => {
    const random = mulberry32(99);

    for (let run = 0; run < 1000; run += 1) {
      const creatorCount = 1 + Math.floor(random() * 4);
      const clicks = Array.from({ length: creatorCount }, (_, i) => ({
        clickId: `ck_${i}`,
        brandId: "b",
        creatorId: `creator-${i}`,
        visitorId: "v",
        creditable: true,
        occurredAt: new Date(Date.UTC(2026, 7, 1 + i)),
      }));

      const result = calculateAttributions({
        citedClick: { ...clicks[0]!, occurredAt: clicks[0]!.occurredAt },
        candidateClicks: clicks,
        lineItems: Array.from({ length: 1 + Math.floor(random() * 4) }, () => ({
          sku: "S",
          qty: 1 + Math.floor(random() * 5),
          unitPrice: Money.of(`${Math.floor(random() * 5000)}.${String(Math.floor(random() * 100)).padStart(2, "0")}`),
          lineDiscount: Money.of("0.00"),
          lineVat: Money.of("0.00"),
        })),
        products: [{ productId: "p", sku: "S", rate: Rate.percent(`0.${String(Math.floor(random() * 100)).padStart(2, "0")}`) }],
        brandId: "b",
        brandVatRegistered: false,
        conversionOccurredAt: new Date(Date.UTC(2026, 7, 20)),
      });

      for (const line of result.lines) {
        if (line.attributions.length === 0) continue;

        const total = line.attributions.reduce((sum, a) => sum.plus(a.amount), Money.ZERO);
        expect(total.toStorageString()).toBe(line.commission.toStorageString());
        expect(line.attributions.length).toBeLessThanOrEqual(3);

        const creators = line.attributions.map((a) => a.creatorId);
        expect(new Set(creators).size).toBe(creators.length);
      }
    }
  });

  it("never produces a negative amount", () => {
    const random = mulberry32(1234);

    for (let run = 0; run < 1000; run += 1) {
      const result = calculateAttributions({
        citedClick: { clickId: "c", brandId: "b", creatorId: "x", visitorId: "v", occurredAt: new Date(Date.UTC(2026, 7, 1)) },
        candidateClicks: [{ clickId: "c", brandId: "b", creatorId: "x", visitorId: "v", creditable: true, occurredAt: new Date(Date.UTC(2026, 7, 1)) }],
        lineItems: [{
          sku: "S",
          qty: 1,
          unitPrice: Money.of(`${Math.floor(random() * 1000)}.00`),
          lineDiscount: Money.of(`${Math.floor(random() * 2000)}.00`),
          lineVat: Money.of("0.00"),
        }],
        products: [{ productId: "p", sku: "S", rate: Rate.percent("0.10") }],
        brandId: "b",
        brandVatRegistered: false,
        conversionOccurredAt: new Date(Date.UTC(2026, 7, 20)),
      });

      for (const line of result.lines) {
        expect(line.commissionableNet.isNegative()).toBe(false);
        expect(line.commission.isNegative()).toBe(false);
        for (const attribution of line.attributions) {
          expect(attribution.amount.isNegative()).toBe(false);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Write the purity test**

```ts
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FORBIDDEN = [
  { pattern: /@prisma\//, why: "the calculator performs no I/O" },
  { pattern: /\bfetch\s*\(/, why: "the calculator performs no I/O" },
  { pattern: /Date\.now\s*\(/, why: "the clock arrives as a parameter" },
  { pattern: /new Date\s*\(\s*\)/, why: "the clock arrives as a parameter" },
  { pattern: /from "node:crypto"/, why: "the calculator needs no randomness" },
  { pattern: /Math\.random/, why: "the calculator is deterministic" },
];

describe("attribution domain purity", () => {
  const files = globSync("src/modules/attribution/domain/*.ts").filter(
    (file) => !file.includes(".test."),
  );

  it.each(FORBIDDEN)("contains no $pattern — $why", ({ pattern }) => {
    const offenders = files.filter((file) => pattern.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("mentions fpHash nowhere — §6.3, at any distance", () => {
    const offenders = globSync("src/modules/attribution/**/*.ts").filter((file) =>
      /fp_?[Hh]ash/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 3: Gate the coverage**

`vitest.config.ts`:

```ts
test: {
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
}
```

```json
{
  "test:coverage": "vitest run --config vitest.config.ts --coverage",
  "verify:phase-5": "pnpm verify:phase-4 && pnpm test:coverage"
}
```

- [ ] **Step 4: Run it and close the gaps**

```bash
pnpm verify:phase-5
```

If a branch is uncovered, **write the test for the case it represents** rather than deleting the branch. An unreachable branch in this module is either a missing test or dead code, and both are worth finding out about here rather than in production.

- [ ] **Step 5: Commit**

```bash
git add src/modules/attribution vitest.config.ts package.json
git commit -m "test: prove the calculator's properties, purity, and full branch coverage"
```

---

## Phase 5 completion checklist

- [ ] `pnpm verify:phase-5` passes, including 100% branch coverage of `src/modules/attribution/domain/`.
- [ ] Both §6.3 worked-example lines produce exactly `11.44 / 11.44` and `25.43 / 25.42`.
- [ ] `10.00` across three pays `3.34 / 3.33 / 3.33`; `0.05` across three pays `0.02 / 0.02 / 0.01`.
- [ ] The cited creator keeps their slot when three others clicked more recently.
- [ ] A SKU shared by two brands attributes only to the conversion's brand.
- [ ] The brand-scoped split test exists, is named for the §13.1 decision, and asserts that a creator who promoted only product A shares product B.
- [ ] Expired, non-creditable, wrong-visitor and wrong-brand clicks are each excluded, by a separate test.
- [ ] The no-cookie path pays the cited click alone and sets `splitDegraded`.
- [ ] A line whose SKU is not in the catalogue is recorded with a net and a zero commission.
- [ ] A negative net is clamped to zero and earns nothing.
- [ ] Property tests over 5000 randomised distributions confirm exact conservation and non-increasing shares.
- [ ] The purity test finds no Prisma, `fetch`, `Date.now`, `new Date()`, `node:crypto`, or `Math.random` in the domain folder.
- [ ] `fpHash` appears nowhere in `src/modules/attribution`.
- [ ] Every money assertion in this phase compares a decimal string. `grep -rn "toBeCloseTo" src/modules/attribution` returns nothing.
