import type { EarningsLedgerRow } from "../ports/performance";

const HEADERS = [
  "Occurred at (UTC)",
  "Order",
  "Status",
  "Brand",
  "Creator",
  "Product",
  "SKU",
  "Tracking link",
  "Cited click",
  "Quantity",
  "Commissionable net (GEL)",
  "Issued commission (GEL)",
  "Reversed commission (GEL)",
  "Net earned commission (GEL)",
] as const;

function csvCell(value: string | number): string {
  const raw = String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function performanceLedgerCsv(rows: readonly EarningsLedgerRow[]) {
  const body = rows.map((row) =>
    [
      row.occurredAt,
      row.orderId,
      row.status,
      row.brandName,
      row.creatorName,
      row.productTitle,
      row.sku,
      row.linkCode,
      row.clickId,
      row.quantity,
      row.commissionableNet,
      row.commissionAmount,
      row.status === "CANCELLED" ? row.commissionAmount : "0.00",
      row.status === "CANCELLED" ? "0.00" : row.commissionAmount,
    ]
      .map(csvCell)
      .join(","),
  );
  return `\uFEFF${[HEADERS.map(csvCell).join(","), ...body].join("\r\n")}\r\n`;
}

export function performanceExportLimitProblem(total: number, limit: number) {
  return total > limit
    ? {
        error: "export_too_large" as const,
        message: `This export contains ${total} rows. Narrow the filters to ${limit} rows or fewer and try again.`,
        limit,
        total,
      }
    : undefined;
}
