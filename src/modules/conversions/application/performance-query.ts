import type { ConversionStatus } from "../domain/order-transitions";
import { performancePeriod } from "../domain/performance-period";
import type {
  PerformanceBreakdownKind,
  PerformanceFilters,
  PerformanceRole,
} from "../ports/performance";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set<ConversionStatus>(["CONFIRMED", "CANCELLED"]);

export type PerformanceMetric = "clicks" | "orders" | "earnings";

export interface PerformancePageState {
  filters: PerformanceFilters;
  metric: PerformanceMetric;
  breakdown: PerformanceBreakdownKind;
}

export type PerformanceSearchParams = Record<
  string,
  string | readonly string[] | undefined
>;

function scalar(value: string | readonly string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function uuid(value: string | undefined): string | undefined {
  return value && UUID.test(value) ? value : undefined;
}

function calendarDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

export function parsePerformanceQuery(
  query: PerformanceSearchParams,
  role: PerformanceRole,
): PerformancePageState {
  const requestedStatus = scalar(query.status);
  const requestedMetric = scalar(query.metric);
  const requestedView = scalar(query.view);
  const status = requestedStatus?.toUpperCase() as ConversionStatus | undefined;
  const metric = ["clicks", "orders", "earnings"].includes(
    requestedMetric ?? "",
  )
    ? (requestedMetric as PerformanceMetric)
    : "clicks";
  const allowedBreakdowns: PerformanceBreakdownKind[] =
    role === "creator"
      ? ["brands", "products", "links"]
      : ["creators", "products", "links"];
  const requestedBreakdown = requestedView as
    PerformanceBreakdownKind | undefined;
  const ledgerQuery = scalar(query.q)?.trim().slice(0, 120);
  const requestedPage = Number(scalar(query.ledgerPage));
  const requestedClickPage = Number(scalar(query.clickPage));
  const requestedBreakdownPage = Number(scalar(query.breakdownPage));
  const brandId = uuid(scalar(query.brand));
  const creatorId = uuid(scalar(query.creator));
  const productId = uuid(scalar(query.product));
  const linkId = uuid(scalar(query.link));
  const from = calendarDate(scalar(query.from));
  const to = calendarDate(scalar(query.to));
  const requestedPeriod = performancePeriod(scalar(query.period));
  const period =
    requestedPeriod === "custom" && (!from || !to || from > to)
      ? "30d"
      : requestedPeriod;
  return {
    filters: {
      period,
      ...(period === "custom" && from && to ? { from, to } : {}),
      ...(role === "creator" && brandId ? { brandId } : {}),
      ...(role === "brand" && creatorId ? { creatorId } : {}),
      ...(productId ? { productId } : {}),
      ...(linkId ? { linkId } : {}),
      ...(status && STATUSES.has(status) ? { status } : {}),
      ...(ledgerQuery ? { ledgerQuery } : {}),
      ...(Number.isInteger(requestedPage) && requestedPage > 0
        ? { ledgerPage: requestedPage }
        : {}),
      ...(Number.isInteger(requestedClickPage) && requestedClickPage > 0
        ? { clickPage: requestedClickPage }
        : {}),
      ...(Number.isInteger(requestedBreakdownPage) && requestedBreakdownPage > 0
        ? { breakdownPage: requestedBreakdownPage }
        : {}),
    },
    metric,
    breakdown: allowedBreakdowns.includes(requestedBreakdown!)
      ? requestedBreakdown!
      : allowedBreakdowns[0]!,
  };
}
