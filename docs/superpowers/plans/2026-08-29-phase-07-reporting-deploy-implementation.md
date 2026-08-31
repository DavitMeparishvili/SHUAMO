# Phase 7 — Reporting, CSV, Worker & Production Deploy Implementation Plan · **R1 / MVP**

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything SHUAMO measures is visible to the people it belongs to, exportable as the settlement handoff, and running on a VPS. This phase completes the MVP as §12 defines it.

**Architecture:** Reporting is read-only over what Phases 4–6 already store: no new money is computed here, and no counter is cached. The worker becomes a real service — a scheduler, not a queue consumer — carrying monthly CSV generation and click retention. Deployment is four Compose services behind Caddy on one certificate.

**Tech Stack:** Prisma raw SQL for the counter queries · `Intl.DateTimeFormat` with `Asia/Tbilisi` for period bucketing · Docker Compose · Caddy · `pg_dump`.

**Spec:** `docs/superpowers/specs/2026-08-28-shuamo-r1-design.md` §7.1–7.4, §9, §10, §11, §12, §13, Appendix A.5.

## Global Constraints

Inherited from the roadmap. The ones this phase exercises:

- Billing and CSV buckets are computed in **Asia/Tbilisi**, from `confirmed_at` — never from `occurred_at`, because order dates are brand-supplied and a brand may confirm months late (§7.4).
- Only `CONFIRMED` conversions appear on a CSV.
- A cancellation landing after its month's CSV was issued is carried onto the next CSV as a **negative line** (§7.1).
- Every forward-looking figure is labelled an estimate, because catalogue price is display-only (§7.3, the Estimate Rule).
- No counter is stored. All six link-view figures are derived (§7.2).
- `Click` is retained in full for 13 months and aggregated thereafter (§4.5).
- Every string in the product exists in both `ka` and `en`.
- The MinIO volume carries no backup in the MVP (§11.2). The nightly `pg_dump` and its rehearsed restore cover Postgres only.
- Each task ends in a commit.

---

## Prerequisite amendment to Phase 6

The CSV needs to know **when a cancelled order had been confirmed**, and Phase 6 clears `confirmed_at` on cancellation to satisfy `confirmed_at_matches_status`. That information must therefore survive in the audit trail.

Amend `decideOrder` so a cancellation writes:

```ts
{
  action: "conversion.cancelled",
  entityType: "conversion",
  entityId: conversion.id,
  changes: {
    from: conversion.status,
    to: "CANCELLED",
    // The CSV reads this to place a negative line in the right month.
    previousConfirmedAt: conversion.confirmedAt?.toISOString() ?? null,
  },
}
```

Add the assertion to Phase 6's `decide-order.test.ts` before continuing, and treat this as Task 0 of this phase. Without it, §7.1's negative line is underivable.

---

## Planned file structure

```
src/modules/reporting/domain/billing-month.ts        Asia/Tbilisi month boundaries
src/modules/reporting/domain/billing-month.test.ts
src/modules/reporting/domain/csv.ts                  RFC 4180 writer
src/modules/reporting/domain/csv.test.ts
src/modules/reporting/domain/link-counters.ts        the derived-figure shapes
src/modules/reporting/ports/*.ts
src/modules/reporting/application/get-link-view.ts   + test
src/modules/reporting/application/get-creator-earnings.ts + test
src/modules/reporting/application/build-settlement-csv.ts + test
src/modules/reporting/infrastructure/prisma-link-view.ts       the A.5 query
src/modules/reporting/infrastructure/prisma-earnings.ts
src/modules/reporting/infrastructure/reporting.integration.test.ts
src/modules/reporting/ui/link-view.tsx
src/modules/reporting/ui/click-list.tsx
src/modules/reporting/ui/earnings-summary.tsx
src/modules/reporting/index.ts

src/modules/worker/jobs/generate-monthly-csv.ts      + test
src/modules/worker/jobs/aggregate-old-clicks.ts      + test
src/modules/worker/scheduler.ts
src/modules/worker/index.ts
worker/main.ts                                       the worker entrypoint

app/[locale]/links/[code]/page.tsx                   visible to creator and brand
app/[locale]/creator/earnings/page.tsx               finished
app/[locale]/brand/reports/page.tsx
app/api/brand/reports/csv/route.ts

Dockerfile  ·  docker-entrypoint.sh
compose.production.yaml  ·  deploy/Caddyfile  ·  deploy/.env.production.example
                                                  + minio, minio-init services (R1 §11.2)
scripts/backup-database.sh  ·  scripts/restore-database.sh
scripts/seed-phase-07.ts
src/test/e2e/reporting.spec.ts                       @phase-7
docs/deployment.md  ·  docs/runbook.md
```

---

### Task 1: Compute Asia/Tbilisi billing months

**Files:**

- Create: `src/modules/reporting/domain/billing-month.ts`, `billing-month.test.ts`

**Interfaces:**

