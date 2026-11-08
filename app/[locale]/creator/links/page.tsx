import { notFound, redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import { creatorLinkPerformanceSnapshots } from "@/src/modules/conversions";
import {
  CatalogPagination,
  isProductType,
  DiscoveryControls,
  PRODUCT_TYPE_GROUPS,
  PRODUCT_TYPES,
  productTypeMessageKey,
  type ProductTypeValue,
} from "@/src/modules/catalog";
import { currentViewer, requireCreator } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  LinkList,
  listCreatorLinkBrands,
  getCreatorLinkFacets,
  listCreatorLinkCatalog,
} from "@/src/modules/partnerships";
import { listShopProductIds, ShopToggleButton } from "@/src/modules/profiles";
import {
  addShopItemsAction,
  removeShopItemAction,
} from "../profile/shop-actions";

type Query = {
  q?: string;
  category?: string;
  commission?: string;
  type?: string;
  brand?: string;
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

export default async function CreatorLinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const messages = getMessages(locale);
  const category = PRODUCT_TYPE_GROUPS.find(
    (group) => group.key === query.category,
  );
  const productType =
    query.type &&
    isProductType(query.type) &&
    (!category || (category.values as readonly string[]).includes(query.type))
      ? query.type
      : undefined;
  const commissionType =
    query.commission === "PERCENT" || query.commission === "FIXED"
      ? query.commission
      : undefined;
  const brandId =
    query.brand && UUID.test(query.brand) ? query.brand : undefined;
  const resolution =
    query.status === "ACTIVE" || query.status === "DISABLED"
      ? query.status
      : undefined;
  const sort = ["newest", "title", "brand", "commission_high"].includes(
    query.sort ?? "",
  )
    ? (query.sort as "newest" | "title" | "brand" | "commission_high")
    : "newest";
  const search = query.q?.trim();
  const [catalog, brands, counts, shopProductIds] = await Promise.all([
    listCreatorLinkCatalog(allowed.value.creatorId, {
      ...(search ? { q: search } : {}),
      ...(productType ? { productType } : {}),
      ...(category ? { productTypes: [...category.values] } : {}),
      ...(commissionType ? { commissionType } : {}),
      ...(brandId ? { brandId } : {}),
      ...(resolution ? { resolution } : {}),
      sort,
      page: validPage(query.page),
      pageSize: 12,
    }),
    listCreatorLinkBrands(allowed.value.creatorId),
    getCreatorLinkFacets(allowed.value.creatorId, search),
    listShopProductIds(allowed.value.creatorId),
  ]);
  const inShop = new Set(shopProductIds);
  const addToShop = addShopItemsAction.bind(null, locale);
  const removeFromShop = removeShopItemAction.bind(null, locale);
  const performance = await creatorLinkPerformanceSnapshots(
    allowed.value.creatorId,
    catalog.items.map((link) => link.id),
  );
  const productTypes = Object.fromEntries(
    PRODUCT_TYPES.map((type) => [
      type,
      t(messages, productTypeMessageKey(type)),
    ]),
  ) as Record<ProductTypeValue, string>;
  const filters = {
    q: search ?? "",
    category: category?.key ?? "",
    type: productType ?? "",
    commission: commissionType ?? "",
    brand: brandId ?? "",
    status: resolution ?? "",
    sort,
  };
  const queryWith = (updates: Record<string, string | undefined>) => {
    const values = new URLSearchParams();
    Object.entries({ ...filters, ...updates }).forEach(([key, value]) => {
      if (value && !(key === "sort" && value === "newest"))
        values.set(key, value);
    });
    return `/${locale}/creator/links${values.size ? `?${values}` : ""}`;
  };
  const hasFilters = Boolean(
    search ||
    category ||
    productType ||
    commissionType ||
    brandId ||
    resolution,
  );
  const controlCopy = Object.fromEntries(
    [
      "filters",
      "clear",
      "any",
      "category",
      "beauty",
      "fashion",
      "home",
      "other",
      "brand",
      "productType",
      "commissionType",
      "percent",
      "fixed",
      "searchPlaceholder",
      "sort",
      "newest",
      "titleSort",
      "commission_high",
      "close",
    ].map((key) => [key, t(messages, `discovery.${key}`)]),
  );
  return (
    <DiscoveryControls
      filters={filters}
      counts={counts}
      brands={brands}
      productTypes={productTypes}
      total={catalog.total}
      sortOptions={["newest", "title", "brand", "commission_high"]}
      statusOptions={[
        { value: "ACTIVE", label: t(messages, "links.active") },
        { value: "DISABLED", label: t(messages, "links.filter.unavailable") },
      ]}
      copy={{
        ...controlCopy,
        title: t(messages, "links.title"),
        intro: t(messages, "links.intro"),
        all: t(messages, "links.filter.all"),
        products: t(messages, "links.title"),
        search: t(messages, "links.search"),
        status: t(messages, "links.filter.status"),
        results: t(messages, "links.results"),
        showProducts: t(messages, "links.showLinks"),
        brand: t(messages, "links.filter.brand"),
      }}
    >
      <LinkList
        variant="discovery"
        locale={locale}
        links={catalog.items}
        performance={performance}
        baseUrl={serverEnv().APP_URL}
        trailing={({ productId, active }) =>
          active ? (
            <ShopToggleButton
              productId={productId}
              inShop={inShop.has(productId)}
              locale={locale}
              add={addToShop}
              remove={removeFromShop}
            />
          ) : null
        }
        copy={{
          emptyTitle: t(
            messages,
            hasFilters ? "links.noMatchesTitle" : "links.emptyTitle",
          ),
          emptyBody: t(
            messages,
            hasFilters ? "links.noMatchesBody" : "links.emptyBody",
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
    </DiscoveryControls>
  );
}
