import {
  brandPerformanceLedgerExport,
  creatorPerformanceLedgerExport,
  parsePerformanceQuery,
  performanceExportLimitProblem,
  performanceLedgerCsv,
  type PerformanceSearchParams,
} from "@/src/modules/conversions";
import { currentViewer } from "@/src/modules/identity";

function queryRecord(searchParams: URLSearchParams): PerformanceSearchParams {
  return Object.fromEntries(searchParams.entries());
}

export async function GET(request: Request) {
  const viewer = await currentViewer();
  if (viewer.kind !== "creator" && viewer.kind !== "brand")
    return new Response("Unauthorized", { status: 401 });

  const query = queryRecord(new URL(request.url).searchParams);
  const state = parsePerformanceQuery(query, viewer.kind);
  const result =
    viewer.kind === "creator"
      ? await creatorPerformanceLedgerExport(viewer.creatorId, state.filters)
      : await brandPerformanceLedgerExport(viewer.brandId, state.filters);
  const limitProblem = performanceExportLimitProblem(
    result.total,
    result.limit,
  );
  if (limitProblem)
    return Response.json(limitProblem, {
      status: 422,
      headers: { "Cache-Control": "private, no-store" },
    });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(performanceLedgerCsv(result.rows), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="shuamo-performance-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
