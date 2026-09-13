export interface CsvCell {
  value: string;
  numeric?: boolean;
}
function cell(c: CsvCell) {
  const unsafe =
    !c.numeric &&
    (/^[\t\r\n]/.test(c.value) || /^[\s\uFEFF]*[=+\-@]/.test(c.value));
  const value = unsafe ? `'${c.value}` : c.value;
  return `"${value.replaceAll('"', '""')}"`;
}
export function adminPerformanceCsv(
  headers: readonly string[],
  rows: readonly (readonly CsvCell[])[],
) {
  return `\uFEFF${[headers.map((value) => cell({ value })).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n")}\r\n`;
}
export const adminCsvHeaders = {
  products: [
    "From",
    "To",
    "Product ID",
    "Product",
    "SKU",
    "Status",
    "Brand ID",
    "Brand",
    "Clicks",
    "Attributed sales",
    "Sales value (GEL)",
    "Creator commission (GEL)",
  ],
  brands: [
    "From",
    "To",
    "Brand ID",
    "Brand",
    "Clicks",
    "Attributed sales",
    "Sales value (GEL)",
    "Creator commission (GEL)",
    "Account payments received in period (GEL)",
    "Account outstanding all time (GEL)",
  ],
  creators: [
    "From",
    "To",
    "Creator ID",
    "Creator",
    "Clicks",
    "Attributed sales",
    "Sales value (GEL)",
    "Commission earned (GEL)",
    "Account payouts in period (GEL)",
    "Account unpaid all time (GEL)",
  ],
  product_creators: [
    "From",
    "To",
    "Product ID",
    "Product",
    "Brand ID",
    "Brand",
    "Creator ID",
    "Creator",
    "Clicks",
    "Attributed sales",
    "Sales value (GEL)",
    "Creator commission (GEL)",
  ],
  overview: [
    "From",
    "To",
    "Brand filter ID",
    "Creator filter ID",
    "Filtered clicks",
    "Filtered attributed sales",
    "Filtered sales value (GEL)",
    "Filtered commission (GEL)",
    "Platform receipts in period (GEL)",
    "Platform payouts in period (GEL)",
    "Current platform brand outstanding (GEL)",
    "Current platform brand credits (GEL)",
    "Current platform creator unpaid (GEL)",
    "Current platform creator overpayments (GEL)",
  ],
} as const;