- Consumes: nothing
- Produces:
  - `type BillingMonth = { label: string; startsAt: Date; endsAt: Date }` — `label` is `2026-08`, bounds are UTC instants of the Tbilisi month, half-open `[startsAt, endsAt)`
  - `billingMonthFor(at: Date): BillingMonth`
  - `billingMonthFromLabel(label: string): BillingMonth`
  - `previousBillingMonth(month: BillingMonth): BillingMonth`

- [ ] **Step 1: Write the failing test**

Timezone arithmetic is where a reporting bug hides for a full month before anyone notices, so the boundaries are tested at the instant:

```ts
import { describe, expect, it } from "vitest";
import { billingMonthFor, billingMonthFromLabel, previousBillingMonth } from "./billing-month";

describe("billingMonthFor", () => {
  it("labels by the Tbilisi calendar month", () => {
    expect(billingMonthFor(new Date("2026-08-12T10:00:00Z")).label).toBe("2026-08");
  });

  it("starts at Tbilisi midnight, which is 20:00 UTC the previous day", () => {
    // Asia/Tbilisi is UTC+4 year round: no daylight saving since 2005.
    expect(billingMonthFor(new Date("2026-08-12T10:00:00Z")).startsAt.toISOString()).toBe(
      "2026-07-31T20:00:00.000Z",
    );
  });

  it("ends at the start of the next Tbilisi month, exclusive", () => {
    expect(billingMonthFor(new Date("2026-08-12T10:00:00Z")).endsAt.toISOString()).toBe(
      "2026-08-31T20:00:00.000Z",
    );
  });

  it("puts 2026-08-31T21:00:00Z into September, not August", () => {
    // 01:00 on 1 September in Tbilisi.
    expect(billingMonthFor(new Date("2026-08-31T21:00:00Z")).label).toBe("2026-09");
  });

  it("puts 2026-08-31T19:59:59Z into August", () => {
    expect(billingMonthFor(new Date("2026-08-31T19:59:59Z")).label).toBe("2026-08");
  });

  it("handles a December to January rollover", () => {
    expect(billingMonthFor(new Date("2026-12-31T21:00:00Z")).label).toBe("2027-01");
  });

  it("handles February in a leap year", () => {
    const february = billingMonthFromLabel("2028-02");
    expect(february.endsAt.toISOString()).toBe("2028-02-29T20:00:00.000Z");
  });

  it("makes the bounds half-open, so no instant belongs to two months", () => {
    const august = billingMonthFromLabel("2026-08");
    const september = billingMonthFromLabel("2026-09");
    expect(august.endsAt.getTime()).toBe(september.startsAt.getTime());
  });

  it("walks backwards across a year boundary", () => {
    expect(previousBillingMonth(billingMonthFromLabel("2027-01")).label).toBe("2026-12");
  });

  it("rejects a malformed label rather than guessing", () => {
    expect(() => billingMonthFromLabel("2026-13")).toThrowError();
    expect(() => billingMonthFromLabel("august")).toThrowError();
  });
});
```

- [ ] **Step 2: Run, confirm failure, implement**

Compute the offset with `Intl.DateTimeFormat` and the `Asia/Tbilisi` time zone rather than hard-coding `+4`. Georgia has had no daylight saving since 2005 and the offset is very unlikely to change — but a hard-coded constant would be silently wrong if it ever did, and `Intl` costs nothing here since this runs a few times per request at most.

- [ ] **Step 3: Run and commit**

```bash
pnpm vitest run src/modules/reporting/domain/billing-month.test.ts
git add src/modules/reporting/domain
git commit -m "feat: compute Asia/Tbilisi billing month boundaries"
```

---

### Task 2: Build the link view

**Files:**

- Create: `src/modules/reporting/domain/link-counters.ts`
- Create: `src/modules/reporting/ports/link-view-repository.ts`
- Create: `src/modules/reporting/application/get-link-view.ts`, `get-link-view.test.ts`
- Create: `src/modules/reporting/infrastructure/prisma-link-view.ts`
- Create: `src/modules/reporting/ui/link-view.tsx`, `click-list.tsx`
- Create: `app/[locale]/links/[code]/page.tsx`

**Interfaces:**

- Consumes: `resolveLink` from partnerships, `Money`
- Produces:
  - `type LinkCounters = { totalClicks: number; uniqueClicks: number; visitors: number; convertedClicks: number; conversionRate: number | undefined; firstClickAt: Date | undefined; lastClickAt: Date | undefined }`
  - `type LinkCommission = { pending: Money; confirmed: Money; cancelled: Money }`
  - `getLinkView(deps)(viewer, code): Promise<Result<LinkView, "not_found" | "not_yours">>`

- [ ] **Step 1: Write the failing counter test**

The six figures must each be a different number against a fixture built to make them different — a fixture where they coincide proves nothing:

