import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import type { ProductWorkspaceQuery } from "../application/product-workspace-query";
import { linkActivityCtes } from "./prisma-performance-repository";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const literalSearch = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;
export const WORKSPACE_PAGE_SIZE = 10;
export type WorkspaceMetrics = {
  clicks: number;
  confirmedSales: number;
  sales: string;
  commission: string;
};
export type ProductSummary = {
  id: string;
  title: string;
  sku: string;
  image: string | null;
  status: "ACTIVE" | "ARCHIVED";
  price: string;
  rateType: "PERCENT" | "FIXED";
  rate: string;
  creators: number;
  links: number;
  active: number;
  confirmedSales: number;
  sales: string;
};
type RawSummary = Omit<ProductSummary, "price" | "rate" | "sales"> & {
  price: Prisma.Decimal;
  rate: Prisma.Decimal;
  sales: Prisma.Decimal;
};
export type ProductCatalogueData = {
  metricsUnavailable: boolean;
  items: ProductSummary[];
  total: number;
  page: number;
  pageCount: number;
  facets: { all: number; active: number; none: number; disabled: number };
  rateTypes: string[];
};

/** Uses exactly the same sale-date cohort and canonical attribution CTE as Performance. */
export async function brandProductCatalogue(
  brandId: string,
  query: ProductWorkspaceQuery,
  now = new Date(),
): Promise<ProductCatalogueData> {
  try {
    return await loadProductCatalogue(brandId, query, now, true);
  } catch {
    return loadProductCatalogue(brandId, query, now, false);
  }
}

