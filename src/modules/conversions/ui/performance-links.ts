import type {
  PerformanceBreakdownKind,
  PerformanceFilters,
} from "../ports/performance";
import type { PerformanceMetric } from "../application/performance-query";

export function performanceHref(
  basePath: string,
  filters: PerformanceFilters,
  state: {
    metric: PerformanceMetric;
    breakdown: PerformanceBreakdownKind;
  },
  updates: Record<string, string | number | undefined> = {},
  anchor?: string,
) {
  const query = new URLSearchParams();
  const values: Record<string, string | number | undefined> = {
    period: filters.period === "30d" ? undefined : filters.period,
    tab: filters.tab,
    sale: filters.saleId,
    linkStatus: filters.linkStatus,
    from: filters.from,
    to: filters.to,
    brand: filters.brandId,
    creator: filters.creatorId,
    product: filters.productId,
    link: filters.linkId,
    status: filters.status,
    q: filters.ledgerQuery,
    ledgerPage:
      filters.ledgerPage && filters.ledgerPage > 1
        ? filters.ledgerPage
        : undefined,
    clickPage:
      filters.clickPage && filters.clickPage > 1
        ? filters.clickPage
        : undefined,
    breakdownPage:
      filters.breakdownPage && filters.breakdownPage > 1
        ? filters.breakdownPage
        : undefined,
    metric: state.metric === "clicks" ? undefined : state.metric,
    view: state.breakdown,
    ...updates,
  };
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== "") query.set(key, String(value));
  const serialized = query.toString();
  return `${basePath}${serialized ? `?${serialized}` : ""}${anchor ? `#${anchor}` : ""}`;
}