```ts
describe("link counters", () => {
  it("reports four different numbers against a mixed fixture", async () => {
    // 5 clicks: 3 from visitor A (one deduplicated), 2 from visitor B
    // (one converted twice, one never converted).
    const view = await getLinkView(deps(mixedFixture))(creatorViewer, "K7M2QPXZ");

    expect(view.ok && view.value.counters).toEqual({
      totalClicks: 5,
      uniqueClicks: 4,
      visitors: 2,
      convertedClicks: 2,
      conversionRate: 0.5,
      firstClickAt: new Date("2026-08-01T10:00:00Z"),
      lastClickAt: new Date("2026-08-11T14:02:00Z"),
    });
  });

  it("reports no conversion rate when there are no unique clicks", async () => {
    const view = await getLinkView(deps(emptyFixture))(creatorViewer, "K7M2QPXZ");
    expect(view.ok && view.value.counters.conversionRate).toBeUndefined();
  });

  it("counts a click that earned on two orders once", async () => {
    const view = await getLinkView(deps(doubleEarningFixture))(creatorViewer, "K7M2QPXZ");
    expect(view.ok && view.value.counters.convertedClicks).toBe(1);
  });

  it("splits commission by conversion status", async () => {
    const view = await getLinkView(deps(mixedFixture))(creatorViewer, "K7M2QPXZ");
    expect(view.ok && view.value.commission.confirmed.toStorageString()).toBe("11.44");
    expect(view.ok && view.value.commission.pending.toStorageString()).toBe("25.42");
    expect(view.ok && view.value.commission.cancelled.toStorageString()).toBe("0.00");
  });

  it("names the failing disable-chain row when the link is not active", async () => {
    const view = await getLinkView(deps(archivedProductFixture))(creatorViewer, "K7M2QPXZ");
    expect(view.ok && view.value.status).toEqual({ active: false, reason: "PRODUCT_ARCHIVED" });
  });

  it("is visible to the owning creator and to the brand", async () => {
    expect((await getLinkView(deps(mixedFixture))(creatorViewer, "K7M2QPXZ")).ok).toBe(true);
    expect((await getLinkView(deps(mixedFixture))(brandViewer, "K7M2QPXZ")).ok).toBe(true);
  });

  it("is not visible to another creator", async () => {
    const view = await getLinkView(deps(mixedFixture))(otherCreatorViewer, "K7M2QPXZ");
    expect(view).toEqual({ ok: false, error: "not_yours" });
  });
});
```

- [ ] **Step 2: Implement the A.5 query**

`prisma-link-view.ts` uses the query in Appendix A.5 verbatim, and keeps the commission totals in a **second** query joined to `conversion`, exactly as the appendix says — so the counter query never fans out across line items and double-counts a click.

- [ ] **Step 3: Build the screen**

Per §7.2, three blocks:

**Identity** — code (in a `CopyField` with the full `xu.ge/r/…` URL), brand, product, destination, creator, rate, status, created. When the status is not active, the `StatusPill` names the failing row.

**Counters** — a `Figure` strip. Three click counts are shown rather than one, and the screen says why in a caption: total minus unique is the same person refreshing; unique minus converted is the funnel. Conversion rate follows the Estimate Rule only if it is forward-looking — it is not, so it is stated plainly.

**Click list** — most recent first: when, unique, converted, order, amount, status. `converted` reads `Click.convertedAt` directly. The order and amount columns are fetched only for rows showing as converted, which the partial index makes cheap.

- [ ] **Step 4: Run and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/reporting app/[locale]/links
git commit -m "feat: build the link view with its six derived counters"
```

---

### Task 3: Build creator earnings

**Files:**

- Create: `src/modules/reporting/application/get-creator-earnings.ts`, and its test
- Create: `src/modules/reporting/ui/earnings-summary.tsx`
- Modify: `app/[locale]/creator/earnings/page.tsx`

**Interfaces:**

- Consumes: the attribution and conversion tables, `billingMonthFor`
- Produces: `getCreatorEarnings(deps)(creatorId, month): Promise<CreatorEarnings>` with per-link, per-brand and per-month breakdowns split into pending / confirmed / cancelled

- [ ] **Step 1: Write the failing test**

```ts
it("splits totals into pending, confirmed and cancelled", async () => {
  const earnings = await getCreatorEarnings(deps(fixture))("nino", "2026-08");

  expect(earnings.total.pending.toStorageString()).toBe("25.42");
  expect(earnings.total.confirmed.toStorageString()).toBe("11.44");
  expect(earnings.total.cancelled.toStorageString()).toBe("3.00");
});

it("buckets by confirmation date in Tbilisi, not by order date", async () => {
  // Confirmed 2026-09-01T01:00 Tbilisi for an order that occurred 2026-08-12.
  const august = await getCreatorEarnings(deps(lateConfirmFixture))("nino", "2026-08");
  const september = await getCreatorEarnings(deps(lateConfirmFixture))("nino", "2026-09");

  expect(august.total.confirmed.toStorageString()).toBe("0.00");
  expect(september.total.confirmed.toStorageString()).toBe("11.44");
});

