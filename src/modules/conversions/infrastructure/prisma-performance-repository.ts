import Decimal from "decimal.js";
import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import {
  performancePeriodStart,
  performanceTrendStart,
} from "../domain/performance-period";
import type {
  ClickLedgerRow,
  EarningsLedgerRow,
  LinkPerformanceRow,
  PerformanceBreakdownRow,
  PerformanceFilters,
  PerformanceReport,
  PerformanceRole,
  PerformanceTotals,
  PerformanceTrendPoint,
  SaleDetail,
} from "../ports/performance";

type Owner = { role: PerformanceRole; id: string };

async function loadContext(owner: Owner) {
  const where =
    owner.role === "brand" ? { brandId: owner.id } : { creatorId: owner.id };
  const [partnerships, profile] = await Promise.all([
    prisma.partnership.findMany({
      where,
      select: { brandId: true, creatorId: true, status: true },
    }),
    owner.role === "brand"
      ? prisma.brandProfile.findUnique({
          where: { brandId: owner.id },
          select: { status: true },
        })
      : prisma.creatorProfile.findUnique({
          where: { creatorId: owner.id },
          select: { status: true },
        }),
  ]);
  const approved = partnerships.filter((p) => p.status === "APPROVED");
  const links = approved.length
    ? await prisma.trackingLink.findMany({
        where: {
          OR: approved.map((p) => ({
            creatorId: p.creatorId,
            product: { brandId: p.brandId },
          })),
        },
        select: {
          creatorId: true,
          product: { select: { brandId: true } },
          clicks: {
            where: {
              attributions: {
                some: {
                  status: "CANONICAL",
                  conversionItem: { conversion: { status: "CONFIRMED" } },
                },
              },
            },
            take: 1,
            select: { id: true },
          },
        },
      })
    : [];
  const key = (l: (typeof links)[number]) =>
    owner.role === "brand" ? l.creatorId : l.product.brandId;
  return {
    approved: approved.length,
    pending: partnerships.filter((p) => p.status === "PENDING").length,
    withLink: new Set(links.map(key)).size,
    withSale: new Set(links.filter((l) => l.clicks.length).map(key)).size,
    profilePublished: profile?.status === "PUBLISHED",
  };
}

async function loadSale(
  owner: Owner,
  id: string,
): Promise<SaleDetail | undefined> {
  const row = await prisma.attribution.findFirst({
    where: {
      id,
      status: "CANONICAL",
      ...(owner.role === "creator"
        ? { creatorId: owner.id }
        : { conversionItem: { conversion: { brandId: owner.id } } }),
    },
    include: {
      creator: true,
      product: { include: { brand: true } },
      click: { include: { trackingLink: true } },
      conversionItem: { include: { conversion: { include: { items: true } } } },
    },
  });
  if (!row?.click) return undefined;
  const cv = row.conversionItem.conversion;
  const link = row.click.trackingLink;
  const cancellation =
    cv.status === "CANCELLED"
      ? await prisma.auditEvent.findFirst({
          where: {
            entityType: "conversion",
            entityId: cv.id,
            action: "conversion.cancelled",
          },
          orderBy: { at: "asc" },
        })
      : null;
  const terms =
    typeof link.acceptedTerms === "object" &&
    link.acceptedTerms !== null &&
    !Array.isArray(link.acceptedTerms)
      ? (link.acceptedTerms as Record<string, unknown>)
      : {};
  const items = cv.items.filter((i) => i.sku === row.product.sku);
  return {
    id: row.id,
    orderId: cv.orderId,
    occurredAt: cv.occurredAt.toISOString(),
    confirmedAt: cv.confirmedAt.toISOString(),
    status: cv.status,
    ...(cancellation ? { cancelledAt: cancellation.at.toISOString() } : {}),
    clickAt: row.click.occurredAt.toISOString(),
    brandId: row.product.brandId,
    brandName: row.product.brand.name,
    creatorId: row.creatorId,
    creatorName: row.creator.displayName,
    productId: row.productId,
    productTitle: row.product.title,
    ...(row.product.imageUrls[0] ? { imageUrl: row.product.imageUrls[0] } : {}),
    sku: row.product.sku,
    linkId: link.id,
    linkCode: link.code,
    clickId: row.click.id,
    quantity: items.reduce((s, i) => s + i.qty, 0),
    commissionableNet: items
      .reduce((s, i) => s.plus(i.commissionableNet.toString()), new Decimal(0))
      .toFixed(2),
    commissionAmount: row.commissionAmount.toFixed(2),
    commissionType: link.commissionType,
    commissionValue: link.commissionValue.toString(),
    termsAcceptedAt: link.termsAcceptedAt.toISOString(),
    acceptedTerms: terms,
    ...(typeof terms.termsVersion === "number"
      ? { termsVersion: terms.termsVersion }
      : {}),
    ...(typeof terms.cookieWindowDays === "number"
      ? { cookieWindowDays: terms.cookieWindowDays }
      : {}),
  };
}
type ReportWindow = { start?: Date; end: Date };

