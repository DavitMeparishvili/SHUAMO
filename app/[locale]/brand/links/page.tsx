import Decimal from "decimal.js";
import { setLinkStatusAction } from "./actions";
import { notFound, redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import { ManagementDiscovery } from "@/src/modules/design-system";
import { brandLinkPerformanceSnapshots } from "@/src/modules/conversions";
import {
  CatalogPagination,
  isProductType,
  PRODUCT_TYPES,
  productTypeMessageKey,
  type ProductTypeValue,
} from "@/src/modules/catalog";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  LinkList,
  listResolvedLinksForBrand,
  resolveLink,
} from "@/src/modules/partnerships";

type Query = {
  q?: string;
  type?: string;
  creator?: string;
  status?: string;
  sort?: string;
  page?: string;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validPage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function BrandLinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<keyof Query, string | string[] | undefined>>;
}) {
  const [{ locale }, rawQuery] = await Promise.all([params, searchParams]);
  const query: Query = Object.fromEntries(
    Object.entries(rawQuery).filter(([, value]) => typeof value === "string"),
  );
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const messages = getMessages(locale);
  const productType =
    query.type && isProductType(query.type) ? query.type : undefined;
  const creatorId =
    query.creator && UUID.test(query.creator) ? query.creator : undefined;
  const resolution =
    query.status === "ACTIVE" || query.status === "DISABLED"
      ? query.status
      : undefined;
  const sort = ["newest", "title", "creator", "commission_high"].includes(
    query.sort ?? "",
  )
    ? (query.sort as "newest" | "title" | "creator" | "commission_high")
    : "newest";
  const search = query.q?.trim();
  const links = await listResolvedLinksForBrand(allowed.value.brandId);
  const creators = Array.from(
    new Map(
      links.map((link) => [
        link.creatorId,
        { id: link.creatorId, name: link.creator.displayName },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name, locale));
  const filtered = links.filter((link) => {
    const partnership = link.creator.partnerships.find(
      ({ brandId }) => brandId === link.product.brand.id,
    );
    const state = resolveLink({
      brandStatus: link.product.brand.status,
      partnershipStatus: partnership?.status,
      productStatus: link.product.status,
      linkStatus: link.status,
    });
    return (
      (!productType || link.product.productType === productType) &&
      (!creatorId || link.creatorId === creatorId) &&
      (!resolution || state.active === (resolution === "ACTIVE")) &&
      (!search ||
        [
          link.product.title,
          link.product.sku,
          link.creator.displayName,
          link.code,
        ].some((value) =>
          value
            .toLocaleLowerCase(locale)
            .includes(search.toLocaleLowerCase(locale)),
        ))
    );
  });
  filtered.sort((a, b) => {
    if (sort === "title")
      return (
        a.product.title.localeCompare(b.product.title, locale) ||
        a.id.localeCompare(b.id)
      );
    if (sort === "creator")
      return (
        a.creator.displayName.localeCompare(b.creator.displayName, locale) ||
        a.id.localeCompare(b.id)
      );
    if (sort === "commission_high") {
      return (
        new Decimal(b.commissionValue.toString()).comparedTo(
          a.commissionValue.toString(),
        ) || a.id.localeCompare(b.id)
      );
    }
    return (
      b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id)
    );
  });
  const pageCount = Math.max(Math.ceil(filtered.length / 6), 1);
  const page = Math.min(validPage(query.page), pageCount);
  const catalog = {
    items: filtered.slice((page - 1) * 6, page * 6),
    total: filtered.length,
    page,
    pageCount,
  };
  const performance = await brandLinkPerformanceSnapshots(
    allowed.value.brandId,
    catalog.items.map((link) => link.id),
  );
  const productTypes = Object.fromEntries(
    PRODUCT_TYPES.map((type) => [
      type,
      t(messages, productTypeMessageKey(type)),
    ]),
  ) as Record<ProductTypeValue, string>;
  const queryWith = (updates: Record<string, string | undefined>) => {
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries({
      q: query.q,
      type: productType,
      creator: creatorId,
      status: resolution,
      sort: query.sort && query.sort !== "newest" ? query.sort : undefined,
      ...updates,
    }))
      if (value) values.set(key, value);
    const serialized = values.toString();
    return serialized ? `?${serialized}` : `/${locale}/brand/links`;
  };
  const activeFilterCount = [
    query.q,
    productType,
    creatorId,
    resolution,
    query.sort && query.sort !== "newest",
  ].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;
  return (
    <ManagementDiscovery
      title={t(messages, "links.brandTitle")}
      intro={t(messages, "links.brandIntro")}
      values={{
        q: search ?? "",
        type: productType ?? "",
        creator: creatorId ?? "",
        status: resolution ?? "",
        sort,
      }}
      total={catalog.total}
      filters={[
        {
          name: "type",
          label: t(messages, "catalog.filter.productType"),
          options: [
            { value: "", label: t(messages, "catalog.filter.anyType") },
            ...PRODUCT_TYPES.map((value) => ({
              value,
              label: productTypes[value],
            })),
          ],
        },
        {
          name: "creator",
          label: t(messages, "links.creator"),
          options: [
            { value: "", label: t(messages, "links.filter.anyCreator") },
            ...creators.map((creator) => ({
              value: creator.id,
              label: creator.name,
            })),
          ],
        },
        {
          name: "status",
          label: t(messages, "links.filter.status"),
          options: [
            { value: "", label: t(messages, "links.filter.anyStatus") },
            { value: "ACTIVE", label: t(messages, "links.active") },
            {
              value: "DISABLED",
              label: t(messages, "links.filter.unavailable"),
            },
          ],
        },
      ]}
      sortOptions={["newest", "title", "creator", "commission_high"].map(
        (value) => ({
          value,
          label: t(
            messages,
            value === "creator"
              ? "links.sort.creator"
              : `catalog.sort.${value === "commission_high" ? "commissionHigh" : value}`,
          ),
        }),
      )}
      copy={{
        search: t(messages, "links.search"),
        filters: t(messages, "discovery.filters"),
        clear: t(messages, "catalog.filter.clear"),
        close: t(messages, "catalog.filter.close"),
        apply: t(messages, "catalog.filter.apply"),
        sort: t(messages, "catalog.filter.sort"),
        results: t(messages, "links.results"),
      }}
    >
      <LinkList
        variant="discovery"
        brandControls={{
          creator: t(messages, "links.creator"),
          enable: t(messages, "links.enable"),
          disable: t(messages, "links.disable"),
          setStatusAction: setLinkStatusAction.bind(null, locale),
        }}
        locale={locale}
        links={catalog.items}
        performance={performance}
        baseUrl={serverEnv().APP_URL}
        copy={{
          emptyTitle: t(
            messages,
            hasFilters ? "links.noMatchesTitle" : "links.brandEmptyTitle",
          ),
          emptyBody: t(
            messages,
            hasFilters ? "links.brandNoMatchesBody" : "links.brandEmptyBody",
          ),
          active: t(messages, "links.active"),
          link: t(messages, "links.link"),
          rate: t(messages, "links.rate"),
          status: t(messages, "links.filter.status"),
          viewProduct: t(messages, "links.viewProduct"),
          imageFallback: t(messages, "catalog.image.fallback"),
          acceptedTerms: t(messages, "links.acceptedTerms"),
          copy: t(messages, "design.copy.copy"),
          copied: t(messages, "design.copy.copied"),
          copyError: t(messages, "design.copy.error"),
          productTypes,
          reasons: {
            BRAND_DISABLED: t(messages, "links.reason.BRAND_DISABLED"),
            CREATOR_REMOVED: t(messages, "links.reason.CREATOR_REMOVED"),
            PRODUCT_ARCHIVED: t(messages, "links.reason.PRODUCT_ARCHIVED"),
            LINK_DISABLED: t(messages, "links.reason.LINK_DISABLED"),
          },
          last30Days: t(messages, "performance.period.30d"),
          clicks: t(messages, "performance.metric.clicks"),
          converted: t(messages, "performance.metric.convertedClicks"),
          orders: t(messages, "performance.metric.orders"),
          confirmed: t(messages, "performance.metric.confirmed"),
          noActivity: t(messages, "performance.link.noActivity"),
          viewPerformance: t(messages, "performance.link.view"),
        }}
      />
      <CatalogPagination
        page={catalog.page}
        pageCount={catalog.pageCount}
        hrefForPage={(page) =>
          queryWith({ page: page > 1 ? String(page) : undefined })
        }
        copy={{
          label: t(messages, "links.pagination.label"),
          previous: t(messages, "catalog.pagination.previous"),
          next: t(messages, "catalog.pagination.next"),
          page: t(messages, "catalog.pagination.page"),
          of: t(messages, "catalog.pagination.of"),
        }}
      />
    </ManagementDiscovery>
  );
}