it("keeps pending commission in the month of the order, since it has no confirmation date", async () => {
  const earnings = await getCreatorEarnings(deps(pendingFixture))("nino", "2026-08");
  expect(earnings.total.pending.toStorageString()).toBe("25.42");
});

it("breaks totals down per brand", async () => {
  const earnings = await getCreatorEarnings(deps(twoBrandFixture))("nino", "2026-08");
  expect(earnings.byBrand.map((b) => b.brandName)).toEqual(["Aromashop", "Techno"]);
});

it("computes the per-sale estimate from the catalogue price and marks it an estimate", async () => {
  const earnings = await getCreatorEarnings(deps(fixture))("nino", "2026-08");
  const link = earnings.byLink[0]!;

  expect(link.estimatedPerSale.toStorageString()).toBe("30.00");
  expect(link.estimateBasis).toBe("catalogue_price");
});
```

`estimateBasis` exists so the UI cannot render the number without a label — the field forces the Estimate Rule into the type system rather than leaving it to a designer's memory.

- [ ] **Step 2: Build the screen**

Per §7.3:

```
Perfume 100ml — 250.00 ₾
You earn ~30.00 ₾ per completed sale   (estimate, based on catalogue price)
```

The tilde and the parenthetical are both required, in both locales. Per link, the Phase 2 counters. Per brand and per month, the three-way split.

- [ ] **Step 3: Run and commit**

```bash
pnpm test:unit
git add src/modules/reporting app/[locale]/creator
git commit -m "feat: build creator earnings with labelled estimates"
```

---

### Task 4: Generate the settlement CSV

**Files:**

- Create: `src/modules/reporting/domain/csv.ts`, `csv.test.ts`
- Create: `src/modules/reporting/application/build-settlement-csv.ts`, and its test
- Create: `app/api/brand/reports/csv/route.ts`
- Create: `app/[locale]/brand/reports/page.tsx`

**Interfaces:**

- Consumes: `billingMonthFromLabel`, the conversion and audit tables
- Produces:
  - `toCsv(rows: readonly Record<string, string>[], columns: readonly string[]): string` — RFC 4180, CRLF, quoted where needed
  - `buildSettlementCsv(deps)(brandId, monthLabel): Promise<{ filename: string; body: string }>`

- [ ] **Step 1: Write the failing CSV-writer test**

A CSV writer looks trivial until a Georgian product title contains a comma:

```ts
describe("toCsv", () => {
  it("writes a header row and CRLF line endings", () => {
    expect(toCsv([{ a: "1", b: "2" }], ["a", "b"])).toBe("a,b\r\n1,2\r\n");
  });

  it("quotes a value containing a comma", () => {
    expect(toCsv([{ a: "Perfume, 100ml" }], ["a"])).toBe('a\r\n"Perfume, 100ml"\r\n');
  });

  it("doubles an embedded quote", () => {
    expect(toCsv([{ a: 'He said "hi"' }], ["a"])).toBe('a\r\n"He said ""hi"""\r\n');
  });

  it("quotes a value containing a newline", () => {
    expect(toCsv([{ a: "line1\nline2" }], ["a"])).toBe('a\r\n"line1\nline2"\r\n');
  });

  it("passes Georgian text through unchanged", () => {
    expect(toCsv([{ a: "სუნამო" }], ["a"])).toBe("a\r\nსუნამო\r\n");
  });

  it("writes an empty string for a missing column", () => {
    expect(toCsv([{ a: "1" }], ["a", "b"])).toBe("a,b\r\n1,\r\n");
  });

  it("writes only the header for no rows", () => {
    expect(toCsv([], ["a", "b"])).toBe("a,b\r\n");
  });
});
```

- [ ] **Step 2: Write the failing settlement test**

Columns per §7.4: creator, link code, order ID, order date, confirmation date, commissionable net, rate, commission.

```ts
describe("buildSettlementCsv", () => {
  it("includes only CONFIRMED conversions", async () => {
    const { body } = await buildSettlementCsv(deps(mixedFixture))("b1", "2026-08");

    expect(body).toContain("CONFIRMED-ORDER");
    expect(body).not.toContain("PENDING-ORDER");
    expect(body).not.toContain("UNATTRIBUTED-ORDER");
  });

  it("buckets by confirmation date, not order date", async () => {
    // Order occurred 2026-06-30; confirmed 2026-08-03.
    const june = await buildSettlementCsv(deps(lateConfirmFixture))("b1", "2026-06");
    const august = await buildSettlementCsv(deps(lateConfirmFixture))("b1", "2026-08");

    expect(june.body).not.toContain("LATE-ORDER");
    expect(august.body).toContain("LATE-ORDER");
  });

  it("uses Tbilisi boundaries: a 2026-08-31T21:00Z confirmation is September", async () => {
    const august = await buildSettlementCsv(deps(boundaryFixture))("b1", "2026-08");
    const september = await buildSettlementCsv(deps(boundaryFixture))("b1", "2026-09");

    expect(august.body).not.toContain("BOUNDARY-ORDER");
    expect(september.body).toContain("BOUNDARY-ORDER");
  });

  it("carries a late cancellation as a negative line on the current month", async () => {
    // Confirmed in July, cancelled in August, after July's CSV went out.
    const { body } = await buildSettlementCsv(deps(lateCancelFixture))("b1", "2026-08");
    expect(body).toContain("-11.44");
  });

  it("does not double-count a cancellation in the month it was confirmed", async () => {
    // Confirmed AND cancelled inside August: it never appears at all,
    // because it is not CONFIRMED at month end and no CSV claimed it.
    const { body } = await buildSettlementCsv(deps(sameMonthCancelFixture))("b1", "2026-08");
    expect(body).not.toContain("SAME-MONTH-CANCEL");
  });

  it("writes money as decimal strings with two places", async () => {
    const { body } = await buildSettlementCsv(deps(mixedFixture))("b1", "2026-08");
    expect(body).toMatch(/,11\.44\r?\n/);
  });

  it("writes a PERCENT rate as the fraction actually stored", async () => {
    const { body } = await buildSettlementCsv(deps(mixedFixture))("b1", "2026-08");
    expect(body).toContain("0.1200");
  });

  it("names the file by brand and month", async () => {
    const { filename } = await buildSettlementCsv(deps(mixedFixture))("b1", "2026-08");
    expect(filename).toBe("shuamo-aromashop-2026-08.csv");
  });

  it("returns a header-only CSV for a month with no confirmations", async () => {
    const { body } = await buildSettlementCsv(deps(emptyFixture))("b1", "2026-01");
    expect(body.trim().split("\r\n")).toHaveLength(1);
  });
});
```

The same-month cancellation test encodes a real decision: an order confirmed and cancelled inside the same month never appears on any CSV, because nothing was ever claimed for it. Only a cancellation crossing a month boundary needs a negative line.

- [ ] **Step 3: Implement**

Positive lines come from `conversion` where `status = CONFIRMED` and `confirmed_at` falls in the month. Negative lines come from `audit_event` where `action = 'conversion.cancelled'`, `at` falls in the month, and `changes->>'previousConfirmedAt'` falls in an **earlier** month — which is why Task 0's amendment exists.

- [ ] **Step 4: Serve it**

`app/api/brand/reports/csv/route.ts` requires a brand viewer, takes `?month=2026-08`, and responds with `Content-Type: text/csv; charset=utf-8` and a `Content-Disposition` attachment. It emits a UTF-8 BOM, because Excel on Windows renders Georgian as mojibake without one, and this file is going to be opened in Excel.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/reporting app/api/brand/reports app/[locale]/brand/reports
git commit -m "feat: generate the per-brand monthly settlement CSV"
```

