import { z } from "zod";
import { requireAdmin, type Viewer } from "@/src/modules/identity";
import {
  parseAdminPerformanceQuery,
  type AdminPerformanceRepository,
  type AdminPerformanceMetrics,
} from "@/src/modules/conversions";
import type {
  PerformanceFinanceQuery,
  AdminPerformanceFinance,
} from "../ports/admin-performance-finance";
import {
  adminCsvHeaders,
  adminPerformanceCsv,
  type CsvCell,
} from "../application/admin-performance-csv";
export function createAdminPerformanceExport(deps: {
  viewer: () => Promise<Viewer>;
  reports: AdminPerformanceRepository;
  finance: (q: PerformanceFinanceQuery) => Promise<AdminPerformanceFinance>;
}) {
  return async (request: Request) => {
    const fail = (error: string, status: number, extra = {}) =>
      Response.json(
        { error, ...extra },
        { status, headers: { "Cache-Control": "private, no-store" } },
      );
    const access = requireAdmin(await deps.viewer());
    if (!access.ok)
      return fail(access.error, access.error === "unauthenticated" ? 401 : 403);
    const url = new URL(request.url),
      raw: Record<string, string | string[]> = {};
    for (const key of new Set(url.searchParams.keys())) {
      const values = url.searchParams.getAll(key);
      raw[key] = values.length === 1 ? values[0]! : values;
    }
    const scope = z
      .enum(["overview", "brands", "creators", "products", "product_creators"])
      .safeParse(raw.scope);
    if (!scope.success) return fail("invalid_input", 400);
    const selected = scope.data,
      parsed = parseAdminPerformanceQuery({
        ...raw,
        tab: selected === "product_creators" ? "products" : selected,
        page: "1",
      });
    if (!parsed.ok) return fail("invalid_input", 400);
    const q = parsed.value;
    const id =
      selected === "product_creators"
        ? z.uuid().safeParse(raw.productId)
        : undefined;
    if (id && !id.success) return fail("invalid_input", 400);
    const product = id?.success
      ? await deps.reports.productReport(id.data, q)
      : undefined;
    if (selected === "product_creators" && !product)
      return fail("not_found", 404);
    const text = (...values: string[]): CsvCell[] =>
      values.map((value) => ({ value }));
    const nums = (...values: (string | number)[]): CsvCell[] =>
      values.map((value) => ({ value: String(value), numeric: true }));
    const metricCells = (m: AdminPerformanceMetrics) =>
      nums(m.clicks, m.salesCount, m.salesValue, m.commission);
    let cells: CsvCell[][];
    if (selected === "overview") {
      const [report, f] = await Promise.all([
        deps.reports.report(q),
        deps.finance({ from: q.from, to: q.to, brandIds: [], creatorIds: [] }),
      ]);
      cells = [
        [
          ...text(q.from, q.to, q.brandId || "", q.creatorId || ""),
          ...metricCells(report.totals),
          ...nums(
            f.period.brandReceipts,
            f.period.creatorPayouts,
            f.current.brandOutstanding,
            f.current.brandCredits,
            f.current.creatorUnpaid,
            f.current.creatorOverpayments,
          ),
        ],
      ];
    } else {
      const data = await deps.reports.exportRows(
        selected,
        q,
        id?.success ? id.data : undefined,
      );
      if (data.total > 10000)
        return fail("export_too_large", 422, {
          total: data.total,
          limit: 10000,
        });
      const f =
        selected === "brands" || selected === "creators"
          ? await deps.finance({
              from: q.from,
              to: q.to,
              brandIds: selected === "brands" ? data.rows.map((r) => r.id) : [],
              creatorIds:
                selected === "creators" ? data.rows.map((r) => r.id) : [],
            })
          : undefined;
      const brands = new Map(f?.brands.map((r) => [r.id, r])),
        creators = new Map(f?.creators.map((r) => [r.id, r]));
      cells = data.rows.map((r) => {
        const base = text(q.from, q.to);
        if (selected === "products")
          return [
            ...base,
            ...text(
              r.id,
              r.name,
              r.sku || "",
              r.status || "",
              r.brandId || "",
              r.brandName || "",
            ),
            ...metricCells(r),
          ];
        if (selected === "product_creators" && product)
          return [
            ...base,
            ...text(
              product.product.id,
              product.product.title,
              product.product.brandId,
              product.product.brandName,
              r.id,
              r.name,
            ),
            ...metricCells(r),
          ];
        if (selected === "brands")
          return [
            ...base,
            ...text(r.id, r.name),
            ...metricCells(r),
            ...nums(
              brands.get(r.id)?.periodReceipts || "0.00",
              brands.get(r.id)?.outstanding || "0.00",
            ),
          ];
        return [
          ...base,
          ...text(r.id, r.name),
          ...metricCells(r),
          ...nums(
            creators.get(r.id)?.periodPayouts || "0.00",
            creators.get(r.id)?.unpaid || "0.00",
          ),
        ];
      });
    }
    return new Response(adminPerformanceCsv(adminCsvHeaders[selected], cells), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="xurjin-admin-${selected}-${q.from}-${q.to}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  };
}
