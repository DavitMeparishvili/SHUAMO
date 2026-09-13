import { it, expect } from "vitest";
import {
  parseAdminPerformanceQuery,
  adminPerformanceParams,
} from "./admin-performance-query";
it("defaults to current month in Tbilisi", () => {
  const result = parseAdminPerformanceQuery(
    {},
    new Date("2026-09-30T21:00:00Z"),
  );
  expect(result.ok && result.value).toMatchObject({
    from: "2026-10-01",
    to: "2026-10-01",
    page: 1,
    tab: "overview",
    productStatus: "ALL",
    sort: "sales_value",
    direction: "desc",
  });
});
it.each([
  { from: "2026-02-30" },
  { from: "2026-10-01", to: "2026-09-01" },
  { brandId: "bad" },
  { creatorId: [crypto.randomUUID(), crypto.randomUUID()] },
  { sort: "DROP TABLE" },
  { page: "1.2" },
  { page: "0" },
  { page: "99999999999999999" },
  { productStatus: "PENDING" },
])("rejects invalid scopes without broadening %j", (q) =>
  expect(parseAdminPerformanceQuery(q).ok).toBe(false),
);
it("retains normalized filters in navigation", () => {
  const result = parseAdminPerformanceQuery({
    brandId: crypto.randomUUID(),
    q: "  name  ",
    page: "2",
  });
  if (!result.ok) throw new Error("invalid fixture");
  const params = adminPerformanceParams(result.value, {
    scope: "products",
    page: undefined,
  });
  expect(params.has("page")).toBe(false);
  expect(params.get("q")).toBe("name");
  expect(params.get("brandId")).toBe(result.value.brandId);
});
