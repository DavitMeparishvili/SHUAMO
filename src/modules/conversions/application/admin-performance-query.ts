import { z } from "zod";
import { err, ok } from "@/src/modules/shared";
import type { AdminPerformanceQuery } from "../ports/admin-performance";
const date = z
  .string()
  .regex(/^(?!0000)\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  });
export function parseAdminPerformanceQuery(
  params: Record<string, string | string[] | undefined>,
  now = new Date(),
) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const schema = z.object({
    tab: z
      .enum(["overview", "brands", "creators", "products"])
      .default("overview"),
    from: date.default(`${today.slice(0, 7)}-01`),
    to: date.default(today),
    brandId: z.uuid().optional(),
    creatorId: z.uuid().optional(),
    productStatus: z.enum(["ALL", "ACTIVE", "ARCHIVED"]).default("ALL"),
    q: z.string().trim().max(120).default(""),
    sort: z
      .enum(["sales_count", "sales_value", "clicks", "commission", "name"])
      .default("sales_value"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    page: z
      .string()
      .regex(/^[1-9]\d*$/)
      .transform(Number)
      .refine(Number.isSafeInteger)
      .default(1),
  });
  const cleaned = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [
      k,
      v === "" && ["brandId", "creatorId"].includes(k) ? undefined : v,
    ]),
  );
  const parsed = schema.safeParse(cleaned);
  if (
    !parsed.success ||
    parsed.data.from > parsed.data.to ||
    (parsed.data.page - 1) * 25 > Number.MAX_SAFE_INTEGER
  )
    return err("invalid_input" as const);
  return ok(parsed.data satisfies AdminPerformanceQuery);
}
export function adminPerformanceParams(
  query: AdminPerformanceQuery,
  overrides: Record<string, string | undefined> = {},
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...overrides }))
    if (value !== undefined && value !== "") params.set(key, String(value));
  return params;
}