---

### Task 5: Build the worker

**Files:**

- Create: `src/modules/worker/jobs/generate-monthly-csv.ts`, `aggregate-old-clicks.ts` and their tests
- Create: `src/modules/worker/scheduler.ts`, `worker/main.ts`
- Modify: `prisma/schema.prisma` (a `ClickAggregate` table), `package.json`

**Interfaces:**

- Consumes: `buildSettlementCsv`, `billingMonthFor`
- Produces:
  - `runMonthlyCsvJob(deps)(at: Date): Promise<{ generated: number }>`
  - `runClickRetentionJob(deps)(at: Date): Promise<{ aggregated: number; deleted: number }>`
  - `pnpm worker:dev`, and a `worker` Compose service

- [ ] **Step 1: Add the aggregate table**

Clicks are retained in full for 13 months and aggregated thereafter (§4.5). The aggregate keeps what the link view needs and drops what it does not:

```prisma
/// Clicks older than 13 months collapse into one row per link per day.
/// visitor_id, fp_hash and the individual ids are not carried across: they
/// exist for deduplication and attribution, both of which are long over.
model ClickAggregate {
  id               String   @id @default(uuid()) @db.Uuid
  trackingLinkId   String   @map("tracking_link_id") @db.Uuid
  day              DateTime @db.Date
  totalClicks      Int      @map("total_clicks")
  uniqueClicks     Int      @map("unique_clicks")
  distinctVisitors Int      @map("distinct_visitors")
  convertedClicks  Int      @map("converted_clicks")

  @@unique([trackingLinkId, day])
  @@map("click_aggregate")
}
```

- [ ] **Step 2: Write the failing retention test**

