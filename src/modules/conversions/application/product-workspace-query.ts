import { isProductType } from "@/src/modules/catalog";
import {
  parsePerformanceQuery,
  type PerformanceSearchParams,
} from "./performance-query";

export function productWorkspaceQuery(raw: PerformanceSearchParams) {
  const value = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string) : "";
  const choice = (key: string, choices: string[], fallback = "") =>
    choices.includes(value(key)) ? value(key) : fallback;
  const page = (key: string) =>
    Math.min(100000, Math.max(1, Math.floor(Number(value(key)) || 1)));
  return {
    q: value("q").trim().slice(0, 120),
    status: choice("status", ["ACTIVE", "ARCHIVED"]),
    type: isProductType(value("type")) ? value("type") : "",
    rate: choice("rate", ["PERCENT", "FIXED"]),
    coverage: choice("coverage", ["active", "none", "disabled"]),
    sort: choice(
      "sort",
      ["newest", "sales", "value", "creators", "title"],
      "newest",
    ),
    page: page("page"),
    cq: value("cq").trim().slice(0, 120),
    cs: choice("cs", ["ACTIVE", "DISABLED"]),
    csort: choice("csort", ["sales", "commission", "name", "recent"], "sales"),
    cp: page("cp"),
    period: parsePerformanceQuery(raw, "brand").filters.period,
    from: parsePerformanceQuery(raw, "brand").filters.from ?? "",
    to: parsePerformanceQuery(raw, "brand").filters.to ?? "",
  };
}
export type ProductWorkspaceQuery = ReturnType<typeof productWorkspaceQuery>;

export function catalogueReturnPath(locale: string, value?: string) {
  const base = `/${locale}/brand/products`;
  // No arbitrary redirects, fragments, or external URLs.
  return value === base || value?.startsWith(base + "?") ? value : base;
}