async function loadActivity(
  owner: Owner,
  filters: PerformanceFilters,
  now: Date,
): Promise<NonNullable<PerformanceReport["activity"]>> {
  const { start, end } = reportWindow(filters, now);
  const rows = await prisma.$queryRaw<
    {
      sale_id: string;
      product_title: string;
      partner_name: string;
      at: Date;
      amount: Prisma.Decimal;
      kind: "issued" | "reversed";
    }[]
  >(Prisma.sql`
    SELECT a.id::text AS sale_id, p.title AS product_title,
      ${owner.role === "creator" ? Prisma.sql`b.name` : Prisma.sql`cr.display_name`} AS partner_name,
      activity.at, a.commission_amount AS amount, activity.kind
    FROM attribution a
    JOIN click c ON c.id=a.click_id
    JOIN tracking_link tl ON tl.id=c.tracking_link_id
    JOIN product p ON p.id=tl.product_id
    JOIN brand b ON b.id=p.brand_id
    JOIN creator cr ON cr.id=a.creator_id
    JOIN conversion_item ci ON ci.id=a.conversion_item_id
    JOIN conversion cv ON cv.id=ci.conversion_id
    CROSS JOIN LATERAL (
      SELECT cv.confirmed_at AS at, 'issued'::text AS kind
      UNION ALL
      SELECT MIN(audit.at), 'reversed'::text FROM audit_event audit
      WHERE audit.entity_type='conversion' AND audit.entity_id=cv.id AND audit.action='conversion.cancelled' AND cv.status::text='CANCELLED'
      HAVING COUNT(*) > 0
    ) activity
    WHERE a.status::text='CANONICAL' AND ${sourceConditions(owner, filters)} ${outcomeOwnerCondition(owner)}
      ${dateCondition(Prisma.sql`activity.at`, start, end)}
    ORDER BY activity.at DESC, a.id DESC LIMIT 5
  `);
  return rows.map((row) => ({
    saleId: row.sale_id,
    productTitle: row.product_title,
    partnerName: row.partner_name,
    at: row.at.toISOString(),
    amount: moneyOf(row.amount),
    kind: row.kind,
  }));
}

type RawLinkRow = {
  id: string;
  code: string;
  status: "ACTIVE" | "DISABLED";
  product_id: string;
  product_title: string;
  product_sku: string;
  image_url: string | null;
  brand_id: string;
  brand_name: string;
  creator_id: string;
  creator_name: string;
  clicks: number | bigint;
  converted_clicks: number | bigint;
  confirmed_sales: number | bigint;
  cancelled_sales: number | bigint;
  orders: number | bigint;
  units: number | bigint;
  sales: Prisma.Decimal | string;
  confirmed: Prisma.Decimal | string;
  cancelled: Prisma.Decimal | string;
};

type RawTrendRow = {
  sales: Prisma.Decimal | string;
  day: string;
  clicks: number | bigint;
  orders: number | bigint;
  earnings: Prisma.Decimal | string;
};

type RawLedgerRow = {
  id: string;
  order_id: string;
  occurred_at: Date;
  status: "CONFIRMED" | "CANCELLED";
  brand_id: string;
  brand_name: string;
  creator_id: string;
  creator_name: string;
  product_id: string;
  product_title: string;
  sku: string;
  link_id: string;
  link_code: string;
  click_id: string;
  quantity: number;
  commissionable_net: Prisma.Decimal | string;
  commission_amount: Prisma.Decimal | string;
  total_rows: number | bigint;
};

type RawClickLedgerRow = {
  id: string;
  occurred_at: Date;
  creditable: boolean;
  brand_name: string;
  creator_name: string;
  product_title: string;
  link_code: string;
  order_ids: string;
  total_rows: number | bigint;
};

type RawFilterOption = { id: string; label: string };
type RawScope = {
  brands: number | bigint;
  creators: number | bigint;
  products: number | bigint;
  links: number | bigint;
};

const ZERO_TOTALS: PerformanceTotals = {
  clicks: 0,
  convertedClicks: 0,
  orders: 0,
  confirmedSales: 0,
  cancelledSales: 0,
  units: 0,
  convertedClickRate: 0,
  sales: "0.00",
  confirmed: "0.00",
  cancelled: "0.00",
};