```ts
it("aggregates clicks older than 13 months and leaves newer ones alone", async () => {
  const now = new Date("2026-08-29T00:00:00Z");
  await seedClicksAcross([
    "2025-07-01T00:00:00Z",   // 13 months + : aggregated
    "2025-07-01T06:00:00Z",   // same day, same link
    "2025-08-15T00:00:00Z",   // inside the window: untouched
  ]);

  const result = await runClickRetentionJob(deps)(now);

  expect(result.aggregated).toBe(1);   // one link-day row
  expect(result.deleted).toBe(2);
  expect(await prisma.click.count()).toBe(1);
});

it("preserves the counts it aggregates", async () => {
  await runClickRetentionJob(deps)(new Date("2026-08-29T00:00:00Z"));
  const [row] = await prisma.clickAggregate.findMany();

  expect(row).toMatchObject({ totalClicks: 2, uniqueClicks: 1, distinctVisitors: 1 });
});

it("never aggregates a click that still has an attribution", async () => {
  // An attribution's click_id is ON DELETE RESTRICT; deleting it would fail.
  // The job must skip these, not crash on them.
  await seedOldClickWithAttribution();
  const result = await runClickRetentionJob(deps)(new Date("2026-08-29T00:00:00Z"));

  expect(result.deleted).toBe(0);
  expect(await prisma.click.count()).toBe(1);
});

it("is idempotent: running twice aggregates once", async () => {
  const at = new Date("2026-08-29T00:00:00Z");
  await runClickRetentionJob(deps)(at);
  const second = await runClickRetentionJob(deps)(at);

  expect(second.aggregated).toBe(0);
});
```

The attribution case is the one that would take the job down in production: `attribution.click_id` is `ON DELETE RESTRICT`, so a click that earned money can never be deleted. The job must exclude those rows in its query rather than discover the constraint at runtime.

- [ ] **Step 3: Write the CSV job**

`runMonthlyCsvJob` generates the previous month's CSV for every brand with confirmations, on the first of the month at 00:30 Asia/Tbilisi, and stores the result where the brand's reports page can serve it. In the MVP it writes to a `report_file` row holding the CSV text. MinIO exists by this phase (§11.2), but it is scoped to product images — routing a few kilobytes of text through a second storage system and a second code path would buy nothing a `text` column doesn't already give for free.

- [ ] **Step 4: Build the scheduler and the entrypoint**

`worker/main.ts` is a long-running process with a plain interval loop that checks, once a minute, whether a job is due. It is not a queue consumer, and nothing in a request path waits on it (§11). Each job run is wrapped so a failure logs and the loop continues.

Add a `/health` on the worker so the Compose healthcheck has something to read.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit && pnpm test:integration
git add src/modules/worker worker prisma
git commit -m "feat: add the worker with monthly CSV and click retention jobs"
```

---

### Task 6: Complete both locales

**Files:**

- Modify: `src/modules/localization/messages/ka.json`, `en.json`
- Modify: `src/modules/localization/messages.test.ts`

**Interfaces:**

- Consumes: every screen built so far
- Produces: a product with no untranslated string

- [ ] **Step 1: Strengthen the completeness test**

Phase 0's test compared key sets. This one also finds strings that never made it into a catalogue at all:

```ts
it("has no hard-coded user-facing string in a component", () => {
  const offenders: string[] = [];

  for (const file of globSync("src/modules/**/ui/*.tsx")) {
    const source = readFileSync(file, "utf8");
    // Any JSX text node of two or more Latin or Georgian words.
    const matches = source.match(/>[\s]*[A-Za-zႠ-ჿ][^<>{}]{4,}</g) ?? [];
    if (matches.length > 0) offenders.push(`${file}: ${matches[0]}`);
  }

  expect(offenders).toEqual([]);
});
```

This will produce false positives on things like `>—<`. Tune the pattern until it is honest, and add an inline `{/* i18n-exempt */}` marker the check skips for the handful of genuine exceptions. A check that is routinely suppressed is worse than none, so keep the exemptions countable.

- [ ] **Step 2: Translate everything**

Every screen from Phases 1–7, every error message, every status label, every disable reason, every CSV column header, every email-less notification banner. Both locales.

Georgian is not a translation of English here — it is the primary market language, and the Equal-Script Rule means it gets the same weight and size. Where a Georgian string wraps differently, fix the layout, not the string.

- [ ] **Step 3: Run and commit**

```bash
pnpm test:unit && pnpm build
git add src/modules/localization src/modules
git commit -m "i18n: complete the ka and en catalogues across the product"
```

---

### Task 7: Deploy

**Files:**

- Create: `Dockerfile`, `docker-entrypoint.sh`, `compose.production.yaml`, `deploy/.env.production.example`
- Create: `scripts/backup-database.sh`, `scripts/restore-database.sh`
- Create: `docs/deployment.md`, `docs/runbook.md`
- Modify: `deploy/Caddyfile`

**Interfaces:**

- Consumes: everything
- Produces: a running four-service deployment

- [ ] **Step 1: Write the multi-stage Dockerfile**

Four stages: `base` (Node 24 slim, corepack), `dependencies` (frozen install, `--ignore-scripts`), `builder` (Prisma generate, `next build` with **placeholder** environment values that are visibly non-secret), `runner` (standalone output, plus the Prisma CLI and `tsx` retained so migrations and seeds can run inside the container).

Comment the build-time placeholders explicitly. A future reader must be able to tell at a glance that `AUTH_SECRET=build-only-…` is not a leaked credential.

- [ ] **Step 2: Write the production Compose file**

Five services: `caddy`, `web`, `worker`, `postgres`, `minio`, plus a one-shot `minio-init`. `web` and `worker` share the image and differ by command. Only `caddy` publishes ports. `postgres` and `minio` each have a named volume and a healthcheck; `web` waits on both.

```yaml
  minio:
    image: minio/minio:RELEASE.2025-09-07T16-13-09Z
    restart: unless-stopped
    env_file:
      - ${ENV_FILE:-deploy/.env.production}
    command: server /data --console-address ":9001"
    volumes:
      - shuamo_minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 20

  minio-init:
    image: minio/mc:RELEASE.2025-08-13T08-35-41Z
    env_file:
      - ${ENV_FILE:-deploy/.env.production}
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: /bin/sh
    command:
      - -ec
      - |
        mc alias set local http://minio:9000 "$$MINIO_ROOT_USER" "$$MINIO_ROOT_PASSWORD"
        mc mb --ignore-existing "local/$$STORAGE_BUCKET"
        mc anonymous set download "local/$$STORAGE_BUCKET"
        mc admin user add local "$$STORAGE_ACCESS_KEY_ID" "$$STORAGE_SECRET_ACCESS_KEY" || true
        mc admin policy attach local readwrite --user "$$STORAGE_ACCESS_KEY_ID"