async function loadProductCatalogue(
  brandId: string,
  query: ProductWorkspaceQuery,
  now: Date,
  activity: boolean,
): Promise<ProductCatalogueData> {
  const where = Prisma.sql`p.brand_id = CAST(${brandId} AS uuid)
    ${query.q ? Prisma.sql`AND (p.title ILIKE ${literalSearch(query.q)} OR p.sku ILIKE ${literalSearch(query.q)})` : Prisma.empty}
    ${query.status ? Prisma.sql`AND p.status::text = ${query.status}` : Prisma.empty}
    ${query.type ? Prisma.sql`AND p.product_type::text = ${query.type}` : Prisma.empty}
    ${query.rate ? Prisma.sql`AND p.commission_type::text = ${query.rate}` : Prisma.empty}`;
  const ctes = Prisma.sql`${activity ? linkActivityCtes({ role: "brand", id: brandId }, { period: query.period, ...(query.from ? { from: query.from, to: query.to } : {}) }, now) : Prisma.sql`WITH unused AS (SELECT 1)`},
    summaries AS (
      SELECT p.id::text AS id, p.title, p.sku, p.image_urls[1] AS image, p.status,
        p.price_gel AS price, p.commission_type AS "rateType", p.commission_value AS rate, p.created_at,
        COUNT(DISTINCT tl.creator_id)::int AS creators, COUNT(tl.id)::int AS links,
        COUNT(tl.id) FILTER (WHERE tl.status::text='ACTIVE')::int AS active,
        ${activity ? Prisma.sql`COALESCE(SUM(oc.confirmed_sales), 0)::int` : Prisma.sql`0::int`} AS "confirmedSales",
        ${activity ? Prisma.sql`COALESCE(SUM(oc.sales), 0)` : Prisma.sql`0::numeric`} AS sales
      FROM product p LEFT JOIN tracking_link tl ON tl.product_id=p.id
      ${activity ? Prisma.sql`LEFT JOIN outcome_counts oc ON oc.tracking_link_id=tl.id` : Prisma.empty}
      WHERE ${where} GROUP BY p.id
    )`;
  const coverage =
    query.coverage === "active"
      ? Prisma.sql`active > 0`
      : query.coverage === "none"
        ? Prisma.sql`links = 0`
        : query.coverage === "disabled"
          ? Prisma.sql`links > 0 AND active = 0`
          : Prisma.sql`TRUE`;
  const order =
    query.sort === "sales"
      ? Prisma.sql`"confirmedSales" DESC, id`
      : query.sort === "value"
        ? Prisma.sql`sales DESC, id`
        : query.sort === "creators"
          ? Prisma.sql`creators DESC, id`
          : query.sort === "title"
            ? Prisma.sql`title ASC, id`
            : Prisma.sql`created_at DESC, id`;
  const [counts, rateTypes] = await Promise.all([
    prisma.$queryRaw<
      {
        all: number;
        active: number;
        none: number;
        disabled: number;
        total: number;
      }[]
    >(Prisma.sql`
      ${ctes} SELECT COUNT(*)::int AS all,
        COUNT(*) FILTER (WHERE active > 0)::int AS active,
        COUNT(*) FILTER (WHERE links = 0)::int AS none,
        COUNT(*) FILTER (WHERE links > 0 AND active = 0)::int AS disabled,
        COUNT(*) FILTER (WHERE ${coverage})::int AS total FROM summaries`),
    prisma.product.findMany({
      where: { brandId },
      distinct: ["commissionType"],
      select: { commissionType: true },
    }),
  ]);
  const count = counts[0]!;
  const pageCount = Math.max(1, Math.ceil(count.total / WORKSPACE_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const rows = await prisma.$queryRaw<RawSummary[]>(Prisma.sql`
    ${ctes} SELECT * FROM summaries WHERE ${coverage} ORDER BY ${order}
    LIMIT ${WORKSPACE_PAGE_SIZE} OFFSET ${(page - 1) * WORKSPACE_PAGE_SIZE}`);
  return {
    metricsUnavailable: !activity,
    items: rows.map((r) => ({
      ...r,
      price: r.price.toFixed(2),
      rate: r.rate.toString(),
      sales: r.sales.toFixed(2),
    })),
    total: count.total,
    page,
    pageCount,
    facets: count,
    rateTypes: rateTypes.map((r) => r.commissionType),
  };
}

export type ProductLinkRow = WorkspaceMetrics & {
  id: string;
  code: string;
  status: "ACTIVE" | "DISABLED";
  rateType: "PERCENT" | "FIXED";
  rate: string;
  acceptedAt: string;
  terms: Record<string, unknown>;
  restoreReason: string | null;
};
export type CreatorLinkGroup = WorkspaceMetrics & {
  id: string;
  name: string;
  avatar: string | null;
  profileSlug: string | null;
  totalLinks: number;
  matchingLinks: number;
  recent: string;
  links: ProductLinkRow[];
  linkPage: number;
  linkPageCount: number;
};
export type ProductCreatorsData = {
  product: ProductSummary;
  metrics: WorkspaceMetrics | null;
  metricsUnavailable: boolean;
  groups: CreatorLinkGroup[];
  totalGroups: number;
  matchingLinks: number;
  page: number;
  pageCount: number;
};
export async function brandProductCreators(
  brandId: string,
  productId: string,
  query: ProductWorkspaceQuery,
  now = new Date(),
  child?: { creatorId: string; page: number },
): Promise<ProductCreatorsData | null> {
  try {
    return await loadProductCreators(
      brandId,
      productId,
      query,
      now,
      child,
      true,
    );
  } catch {
    return loadProductCreators(brandId, productId, query, now, child, false);
  }
}

async function loadProductCreators(
  brandId: string,
  productId: string,
  query: ProductWorkspaceQuery,
  now: Date,
  child: { creatorId: string; page: number } | undefined,
  activity: boolean,
): Promise<ProductCreatorsData | null> {
  if (!UUID.test(productId)) return null;
  const product = await prisma.product.findFirst({
    where: { id: productId, brandId },
    include: { brand: { select: { status: true } } },
  });
  if (!product) return null;
  const [totals] = await prisma.$queryRaw<
    { creators: number; links: number; active: number }[]
  >(Prisma.sql`
    SELECT COUNT(DISTINCT creator_id)::int AS creators, COUNT(*)::int AS links,
      COUNT(*) FILTER (WHERE status::text='ACTIVE')::int AS active
    FROM tracking_link WHERE product_id=CAST(${productId} AS uuid)`);
  const filters = {
    period: query.period,
    ...(query.from ? { from: query.from, to: query.to } : {}),
    productId,
  };
  function ctes(activity: boolean) {
    return Prisma.sql`${activity ? linkActivityCtes({ role: "brand", id: brandId }, filters, now) : Prisma.sql`WITH unused AS (SELECT 1)`},
      filtered AS (
        SELECT tl.*, cr.display_name AS name,
          ${activity ? Prisma.sql`COALESCE(cc.clicks,0)::int` : Prisma.sql`0`} AS clicks,
          ${activity ? Prisma.sql`COALESCE(oc.confirmed_sales,0)::int` : Prisma.sql`0`} AS confirmed_sales,
          ${activity ? Prisma.sql`COALESCE(oc.sales,0)` : Prisma.sql`0::numeric`} AS sales,
          ${activity ? Prisma.sql`COALESCE(oc.confirmed,0)` : Prisma.sql`0::numeric`} AS commission
        FROM tracking_link tl JOIN creator cr ON cr.id=tl.creator_id
        ${activity ? Prisma.sql`LEFT JOIN click_counts cc ON cc.tracking_link_id=tl.id LEFT JOIN outcome_counts oc ON oc.tracking_link_id=tl.id` : Prisma.empty}
        WHERE tl.product_id=CAST(${productId} AS uuid)
          ${query.cs ? Prisma.sql`AND tl.status::text=${query.cs}` : Prisma.empty}
          ${query.cq ? Prisma.sql`AND (cr.display_name ILIKE ${literalSearch(query.cq)} OR tl.code ILIKE ${literalSearch(query.cq)})` : Prisma.empty}
      ), groups AS (
        SELECT creator_id AS id, MAX(name) AS name, COUNT(*)::int AS "matchingLinks", MAX(created_at) AS recent,
          SUM(clicks)::int AS clicks, SUM(confirmed_sales)::int AS "confirmedSales", SUM(sales) AS sales, SUM(commission) AS commission
        FROM filtered GROUP BY creator_id
      )`;
  }
  type RawGroup = {
    id: string;
    name: string;
    matchingLinks: number;
    recent: Date;
    clicks: number;
    confirmedSales: number;
    sales: Prisma.Decimal;
    commission: Prisma.Decimal;
  };
  type Summary = {
    totalGroups: number;
    matchingLinks: number;
    clicks: number;
    confirmedSales: number;
    sales: Prisma.Decimal;
    commission: Prisma.Decimal;
  }[];
  const root = ctes(activity);
  const summary = await prisma.$queryRaw<Summary>(Prisma.sql`${root}
    SELECT COUNT(*)::int AS "totalGroups", COALESCE(SUM("matchingLinks"),0)::int AS "matchingLinks",
      COALESCE(SUM(clicks),0)::int AS clicks, COALESCE(SUM("confirmedSales"),0)::int AS "confirmedSales",
      COALESCE(SUM(sales),0) AS sales, COALESCE(SUM(commission),0) AS commission FROM groups`);
  const totalsRow = summary[0]!;
  const pageCount = Math.max(
    1,
    Math.ceil(totalsRow.totalGroups / WORKSPACE_PAGE_SIZE),
  );
  const page = Math.min(query.cp, pageCount);
  const order =
    query.csort === "name"
      ? Prisma.sql`name ASC, id`
      : query.csort === "recent"
        ? Prisma.sql`recent DESC, id`
        : query.csort === "commission"
          ? Prisma.sql`commission DESC, id`
          : Prisma.sql`"confirmedSales" DESC, id`;
  if (child && !UUID.test(child.creatorId)) return null;
  const rawGroups = await prisma.$queryRaw<RawGroup[]>(Prisma.sql`${root}
    SELECT * FROM groups ${child ? Prisma.sql`WHERE id=CAST(${child.creatorId} AS uuid)` : Prisma.empty}
    ORDER BY ${order} LIMIT ${WORKSPACE_PAGE_SIZE} OFFSET ${child ? 0 : (page - 1) * WORKSPACE_PAGE_SIZE}`);
  const ids = rawGroups.map((g) => g.id);
  const creators = ids.length
    ? await prisma.creator.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          status: true,
          profile: { select: { status: true, slug: true, heroImageUrl: true } },
          partnerships: { where: { brandId }, select: { status: true } },
          _count: { select: { links: { where: { productId } } } },
        },
      })
    : [];
  const activeLinks = ids.length
    ? await prisma.trackingLink.findMany({
        where: { productId, creatorId: { in: ids }, status: "ACTIVE" },
        select: { creatorId: true },
      })
    : [];
  const activeCreators = new Set(activeLinks.map((l) => l.creatorId));
  type RawChild = {
    id: string;
    creator_id: string;
    code: string;
    status: "ACTIVE" | "DISABLED";
    commission_type: "PERCENT" | "FIXED";
    commission_value: Prisma.Decimal;
    accepted_terms: Record<string, unknown>;
    terms_accepted_at: Date;
    clicks: number;
    confirmed_sales: number;
    sales: Prisma.Decimal;
    commission: Prisma.Decimal;
  };
  const linkPage = child
    ? Math.min(
        Math.max(1, child.page),
        Math.max(
          1,
          Math.ceil((rawGroups[0]?.matchingLinks ?? 0) / WORKSPACE_PAGE_SIZE),
        ),
      )
    : 1;
  const rawLinks = ids.length
    ? await prisma.$queryRaw<RawChild[]>(Prisma.sql`${root}, numbered AS (
      SELECT filtered.*, ROW_NUMBER() OVER (PARTITION BY creator_id ORDER BY created_at DESC, id ASC) AS rn
      FROM filtered WHERE creator_id IN (${Prisma.join(ids.map((id) => Prisma.sql`CAST(${id} AS uuid)`))})
    ) SELECT * FROM numbered WHERE rn > ${(linkPage - 1) * WORKSPACE_PAGE_SIZE} AND rn <= ${linkPage * WORKSPACE_PAGE_SIZE}
    ORDER BY creator_id, rn`)
    : [];
  const groups = rawGroups.map((g): CreatorLinkGroup => {
    const creator = creators.find((c) => c.id === g.id)!;
    const published =
      creator.status === "APPROVED" && creator.profile?.status === "PUBLISHED";
    const restoreReason =
      product.brand.status !== "APPROVED"
        ? "brand_not_approved"
        : product.status !== "ACTIVE"
          ? "product_archived"
          : creator.status !== "APPROVED"
            ? "creator_not_approved"
            : creator.partnerships[0]?.status !== "APPROVED"
              ? "partnership_not_approved"
              : activeCreators.has(g.id)
                ? "active_link_exists"
                : null;
    return {
      id: g.id,
      name: g.name,
      recent: g.recent.toISOString(),
      matchingLinks: g.matchingLinks,
      totalLinks: creator._count.links,
      avatar: published ? creator.profile?.heroImageUrl || null : null,
      profileSlug: published ? (creator.profile?.slug ?? null) : null,
      clicks: g.clicks,
      confirmedSales: g.confirmedSales,
      sales: g.sales.toFixed(2),
      commission: g.commission.toFixed(2),
      linkPage,
      linkPageCount: Math.max(
        1,
        Math.ceil(g.matchingLinks / WORKSPACE_PAGE_SIZE),
      ),
      links: rawLinks
        .filter((l) => l.creator_id === g.id)
        .map((l) => ({
          id: l.id,
          code: l.code,
          status: l.status,
          rateType: l.commission_type,
          rate: l.commission_value.toString(),
          terms:
            l.accepted_terms &&
            typeof l.accepted_terms === "object" &&
            !Array.isArray(l.accepted_terms)
              ? l.accepted_terms
              : {},
          acceptedAt: l.terms_accepted_at.toISOString(),
          restoreReason,
          clicks: l.clicks,
          confirmedSales: l.confirmed_sales,
          sales: l.sales.toFixed(2),
          commission: l.commission.toFixed(2),
        })),
    };
  });
  return {
    product: {
      id: product.id,
      title: product.title,
      sku: product.sku,
      image: product.imageUrls[0] ?? null,
      status: product.status,
      price: product.priceGel.toFixed(2),
      rateType: product.commissionType,
      rate: product.commissionValue.toString(),
      ...totals!,
      confirmedSales: 0,
      sales: "0.00",
    },
    metrics: activity
      ? {
          clicks: totalsRow.clicks,
          confirmedSales: totalsRow.confirmedSales,
          sales: totalsRow.sales.toFixed(2),
          commission: totalsRow.commission.toFixed(2),
        }
      : null,
    metricsUnavailable: !activity,
    groups,
    totalGroups: totalsRow.totalGroups,
    matchingLinks: totalsRow.matchingLinks,
    page,
    pageCount,
  };
}
