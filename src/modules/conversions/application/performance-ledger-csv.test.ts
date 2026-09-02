import { describe, expect, it } from "vitest";
import {
  performanceExportLimitProblem,
  performanceLedgerCsv,
} from "./performance-ledger-csv";

describe("performanceLedgerCsv", () => {
  it("exports traceable ledger rows and safely quotes spreadsheet formulas", () => {
    const csv = performanceLedgerCsv([
      {
        id: "attribution-1",
        orderId: "ORDER-1",
        occurredAt: "2026-08-12T10:00:00.000Z",
        status: "CONFIRMED",
        brandId: "brand-1",
        brandName: "Aroma, Shop",
        creatorId: "creator-1",
        creatorName: "=IMPORTXML()",
        productId: "product-1",
        productTitle: 'Amber "No. 4"',
        sku: "SKU-1",
        linkId: "link-1",
        linkCode: "KHATIA-AMBER",
        clickId: "click-1",
        quantity: 2,
        commissionableNet: "180.00",
        commissionAmount: "18.00",
      },
    ]);

    expect(csv).toContain('"Aroma, Shop"');
    expect(csv).toContain('"Amber ""No. 4"""');
    expect(csv).toContain('"\'=IMPORTXML()"');
    expect(csv).toContain('"click-1"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("makes an oversized export explicit instead of silently truncating it", () => {
    expect(performanceExportLimitProblem(10_001, 10_000)).toEqual({
      error: "export_too_large",
      message:
        "This export contains 10001 rows. Narrow the filters to 10000 rows or fewer and try again.",
      limit: 10_000,
      total: 10_001,
    });
    expect(performanceExportLimitProblem(10_000, 10_000)).toBeUndefined();
  });
});