function numberOf(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

function moneyOf(value: Prisma.Decimal | string): string {
  return new Decimal(value.toString()).toFixed(2);
}

function rateOf(convertedClicks: number, clicks: number): number {
  return clicks === 0 ? 0 : convertedClicks / clicks;
}

function ownerCondition(owner: Owner): Prisma.Sql {
  return owner.role === "creator"
    ? Prisma.sql`tl.creator_id = CAST(${owner.id} AS uuid)`
    : Prisma.sql`p.brand_id = CAST(${owner.id} AS uuid)`;
}

function sourceConditions(
  owner: Owner,
  filters: PerformanceFilters,
  linkIds?: readonly string[],
): Prisma.Sql {
  return Prisma.sql`
    ${ownerCondition(owner)}
    ${filters.brandId ? Prisma.sql`AND p.brand_id = CAST(${filters.brandId} AS uuid)` : Prisma.empty}
    ${filters.creatorId ? Prisma.sql`AND tl.creator_id = CAST(${filters.creatorId} AS uuid)` : Prisma.empty}
    ${filters.productId ? Prisma.sql`AND p.id = CAST(${filters.productId} AS uuid)` : Prisma.empty}
    ${filters.linkStatus ? Prisma.sql`AND (tl.status::text = 'ACTIVE' AND p.status::text = 'ACTIVE' AND EXISTS(SELECT 1 FROM brand eligibility_brand WHERE eligibility_brand.id=p.brand_id AND eligibility_brand.status::text='APPROVED') AND EXISTS(SELECT 1 FROM partnership eligibility_partnership WHERE eligibility_partnership.brand_id=p.brand_id AND eligibility_partnership.creator_id=tl.creator_id AND eligibility_partnership.status::text='APPROVED')) = ${filters.linkStatus === "ACTIVE"}` : Prisma.empty}
    ${filters.linkId ? Prisma.sql`AND tl.id = CAST(${filters.linkId} AS uuid)` : Prisma.empty}
    ${linkIds?.length ? Prisma.sql`AND tl.id IN (${Prisma.join(linkIds.map((id) => Prisma.sql`CAST(${id} AS uuid)`))})` : Prisma.empty}
  `;
}

function dateCondition(column: Prisma.Sql, start: Date | undefined, end: Date) {
  return Prisma.sql`
    ${start ? Prisma.sql`AND ${column} >= ${start}` : Prisma.empty}
    AND ${column} <= ${end}
  `;
}

function outcomeStatusCondition(filters: PerformanceFilters) {
  return filters.status
    ? Prisma.sql`AND cv.status::text = ${filters.status}`
    : Prisma.empty;
}

function outcomeOwnerCondition(owner: Owner): Prisma.Sql {
  return owner.role === "creator"
    ? Prisma.sql`AND a.creator_id = CAST(${owner.id} AS uuid)`
    : Prisma.sql`AND cv.brand_id = CAST(${owner.id} AS uuid)`;
}

function ledgerSearchCondition(filters: PerformanceFilters) {
  const query = filters.ledgerQuery;
  if (!query) return Prisma.empty;
  return Prisma.sql`AND (
    cv.order_id ILIKE ${`%${query}%`}
    OR p.sku ILIKE ${`%${query}%`}
    OR p.title ILIKE ${`%${query}%`}
    OR b.name ILIKE ${`%${query}%`}
    OR cr.display_name ILIKE ${`%${query}%`}
    OR tl.code ILIKE ${`%${query}%`}
    OR a.click_id ILIKE ${`%${query}%`}
  )`;
}

function reportWindow(filters: PerformanceFilters, now: Date): ReportWindow {
  if (filters.period !== "custom" || !filters.from || !filters.to)
    return (() => {
      const start = performancePeriodStart(filters.period, now);
      return { ...(start ? { start } : {}), end: now };
    })();

  const customStart = new Date(`${filters.from}T00:00:00.000+04:00`);
  const requestedEnd = new Date(`${filters.to}T23:59:59.999+04:00`);
  return {
    start: customStart,
    end: requestedEnd < now ? requestedEnd : now,
  };
}

function previousWindow(window: ReportWindow): ReportWindow | undefined {
  if (!window.start || window.start > window.end) return undefined;
  const duration = window.end.getTime() - window.start.getTime();
  if (window.start.getTime() - duration < 0) return undefined;
  return {
    start: new Date(window.start.getTime() - duration),
    end: new Date(window.start.getTime() - 1),
  };
}

async function loadLinkRows(
  owner: Owner,
  filters: PerformanceFilters,
  now: Date,
  linkIds?: readonly string[],
  requestedWindow?: ReportWindow,
): Promise<LinkPerformanceRow[]> {
  const { start, end } = requestedWindow ?? reportWindow(filters, now);
  const rows = await prisma.$queryRaw<RawLinkRow[]>(Prisma.sql`
    WITH click_counts AS (
      SELECT c.tracking_link_id, COUNT(*)::int AS clicks
      FROM click c
      JOIN tracking_link tl ON tl.id = c.tracking_link_id
      JOIN product p ON p.id = tl.product_id
      WHERE ${sourceConditions(owner, filters, linkIds)}
        ${dateCondition(Prisma.sql`c.occurred_at`, start, end)}
      GROUP BY c.tracking_link_id
    ),
    outcome_counts AS (
      SELECT
        c.tracking_link_id,
        COUNT(DISTINCT a.click_id)::int AS converted_clicks,
        COUNT(DISTINCT a.id)::int AS orders,
        COUNT(DISTINCT a.id) FILTER (WHERE cv.status::text = 'CONFIRMED')::int AS confirmed_sales,
        COUNT(DISTINCT a.id) FILTER (WHERE cv.status::text = 'CANCELLED')::int AS cancelled_sales,
        COALESCE(SUM(item_totals.units), 0)::int AS units,
        COALESCE(SUM(CASE WHEN cv.status::text <> 'CANCELLED' THEN item_totals.sales ELSE 0 END), 0) AS sales,
        COALESCE(SUM(CASE WHEN cv.status::text = 'CONFIRMED' THEN a.commission_amount ELSE 0 END), 0) AS confirmed,
        COALESCE(SUM(CASE WHEN cv.status::text = 'CANCELLED' THEN a.commission_amount ELSE 0 END), 0) AS cancelled
      FROM attribution a
      JOIN click c ON c.id = a.click_id
      JOIN tracking_link tl ON tl.id = c.tracking_link_id
      JOIN product p ON p.id = tl.product_id
      JOIN conversion_item attributed_ci ON attributed_ci.id = a.conversion_item_id
      JOIN conversion cv ON cv.id = attributed_ci.conversion_id
      JOIN LATERAL (
        SELECT
          COALESCE(SUM(ci.qty), 0)::int AS units,
          COALESCE(SUM(ci.commissionable_net), 0) AS sales
        FROM conversion_item ci
        WHERE ci.conversion_id = cv.id AND ci.sku = p.sku
      ) item_totals ON true
      WHERE a.status::text = 'CANONICAL'
        AND ${sourceConditions(owner, filters, linkIds)}
        ${outcomeOwnerCondition(owner)}
        ${dateCondition(Prisma.sql`cv.occurred_at`, start, end)}
        ${outcomeStatusCondition(filters)}
      GROUP BY c.tracking_link_id
    )
    SELECT
      tl.id::text AS id,
      tl.code,
      CASE
        WHEN tl.status::text = 'ACTIVE'
          AND p.status::text = 'ACTIVE'
          AND b.status::text = 'APPROVED'
          AND partnership.status::text = 'APPROVED'
        THEN 'ACTIVE'
        ELSE 'DISABLED'
      END AS status,
      p.id::text AS product_id,
      p.title AS product_title,
      p.sku AS product_sku,
      p.image_urls[1] AS image_url,
      b.id::text AS brand_id,
      b.name AS brand_name,
      cr.id::text AS creator_id,
      cr.display_name AS creator_name,
      COALESCE(cc.clicks, 0)::int AS clicks,
      COALESCE(oc.converted_clicks, 0)::int AS converted_clicks,
      COALESCE(oc.orders, 0)::int AS orders,
      COALESCE(oc.confirmed_sales, 0)::int AS confirmed_sales,
      COALESCE(oc.cancelled_sales, 0)::int AS cancelled_sales,
      COALESCE(oc.units, 0)::int AS units,
      COALESCE(oc.sales, 0) AS sales,
      COALESCE(oc.confirmed, 0) AS confirmed,
      COALESCE(oc.cancelled, 0) AS cancelled
    FROM tracking_link tl
    JOIN product p ON p.id = tl.product_id
    JOIN brand b ON b.id = p.brand_id
    JOIN creator cr ON cr.id = tl.creator_id
    LEFT JOIN partnership
      ON partnership.brand_id = b.id
      AND partnership.creator_id = cr.id
    LEFT JOIN click_counts cc ON cc.tracking_link_id = tl.id
    LEFT JOIN outcome_counts oc ON oc.tracking_link_id = tl.id
    WHERE ${sourceConditions(owner, filters, linkIds)}
    ORDER BY COALESCE(oc.confirmed, 0) DESC, COALESCE(cc.clicks, 0) DESC, p.title ASC
  `);

  return rows.map((row) => {
    const clicks = numberOf(row.clicks);
    const convertedClicks = numberOf(row.converted_clicks);
    return {
      id: row.id,
      code: row.code,
      status: row.status,
      productId: row.product_id,
      productTitle: row.product_title,
      productSku: row.product_sku,
      ...(row.image_url ? { imageUrl: row.image_url } : {}),
      brandId: row.brand_id,
      brandName: row.brand_name,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      clicks,
      convertedClicks,
      orders: numberOf(row.orders),
      confirmedSales: numberOf(row.confirmed_sales),
      cancelledSales: numberOf(row.cancelled_sales),
      units: numberOf(row.units),
      convertedClickRate: rateOf(convertedClicks, clicks),
      sales: moneyOf(row.sales),
      confirmed: moneyOf(row.confirmed),
      cancelled: moneyOf(row.cancelled),
    };
  });
}

function sumRows(rows: readonly LinkPerformanceRow[]): PerformanceTotals {
  const total = rows.reduce(
    (sum, row) => ({
      clicks: sum.clicks + row.clicks,
      convertedClicks: sum.convertedClicks + row.convertedClicks,
      orders: sum.orders + row.orders,
      confirmedSales: sum.confirmedSales + (row.confirmedSales ?? 0),
      cancelledSales: sum.cancelledSales + (row.cancelledSales ?? 0),
      units: sum.units + row.units,
      sales: sum.sales.plus(row.sales),
      confirmed: sum.confirmed.plus(row.confirmed),
      cancelled: sum.cancelled.plus(row.cancelled),
    }),
    {
      clicks: 0,
      convertedClicks: 0,
      orders: 0,
      confirmedSales: 0,
      cancelledSales: 0,
      units: 0,
      sales: new Decimal(0),
      confirmed: new Decimal(0),
      cancelled: new Decimal(0),
    },
  );
  return {
    clicks: total.clicks,
    convertedClicks: total.convertedClicks,
    orders: total.orders,
    confirmedSales: total.confirmedSales,
    cancelledSales: total.cancelledSales,
    units: total.units,
    convertedClickRate: rateOf(total.convertedClicks, total.clicks),
    sales: total.sales.toFixed(2),
    confirmed: total.confirmed.toFixed(2),
    cancelled: total.cancelled.toFixed(2),
  };
}

function breakdownRows(
  rows: readonly LinkPerformanceRow[],
  kind: "brands" | "creators" | "products" | "links",
  role: PerformanceRole,
): PerformanceBreakdownRow[] {
  if (kind === "links")
    return rows.map((row) => ({
      ...row,
      label: row.code,
      detail: `${row.productTitle} · ${role === "creator" ? row.brandName : row.creatorName}`,
      href: `?link=${row.id}#breakdown`,
    }));

  const grouped = new Map<
    string,
    {
      label: string;
      detail?: string;
      imageUrl?: string;
      rows: LinkPerformanceRow[];
    }
  >();
  for (const row of rows) {
    const id =
      kind === "brands"
        ? row.brandId
        : kind === "creators"
          ? row.creatorId
          : row.productId;
    const existing = grouped.get(id);
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    grouped.set(id, {
      label:
        kind === "brands"
          ? row.brandName
          : kind === "creators"
            ? row.creatorName
            : row.productTitle,
      ...(kind === "products"
        ? {
            detail:
              role === "creator"
                ? `${row.brandName} · ${row.productSku}`
                : row.productSku,
          }
        : {}),
      ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
      rows: [row],
    });
  }
  return [...grouped.entries()]
    .map(([id, group]) => ({
      id,
      label: group.label,
      ...(group.detail ? { detail: group.detail } : {}),
      ...(group.imageUrl ? { imageUrl: group.imageUrl } : {}),
      ...sumRows(group.rows),
      href: `?${kind === "brands" ? "brand" : kind === "creators" ? "creator" : "product"}=${id}#breakdown`,
    }))
    .sort(
      (a, b) =>
        new Decimal(role === "brand" ? b.sales : b.confirmed).comparedTo(
          role === "brand" ? a.sales : a.confirmed,
        ) ||
        b.clicks - a.clicks ||
        a.label.localeCompare(b.label),
    );
}

function localDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function loadTrend(
  owner: Owner,
  filters: PerformanceFilters,
  now: Date,
): Promise<PerformanceTrendPoint[]> {
  const window = reportWindow(filters, now);
  let start = window.start ?? performanceTrendStart("90d", window.end);
  if (!window.start) {
    const [first] = await prisma.$queryRaw<{ at: Date | null }[]>(Prisma.sql`
      SELECT MIN(event.at) AS at FROM (
        SELECT c.occurred_at AS at FROM click c JOIN tracking_link tl ON tl.id=c.tracking_link_id JOIN product p ON p.id=tl.product_id WHERE ${sourceConditions(owner, filters)}
        UNION ALL
        SELECT cv.occurred_at AS at FROM attribution a JOIN click c ON c.id=a.click_id JOIN tracking_link tl ON tl.id=c.tracking_link_id JOIN product p ON p.id=tl.product_id JOIN conversion_item ci ON ci.id=a.conversion_item_id JOIN conversion cv ON cv.id=ci.conversion_id WHERE a.status::text='CANONICAL' AND ${sourceConditions(owner, filters)} ${outcomeOwnerCondition(owner)}
      ) event WHERE event.at <= ${window.end}
    `);
    if (first?.at) start = new Date(`${localDay(first.at)}T00:00:00+04:00`);
  }
  const rows = await prisma.$queryRaw<RawTrendRow[]>(Prisma.sql`
    WITH click_daily AS (
      SELECT
        to_char(timezone('Asia/Tbilisi', c.occurred_at), 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS clicks
      FROM click c
      JOIN tracking_link tl ON tl.id = c.tracking_link_id
      JOIN product p ON p.id = tl.product_id
      WHERE ${sourceConditions(owner, filters)}
        ${dateCondition(Prisma.sql`c.occurred_at`, start, window.end)}
      GROUP BY day
    ),
    outcome_daily AS (
      SELECT
        to_char(timezone('Asia/Tbilisi', cv.occurred_at), 'YYYY-MM-DD') AS day,
        COUNT(DISTINCT a.id)::int AS orders,
        COALESCE(SUM(CASE WHEN cv.status::text = 'CONFIRMED' THEN a.commission_amount ELSE 0 END), 0) AS earnings,
        COALESCE(SUM(CASE WHEN cv.status::text = 'CONFIRMED' THEN (SELECT SUM(sci.commissionable_net) FROM conversion_item sci WHERE sci.conversion_id=cv.id AND sci.sku=p.sku) ELSE 0 END), 0) AS sales
      FROM attribution a
      JOIN click c ON c.id = a.click_id
      JOIN tracking_link tl ON tl.id = c.tracking_link_id
      JOIN product p ON p.id = tl.product_id
      JOIN conversion_item ci ON ci.id = a.conversion_item_id
      JOIN conversion cv ON cv.id = ci.conversion_id
      WHERE a.status::text = 'CANONICAL'
        AND ${sourceConditions(owner, filters)}
        ${outcomeOwnerCondition(owner)}
        ${dateCondition(Prisma.sql`cv.occurred_at`, start, window.end)}
        ${outcomeStatusCondition(filters)}
      GROUP BY day
    )
    SELECT
      COALESCE(cd.day, od.day) AS day,
      COALESCE(cd.clicks, 0)::int AS clicks,
      COALESCE(od.orders, 0)::int AS orders,
      COALESCE(od.earnings, 0) AS earnings,
      COALESCE(od.sales, 0) AS sales
    FROM click_daily cd
    FULL OUTER JOIN outcome_daily od ON od.day = cd.day
    ORDER BY day ASC
  `);
  const firstDay = new Date(`${localDay(start)}T00:00:00+04:00`);
  const days = Math.max(
    0,
    Math.floor((window.end.getTime() - firstDay.getTime()) / 86400000) + 1,
  );
  const bucketDays = Math.max(1, Math.ceil(days / 90));
  const grouped = new Map<
    number,
    { clicks: number; orders: number; earnings: Decimal; sales: Decimal }
  >();
  for (const row of rows) {
    const offset = Math.floor(
      (new Date(`${row.day}T00:00:00+04:00`).getTime() - firstDay.getTime()) /
        86400000,
    );
    const bucket = Math.floor(offset / bucketDays);
    const value = grouped.get(bucket) ?? {
      clicks: 0,
      orders: 0,
      earnings: new Decimal(0),
      sales: new Decimal(0),
    };
    value.clicks += numberOf(row.clicks);
    value.orders += numberOf(row.orders);
    value.earnings = value.earnings.plus(row.earnings.toString());
    value.sales = value.sales.plus(row.sales.toString());
    grouped.set(bucket, value);
  }
  const points: PerformanceTrendPoint[] = [];
  for (let offset = 0; offset < days; offset += bucketDays) {
    const bucket = grouped.get(Math.floor(offset / bucketDays));
    points.push({
      date: localDay(new Date(firstDay.getTime() + offset * 86400000)),
      ...(bucketDays > 1
        ? {
            endDate: localDay(
              new Date(
                firstDay.getTime() +
                  Math.min(days - 1, offset + bucketDays - 1) * 86400000,
              ),
            ),
          }
        : {}),
      clicks: bucket?.clicks ?? 0,
      orders: bucket?.orders ?? 0,
      earnings: bucket?.earnings.toFixed(2) ?? "0.00",
      sales: bucket?.sales.toFixed(2) ?? "0.00",
    });
  }
  return points;
}

async function loadLedger(
  owner: Owner,
  filters: PerformanceFilters,
  now: Date,
  pageSize = 20,
) {
  const { start, end } = reportWindow(filters, now);
  const page = Math.max(filters.ledgerPage ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const rows = await prisma.$queryRaw<RawLedgerRow[]>(Prisma.sql`
    SELECT
      a.id::text AS id,
      cv.order_id,
      cv.occurred_at,
      cv.status::text AS status,
      b.id::text AS brand_id,
      b.name AS brand_name,
      cr.id::text AS creator_id,
      cr.display_name AS creator_name,
      p.id::text AS product_id,
      p.title AS product_title,
      p.sku,
      tl.id::text AS link_id,
      tl.code AS link_code,
      a.click_id,
      item_totals.quantity,
      item_totals.commissionable_net,
      a.commission_amount,
      COUNT(*) OVER()::int AS total_rows
    FROM attribution a
    JOIN click c ON c.id = a.click_id
    JOIN tracking_link tl ON tl.id = c.tracking_link_id
    JOIN product p ON p.id = tl.product_id
    JOIN brand b ON b.id = p.brand_id
    JOIN creator cr ON cr.id = a.creator_id
    JOIN conversion_item attributed_ci ON attributed_ci.id = a.conversion_item_id
    JOIN conversion cv ON cv.id = attributed_ci.conversion_id
    JOIN LATERAL (
      SELECT
        COALESCE(SUM(ci.qty), 0)::int AS quantity,
        COALESCE(SUM(ci.commissionable_net), 0) AS commissionable_net
      FROM conversion_item ci
      WHERE ci.conversion_id = cv.id AND ci.sku = p.sku
    ) item_totals ON true
    WHERE a.status::text = 'CANONICAL'
      AND ${sourceConditions(owner, filters)}
      ${outcomeOwnerCondition(owner)}
      ${dateCondition(Prisma.sql`cv.occurred_at`, start, end)}
      ${outcomeStatusCondition(filters)}
      ${ledgerSearchCondition(filters)}
    ORDER BY cv.occurred_at DESC, a.id DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `);
  const total = rows[0] ? numberOf(rows[0].total_rows) : 0;
  return {
    rows: rows.map((row): EarningsLedgerRow => ({
      id: row.id,
      orderId: row.order_id,
      occurredAt: row.occurred_at.toISOString(),
      status: row.status,
      brandId: row.brand_id,
      brandName: row.brand_name,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      productId: row.product_id,
      productTitle: row.product_title,
      sku: row.sku,
      linkId: row.link_id,
      linkCode: row.link_code,
      clickId: row.click_id,
      quantity: row.quantity,
      commissionableNet: moneyOf(row.commissionable_net),
      commissionAmount: moneyOf(row.commission_amount),
    })),
    page,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
    total,
  };
}

async function loadClickLedger(
  owner: Owner,
  filters: PerformanceFilters,
  now: Date,
) {
  const { start, end } = reportWindow(filters, now);
  const pageSize = 20;
  const page = Math.max(filters.clickPage ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const rows = await prisma.$queryRaw<RawClickLedgerRow[]>(Prisma.sql`
    SELECT
      c.id,
      c.occurred_at,
      c.creditable,
      b.name AS brand_name,
      cr.display_name AS creator_name,
      p.title AS product_title,
      tl.code AS link_code,
      COALESCE(outcomes.order_ids, '') AS order_ids,
      COUNT(*) OVER()::int AS total_rows
    FROM click c
    JOIN tracking_link tl ON tl.id = c.tracking_link_id
    JOIN product p ON p.id = tl.product_id
    JOIN brand b ON b.id = p.brand_id
    JOIN creator cr ON cr.id = tl.creator_id
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(DISTINCT cv.order_id, ', ' ORDER BY cv.order_id) AS order_ids
      FROM attribution a
      JOIN conversion_item ci ON ci.id = a.conversion_item_id
      JOIN conversion cv ON cv.id = ci.conversion_id
      WHERE a.click_id = c.id
        AND a.status::text = 'CANONICAL'
        ${outcomeOwnerCondition(owner)}
        ${dateCondition(Prisma.sql`cv.occurred_at`, start, end)}
        ${outcomeStatusCondition(filters)}
    ) outcomes ON true
    WHERE ${sourceConditions(owner, filters)}
      ${dateCondition(Prisma.sql`c.occurred_at`, start, end)}
    ORDER BY c.occurred_at DESC, c.id DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `);
  const total = rows[0] ? numberOf(rows[0].total_rows) : 0;
  return {
    rows: rows.map((row): ClickLedgerRow => ({
      id: row.id,
      occurredAt: row.occurred_at.toISOString(),
      creditable: row.creditable,
      brandName: row.brand_name,
      creatorName: row.creator_name,
      productTitle: row.product_title,
      linkCode: row.link_code,
      orderIds: row.order_ids ? row.order_ids.split(", ") : [],
    })),
    page,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
    total,
  };
}

async function loadOptions(
  owner: Owner,
): Promise<Pick<PerformanceReport, "options" | "scope">> {
  const [options, scopeRows, allLinks] = await Promise.all([
    prisma.$queryRaw<RawFilterOption[]>(Prisma.sql`
      SELECT DISTINCT
        ${owner.role === "creator" ? Prisma.sql`b.id::text` : Prisma.sql`cr.id::text`} AS id,
        ${owner.role === "creator" ? Prisma.sql`b.name` : Prisma.sql`cr.display_name`} AS label
      FROM tracking_link tl
      JOIN product p ON p.id = tl.product_id
      JOIN brand b ON b.id = p.brand_id
      JOIN creator cr ON cr.id = tl.creator_id
      WHERE ${ownerCondition(owner)}
      ORDER BY label ASC
    `),
    prisma.$queryRaw<RawScope[]>(Prisma.sql`
      SELECT
        COUNT(DISTINCT p.brand_id)::int AS brands,
        COUNT(DISTINCT tl.creator_id)::int AS creators,
        COUNT(DISTINCT tl.product_id)::int AS products,
        COUNT(*)::int AS links
      FROM tracking_link tl
      JOIN product p ON p.id = tl.product_id
      WHERE ${ownerCondition(owner)}
    `),
    prisma.trackingLink.findMany({
      where:
        owner.role === "creator"
          ? { creatorId: owner.id }
          : { product: { brandId: owner.id } },
      select: {
        id: true,
        code: true,
        creatorId: true,
        product: { select: { id: true, title: true, brandId: true } },
      },
    }),
  ]);
  const scope = scopeRows[0];
  return {
    options:
      owner.role === "creator"
        ? {
            brands: options,
            creators: [],
            products: [
              ...new Map(
                allLinks.map((l) => [
                  l.product.id,
                  {
                    id: l.product.id,
                    label: l.product.title,
                    parentId: l.product.brandId,
                  },
                ]),
              ).values(),
            ],
            links: allLinks.map((l) => ({
              id: l.id,
              label: `${l.product.title} · ${l.code}`,
              parentId: l.product.id,
              partnerId:
                owner.role === "creator" ? l.product.brandId : l.creatorId,
            })),
          }
        : {
            brands: [],
            creators: options,
            products: [
              ...new Map(
                allLinks.map((l) => [
                  l.product.id,
                  { id: l.product.id, label: l.product.title },
                ]),
              ).values(),
            ],
            links: allLinks.map((l) => ({
              id: l.id,
              label: `${l.product.title} · ${l.code}`,
              parentId: l.product.id,
              partnerId:
                owner.role === "creator" ? l.product.brandId : l.creatorId,
            })),
          },
    scope: {
      brands: scope ? numberOf(scope.brands) : 0,
      creators: scope ? numberOf(scope.creators) : 0,
      products: scope ? numberOf(scope.products) : 0,
      links: scope ? numberOf(scope.links) : 0,
    },
  };
}

async function performanceReport(
  owner: Owner,
  filters: PerformanceFilters,
  now = new Date(),
): Promise<PerformanceReport> {
  const summaryFilters = { ...filters };
  delete summaryFilters.status;
  delete summaryFilters.ledgerQuery;
  const currentWindow = reportWindow(filters, now);
  const comparisonWindow = previousWindow(currentWindow);
  const [
    links,
    comparisonLinks,
    trend,
    clickLedger,
    ledger,
    optionData,
    context,
    sale,
    summaryLinks,
    activity,
  ] = await Promise.all([
    loadLinkRows(owner, filters, now),
    comparisonWindow
      ? loadLinkRows(owner, filters, now, undefined, comparisonWindow)
      : Promise.resolve([]),
    loadTrend(owner, filters, now),
    loadClickLedger(owner, filters, now),
    loadLedger(owner, filters, now),
    loadOptions(owner),
    loadContext(owner),
    filters.saleId
      ? loadSale(owner, filters.saleId)
      : Promise.resolve(undefined),
    filters.status || filters.ledgerQuery
      ? loadLinkRows(owner, summaryFilters, now)
      : Promise.resolve(undefined),
    loadActivity(owner, filters, now),
  ]);
  return {
    context,
    activity,
    ...(summaryLinks ? { summaryTotals: sumRows(summaryLinks) } : {}),
    ...(sale ? { sale } : {}),
    role: owner.role,
    generatedAt: now.toISOString(),
    period: filters.period,
    totals: links.length ? sumRows(links) : ZERO_TOTALS,
    ...(comparisonWindow
      ? {
          comparison: comparisonLinks.length
            ? sumRows(comparisonLinks)
            : ZERO_TOTALS,
        }
      : {}),
    trend,
    clickLedger,
    breakdowns: {
      brands: breakdownRows(links, "brands", owner.role),
      creators: breakdownRows(links, "creators", owner.role),
      products: breakdownRows(links, "products", owner.role),
      links: breakdownRows(links, "links", owner.role),
    },
    ledger,
    options: optionData.options,
    scope: optionData.scope,
  };
}

export function creatorPerformanceReport(
  creatorId: string,
  filters: PerformanceFilters,
  now?: Date,
) {
  return performanceReport({ role: "creator", id: creatorId }, filters, now);
}

export function brandPerformanceReport(
  brandId: string,
  filters: PerformanceFilters,
  now?: Date,
) {
  return performanceReport({ role: "brand", id: brandId }, filters, now);
}

export async function creatorPerformanceLedgerExport(
  creatorId: string,
  filters: PerformanceFilters,
  now = new Date(),
) {
  const result = await loadLedger(
    { role: "creator", id: creatorId },
    { ...filters, ledgerPage: 1 },
    now,
    10_000,
  );
  return { rows: result.rows, total: result.total, limit: 10_000 };
}

export async function brandPerformanceLedgerExport(
  brandId: string,
  filters: PerformanceFilters,
  now = new Date(),
) {
  const result = await loadLedger(
    { role: "brand", id: brandId },
    { ...filters, ledgerPage: 1 },
    now,
    10_000,
  );
  return { rows: result.rows, total: result.total, limit: 10_000 };
}

export async function creatorLinkPerformanceSnapshots(
  creatorId: string,
  linkIds: readonly string[],
  now = new Date(),
) {
  if (linkIds.length === 0) return new Map<string, LinkPerformanceRow>();
  const rows = await loadLinkRows(
    { role: "creator", id: creatorId },
    { period: "30d" },
    now,
    linkIds,
  );
  return new Map(rows.map((row) => [row.id, row]));
}

export async function brandLinkPerformanceSnapshots(
  brandId: string,
  linkIds: readonly string[],
  now = new Date(),
) {
  if (linkIds.length === 0) return new Map<string, LinkPerformanceRow>();
  const rows = await loadLinkRows(
    { role: "brand", id: brandId },
    { period: "30d" },
    now,
    linkIds,
  );
  return new Map(rows.map((row) => [row.id, row]));
}
