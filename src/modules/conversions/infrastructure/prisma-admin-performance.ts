import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import type {
  AdminPerformanceQuery as Query,
  AdminPerformanceMetrics,
  AdminPerformanceRepository,
  AdminPerformanceRow,
  AdminPerformanceReport,
} from "../ports/admin-performance";
type Tx = Prisma.TransactionClient;
type RawMetrics = {
  clicks: bigint;
  sales_count: bigint;
  sales_value: Prisma.Decimal;
  commission: Prisma.Decimal;
};
type RawRow = RawMetrics & {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  sku: string;
  status: "ACTIVE" | "ARCHIVED";
  total: bigint;
};
const metrics = (r?: RawMetrics): AdminPerformanceMetrics => ({
  clicks: Number(r?.clicks || 0),
  salesCount: Number(r?.sales_count || 0),
  salesValue: r?.sales_value?.toFixed(2) || "0.00",
  commission: r?.commission?.toFixed(2) || "0.00",
});
function bounds(q: Query) {
  return {
    start: new Date(`${q.from}T00:00:00+04:00`),
    end: new Date(new Date(`${q.to}T00:00:00+04:00`).getTime() + 86400000),
  };
}
function source(q: Query, productId?: string) {
  const { start, end } = bounds(q);
  const filter = Prisma.sql`${q.brandId ? Prisma.sql`AND p.brand_id=${q.brandId}::uuid` : Prisma.empty} ${q.creatorId ? Prisma.sql`AND tl.creator_id=${q.creatorId}::uuid` : Prisma.empty} ${q.teamLeadId ? Prisma.sql`AND tl.creator_id IN (SELECT id FROM creator WHERE team_lead_id=${q.teamLeadId}::uuid)` : Prisma.empty} ${productId ? Prisma.sql`AND p.id=${productId}::uuid` : Prisma.empty}
 ${q.tab === "products" && !productId ? Prisma.sql`${q.productStatus !== "ALL" ? Prisma.sql`AND p.status::text=${q.productStatus}` : Prisma.empty} ${q.q ? Prisma.sql`AND (p.title ILIKE ${`%${q.q}%`} OR p.sku ILIKE ${`%${q.q}%`})` : Prisma.empty}` : Prisma.empty}`;
  return Prisma.sql`
 WITH clicks AS (
 SELECT c.id, p.id product_id, p.brand_id, tl.creator_id, c.occurred_at
 FROM click c JOIN tracking_link tl ON tl.id=c.tracking_link_id JOIN product p ON p.id=tl.product_id
 WHERE c.creditable AND c.brand_id=p.brand_id AND c.occurred_at>=${start} AND c.occurred_at<${end} ${filter}
 ), sales AS (
 SELECT a.id, cv.id conversion_id, p.id product_id, p.brand_id, a.creator_id, cv.occurred_at, a.commission_amount commission,
 COALESCE((SELECT SUM(item.commissionable_net) FROM conversion_item item WHERE item.conversion_id=cv.id AND item.sku=p.sku),0) sales_value
 FROM attribution a JOIN conversion_item ci ON ci.id=a.conversion_item_id JOIN conversion cv ON cv.id=ci.conversion_id
 JOIN click c ON c.id=a.click_id JOIN tracking_link tl ON tl.id=c.tracking_link_id JOIN product p ON p.id=a.product_id
 WHERE a.status='CANONICAL' AND cv.status='CONFIRMED' AND tl.product_id=a.product_id AND tl.creator_id=a.creator_id
 AND c.brand_id=cv.brand_id AND p.brand_id=cv.brand_id AND cv.occurred_at>=${start} AND cv.occurred_at<${end} ${filter}
 )`;
}
function rowSource(q: Query, productId?: string) {
  if (productId || q.tab === "creators")
    return Prisma.sql`SELECT cr.id, cr.display_name name FROM creator cr WHERE TRUE ${q.creatorId ? Prisma.sql`AND cr.id=${q.creatorId}::uuid` : Prisma.empty} ${q.teamLeadId ? Prisma.sql`AND cr.team_lead_id=${q.teamLeadId}::uuid` : Prisma.empty} ${productId ? Prisma.sql`AND EXISTS(SELECT 1 FROM tracking_link l WHERE l.creator_id=cr.id AND l.product_id=${productId}::uuid)` : q.brandId ? Prisma.sql`AND EXISTS(SELECT 1 FROM tracking_link l JOIN product p ON p.id=l.product_id WHERE l.creator_id=cr.id AND p.brand_id=${q.brandId}::uuid)` : Prisma.empty}`;
  if (q.tab === "brands")
    return Prisma.sql`SELECT b.id,b.name FROM brand b WHERE TRUE ${q.brandId ? Prisma.sql`AND b.id=${q.brandId}::uuid` : Prisma.empty} ${q.creatorId ? Prisma.sql`AND EXISTS(SELECT 1 FROM product p JOIN tracking_link l ON l.product_id=p.id WHERE p.brand_id=b.id AND l.creator_id=${q.creatorId}::uuid)` : Prisma.empty}`;
  return Prisma.sql`SELECT p.id,p.title name,p.sku,p.status,p.brand_id,b.name brand_name FROM product p JOIN brand b ON b.id=p.brand_id WHERE TRUE
 ${q.brandId ? Prisma.sql`AND p.brand_id=${q.brandId}::uuid` : Prisma.empty}
 ${q.creatorId ? Prisma.sql`AND EXISTS(SELECT 1 FROM tracking_link l WHERE l.product_id=p.id AND l.creator_id=${q.creatorId}::uuid)` : Prisma.empty}
 ${q.productStatus !== "ALL" ? Prisma.sql`AND p.status::text=${q.productStatus}` : Prisma.empty}
 ${q.q ? Prisma.sql`AND (p.title ILIKE ${`%${q.q}%`} OR p.sku ILIKE ${`%${q.q}%`})` : Prisma.empty}`;
}
async function rows(tx: Tx, q: Query, productId?: string, exporting = false) {
  const kind =
    productId || q.tab === "creators"
      ? "creator"
      : q.tab === "brands"
        ? "brand"
        : "product";
  const column =
    kind === "creator"
      ? Prisma.sql`creator_id`
      : kind === "brand"
        ? Prisma.sql`brand_id`
        : Prisma.sql`product_id`;
  const sort = {
    sales_count: Prisma.sql`sales_count`,
    sales_value: Prisma.sql`sales_value`,
    clicks: Prisma.sql`clicks`,
    commission: Prisma.sql`commission`,
    name: Prisma.sql`name`,
  }[q.sort];
  const direction = q.direction === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const values = await tx.$queryRaw<
    RawRow[]
  >(Prisma.sql`${source(q, productId)},
 click_totals AS (SELECT ${column} id,COUNT(*) clicks FROM clicks GROUP BY ${column}),
 sale_totals AS (SELECT ${column} id,COUNT(DISTINCT conversion_id) sales_count,SUM(sales_value) sales_value,SUM(commission) commission FROM sales GROUP BY ${column}),
 report_rows AS (SELECT r.*,COALESCE(c.clicks,0) clicks,COALESCE(s.sales_count,0) sales_count,COALESCE(s.sales_value,0) sales_value,COALESCE(s.commission,0) commission
 FROM (${rowSource(q, productId)}) r LEFT JOIN click_totals c ON c.id=r.id LEFT JOIN sale_totals s ON s.id=r.id)
 SELECT *,COUNT(*) OVER() total FROM report_rows ORDER BY ${sort} ${direction},name ASC,id ASC LIMIT ${exporting ? 10001 : 25} OFFSET ${exporting ? 0 : (q.page - 1) * 25}`);
  let total = Number(values[0]?.total || 0);
  if (!values.length && q.page > 1 && !exporting) {
    const count = await tx.$queryRaw<{ total: bigint }[]>(
      Prisma.sql`SELECT COUNT(*) total FROM (${rowSource(q, productId)}) r`,
    );
    total = Number(count[0]!.total);
  }
  return {
    items: values.map((r): AdminPerformanceRow => ({
      id: r.id,
      name: r.name,
      kind,
      ...metrics(r),
      ...(kind === "product"
        ? {
            brandId: r.brand_id,
            brandName: r.brand_name,
            sku: r.sku,
            status: r.status,
          }
        : {}),
    })),
    page: q.page,
    pageSize: 25 as const,
    total,
  };
}
async function report(
  tx: Tx,
  q: Query,
  productId?: string,
): Promise<AdminPerformanceReport> {
  const days = (Date.parse(q.to) - Date.parse(q.from)) / 86400000 + 1,
    monthly = days > 93;
  const bucket = monthly ? Prisma.sql`'month'` : Prisma.sql`'day'`,
    step = monthly
      ? Prisma.sql`'1 month'::interval`
      : Prisma.sql`'1 day'::interval`;
  const [summary, trend, table] = await Promise.all([
    tx.$queryRaw<RawMetrics[]>(
      Prisma.sql`${source(q, productId)} SELECT (SELECT COUNT(*) FROM clicks) clicks,COUNT(DISTINCT conversion_id) sales_count,COALESCE(SUM(sales_value),0) sales_value,COALESCE(SUM(commission),0) commission FROM sales`,
    ),
    tx.$queryRaw<
      {
        from: string;
        to: string;
        sales_value: Prisma.Decimal;
        commission: Prisma.Decimal;
      }[]
    >(Prisma.sql`${source(q, productId)},
  buckets AS (SELECT generate_series(date_trunc(${bucket},${q.from}::date::timestamp),${q.to}::date::timestamp,${step}) d),
  totals AS (SELECT date_trunc(${bucket},occurred_at AT TIME ZONE 'Asia/Tbilisi') d,SUM(sales_value) sales_value,SUM(commission) commission FROM sales GROUP BY 1)
  SELECT to_char(GREATEST(b.d,${q.from}::date),'YYYY-MM-DD') "from",to_char(LEAST(b.d+${step}-interval '1 day',${q.to}::date),'YYYY-MM-DD') "to",COALESCE(t.sales_value,0) sales_value,COALESCE(t.commission,0) commission FROM buckets b LEFT JOIN totals t ON t.d=b.d ORDER BY b.d`),
    q.tab === "overview" && !productId
      ? Promise.resolve({
          items: [],
          page: q.page,
          pageSize: 25 as const,
          total: 0,
        })
      : rows(tx, q, productId),
  ]);
  return {
    query: q,
    totals: metrics(summary[0]),
    trend: trend.map((r) => ({
      from: r.from,
      to: r.to,
      salesValue: r.sales_value.toFixed(2),
      commission: r.commission.toFixed(2),
    })),
    rows: table,
  };
}
export const prismaAdminPerformance: AdminPerformanceRepository = {
  report: (q) =>
    prisma.$transaction((tx) => report(tx, q), {
      isolationLevel: "RepeatableRead",
      timeout: 20000,
    }),
  productReport: (id, q) =>
    prisma.$transaction(
      async (tx) => {
        const p = await tx.product.findUnique({
          where: { id },
          include: { brand: { select: { name: true } } },
        });
        if (!p) return undefined;
        return {
          ...(await report(tx, q, id)),
          product: {
            id: p.id,
            title: p.title,
            sku: p.sku,
            brandId: p.brandId,
            brandName: p.brand.name,
            status: p.status,
          },
        };
      },
      { isolationLevel: "RepeatableRead", timeout: 20000 },
    ),
  exportRows: (scope, q, id) =>
    prisma.$transaction(
      async (tx) => {
        const result = await rows(
          tx,
          { ...q, tab: scope === "product_creators" ? "products" : scope },
          id,
          true,
        );
        return { rows: result.items, total: result.total, limit: 10000 };
      },
      { isolationLevel: "RepeatableRead", timeout: 20000 },
    ),
  async options() {
    const [brands, creators] = await Promise.all([
      prisma.brand.findMany({
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      prisma.creator.findMany({
        select: { id: true, displayName: true },
        orderBy: [{ displayName: "asc" }, { id: "asc" }],
      }),
    ]);
    return {
      brands,
      creators: creators.map((c) => ({ id: c.id, name: c.displayName })),
    };
  },
};