```

Unlike the dev `compose.yaml` (Phase 3), `minio-init` carries no `profiles: ["setup"]` gate here — every
`mc` command it runs is idempotent (`--ignore-existing`, a policy re-attach, `|| true` on the user
add), so it is safe to run on every deploy, and running it automatically means a fresh VPS never needs
a manual bucket-provisioning step. `web` depends on `minio-init` with
`condition: service_completed_successfully`, so the bucket and its policy exist before the app can
receive traffic that might trigger an upload.

Add `shuamo_minio_data` to the top-level `volumes:` block, alongside the Postgres volume. Add
`STORAGE_ENDPOINT`, `STORAGE_PUBLIC_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`,
`STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` to
`deploy/.env.production.example` — `STORAGE_PUBLIC_ENDPOINT` is the domain Caddy serves images through
(§11.2's stored `imageUrls` are public URLs, so this must be reachable from the buyer's browser, not
just from inside the Compose network).

- [ ] **Step 3: Run migrations at start, before traffic**

`docker-entrypoint.sh` runs `prisma migrate deploy` and then execs the server. A container that starts serving before its migrations land will answer requests against a schema that does not match the code.

- [ ] **Step 4: Finish the Caddyfile**

TLS for the domain, `trusted_proxies`, the `X-Real-IP` header from Phase 4, security headers, and `/r/*` served from the same certificate as the app (§11 — a second certificate for the redirect host is an operational cost with no benefit).

- [ ] **Step 5: Back up, and prove the restore**

`scripts/backup-database.sh` runs a nightly `pg_dump` to offsite storage. `scripts/restore-database.sh` restores a named dump into an empty database. This covers Postgres only — there is no equivalent script for the MinIO volume, and `docs/runbook.md` (Step 7) says so explicitly rather than leaving the gap to be discovered during an incident.

**Then actually do it**, because a backup nobody has restored is a hope:

```bash
./scripts/backup-database.sh
createdb shuamo_restore_test
./scripts/restore-database.sh latest shuamo_restore_test
DATABASE_URL=postgresql://…/shuamo_restore_test pnpm test:integration
```

Record the date of the rehearsal in `docs/runbook.md`. §11 asks for this before the first invoice is issued in R2; doing it here means the procedure is known before it is urgent.

- [ ] **Step 6: Write the deployment smoke test**

Against the built image on a clean database: migrations apply, `/api/health/ready` returns 200, one redirect records a click, one postback creates a conversion, and the `shuamo-product-images` bucket exists with the `download` anonymous policy applied (`mc anonymous get local/shuamo-product-images` reports `download`, proving `minio-init` ran before `web` took traffic). Five assertions; run it as part of the deploy, not as a manual checklist.

- [ ] **Step 7: Write the runbook**

`docs/runbook.md` covers: how to deploy, how to roll back, how to approve an account, how to regenerate a brand key, how to run the CSV job by hand, how to read the structured logs, what `/api/health/live` versus `/ready` mean, what to do when the redirect p95 rises, and where the backups are — stating plainly that the MinIO volume (`shuamo_minio_data`) is **not** backed up in the MVP, so a lost volume means brands re-upload their product photos. §2's operating model is one person doing all of this by hand, so it needs to be written down.

- [ ] **Step 8: Commit**

```bash
git add Dockerfile docker-entrypoint.sh compose.production.yaml deploy scripts docs
git commit -m "ops: deploy web, worker, postgres and caddy behind one certificate"
```

---

### Task 8: Prove the MVP end to end

**Files:**

- Create: `scripts/seed-phase-07.ts`, `src/test/e2e/reporting.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the full journey**

```ts
test("@phase-7 the whole MVP journey, in one test", async ({ page, request }) => {
  // click
  const redirect = await request.get(`/r/${SEEDED_LINK_CODE}`, { maxRedirects: 0 });
  const clickId = new URL(redirect.headers().location!).searchParams.get("xu")!;

  // postback
  const postback = await request.post("/v1/conversions", {
    headers: { authorization: `Bearer ${SEEDED_BRAND_KEY}` },
    data: { orderId: "E2E-1", occurredAt: new Date().toISOString(), clickId, items: [
      { sku: "P-9", qty: 1, unitPrice: "250.00", lineDiscount: "25.00", lineVat: "34.32" },
    ] },
  });
  expect(postback.status()).toBe(200);

  // the creator sees it as pending
  await signInAsCreator(page, "ka");
  await page.goto("/ka/creator/earnings");
  await expect(page.getByText("22.88 ₾")).toBeVisible();

  // the brand confirms it
  await signInAsBrand(page, "en");
  await page.goto("/en/brand/orders");
  await page.getByRole("button", { name: /confirm/i }).click();

  // the CSV carries it
  const csv = await request.get(`/api/brand/reports/csv?month=${currentTbilisiMonth()}`);
  expect(await csv.text()).toContain("E2E-1");
  expect(await csv.text()).toContain("22.88");
});

test("@phase-7 the link view reports three different click counts", async ({ page }) => {
  await signInAsCreator(page, "en");
  await page.goto(`/en/links/${SEEDED_LINK_CODE}`);

  await expect(page.getByText("Total clicks")).toBeVisible();
  await expect(page.getByText("Unique clicks")).toBeVisible();
  await expect(page.getByText("Converted clicks")).toBeVisible();
});

for (const locale of ["ka", "en"] as const) {
  test(`@phase-7 ${locale} reporting screens have no accessibility violations`, async ({ page }) => {
    for (const path of ["/creator/earnings", "/brand/orders", "/brand/reports"]) {
      await page.goto(`/${locale}${path}`);
      const results = await new AxeBuilder({ page }).withTags(["wcag22aa"]).analyze();
      expect(results.violations, path).toEqual([]);
    }
  });
}
```

- [ ] **Step 2: Wire the MVP gate**

```json
{
  "seed:phase-7": "tsx scripts/seed-phase-07.ts",
  "verify:mvp": "pnpm verify:phase-6 && pnpm db:migrate:test && pnpm test:integration && pnpm build && pnpm seed:phase-7 && pnpm test:e2e --grep @phase-7"
}
```

```bash
pnpm verify:mvp
```

- [ ] **Step 3: Commit**

```bash
git add scripts src/test/e2e/reporting.spec.ts package.json
git commit -m "test: prove the MVP end to end, click to CSV"
```

---

## Phase 7 completion checklist

- [ ] `pnpm verify:mvp` passes.
- [ ] Billing months are computed in Asia/Tbilisi, proved at the 20:00 UTC boundary in both directions and across a leap February.
- [ ] The link view's four click counts are each a different number against the seeded fixture.
- [ ] A click that earned on two orders counts once as converted.
- [ ] The CSV contains only `CONFIRMED` conversions, buckets by confirmation date, and carries a late cancellation as a negative line.
- [ ] An order confirmed and cancelled inside the same month appears on no CSV.
- [ ] The CSV opens in Excel with Georgian text intact — checked by actually opening one.
- [ ] The retention job aggregates clicks past 13 months, skips clicks with attributions, and is idempotent.
- [ ] Every forward-looking figure on screen carries the word "estimate" in both locales.
- [ ] The `ka` and `en` catalogues have identical key sets, and no user-facing string is hard-coded in a component.
- [ ] The five Compose services start clean, migrations apply before traffic, `minio-init` completes before `web` accepts requests, and the smoke test passes against the built image.
- [ ] Caddy overwrites a client-supplied `X-Forwarded-For`, verified against the deployed instance.
- [ ] **A `pg_dump` has been restored into an empty database, and the restored copy passes `pnpm test:integration`.** The date is recorded in `docs/runbook.md`.
- [ ] `docs/runbook.md` covers deploy, rollback, approvals, key regeneration, manual CSV, log reading, the latency escalation, and states plainly that the MinIO volume has no backup in the MVP.
- [ ] The §13 non-code gates are answered or explicitly accepted in writing before pilot traffic: the cookie's legal review, creator payout tax treatment, locale ownership, and the commercial terms the CSV settles against.
