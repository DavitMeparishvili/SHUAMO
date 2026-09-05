import { notFound } from "next/navigation";
import {
  CatalogPagination,
  DiscoveryControls,
  isProductType,
  PRODUCT_TYPES,
  PRODUCT_TYPE_GROUPS,
  productTypeMessageKey,
  type ProductTypeValue,
} from "@/src/modules/catalog";
import { currentViewer } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  getPublicCatalogFacets,
  listPublicProductOffers,
  ProductOfferGallery,
} from "@/src/modules/partnerships";
import { serverEnv } from "@/src/config/env";

type Query = {
  q?: string;
  category?: string;
  type?: string;
  commission?: string;
  brand?: string;
  sort?: string;
  page?: string;
};

export default async function CreatorProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ locale }, query, viewer] = await Promise.all([
    params,
    searchParams,
    currentViewer(),
  ]);
  if (!isLocale(locale)) notFound();
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
  const sort = ["newest", "title", "price_low", "commission_high"].includes(
    query.sort ?? "",
  )
    ? (query.sort as "newest" | "title" | "price_low" | "commission_high")
    : "newest";
  const search = query.q?.trim() ?? "";
  const brandId =
    query.brand &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      query.brand,
    )
      ? query.brand
      : undefined;
  const requestedPage = Number(query.page);
  const [catalog, facets] = await Promise.all([
    listPublicProductOffers(
      {
        ...(search ? { q: search } : {}),
        ...(category ? { productTypes: [...category.values] } : {}),
        ...(productType ? { productType } : {}),
        ...(commissionType ? { commissionType } : {}),
        ...(brandId ? { brandId } : {}),
        sort,
        page:
          Number.isInteger(requestedPage) && requestedPage > 0
            ? requestedPage
            : 1,
      },
      viewer.kind === "creator" ? viewer.creatorId : undefined,
    ),
    getPublicCatalogFacets(search),
  ]);
  const productTypes = Object.fromEntries(
    PRODUCT_TYPES.map((type) => [
      type,
      t(messages, productTypeMessageKey(type)),
    ]),
  ) as Record<ProductTypeValue, string>;
  const filters = {
    q: search,
    category: category?.key ?? "",
    type: productType ?? "",
    commission: commissionType ?? "",
    brand: brandId ?? "",
    sort,
  };
  const copy = Object.fromEntries(
    [
      "title",
      "intro",
      "filters",
      "clear",
      "all",
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
      "search",
      "searchPlaceholder",
      "sort",
      "newest",
      "titleSort",
      "price_low",
      "commission_high",
      "results",
      "products",
      "close",
      "showProducts",
    ].map((key) => [key, t(messages, `discovery.${key}`)]),
  );
  return (
    <DiscoveryControls
      filters={filters}
      counts={facets.counts}
      brands={facets.brands}
      copy={copy}
      productTypes={productTypes}
      total={catalog.total}
    >
      <ProductOfferGallery
        locale={locale}
        offers={catalog.items}
        baseUrl={serverEnv().APP_URL}
        savedScope={viewer.kind === "creator" ? viewer.creatorId : "guest"}
        copy={{
          emptyTitle: t(messages, "catalog.discover.emptyTitle"),
          emptyBody: t(messages, "catalog.discover.emptyBody"),
          price: t(messages, "catalog.field.price"),
          commission: t(messages, "discovery.commission"),
          cookieWindow: t(messages, "catalog.terms.cookieWindow"),
          days: t(messages, "catalog.terms.days"),
          viewOffer: t(messages, "catalog.viewOffer"),
          activeLink: t(messages, "catalog.activeLink"),
          imageFallback: t(messages, "catalog.image.fallback"),
          productTypes,
          save: t(messages, "discovery.save"),
          unsave: t(messages, "discovery.unsave"),
          copyLink: t(messages, "discovery.copyLink"),
          copied: t(messages, "discovery.copied"),
          copyError: t(messages, "discovery.copyError"),
        }}
      />
      <CatalogPagination
        page={catalog.page}
        pageCount={catalog.pageCount}
        hrefForPage={(page) => {
          const values = new URLSearchParams();
          Object.entries(filters).forEach(([key, value]) => {
            if (value && !(key === "sort" && value === "newest"))
              values.set(key, value);
          });
          if (page > 1) values.set("page", String(page));
          return `/${locale}/products${values.size ? `?${values}` : ""}`;
        }}
        copy={{
          label: t(messages, "catalog.pagination.label"),
          previous: t(messages, "catalog.pagination.previous"),
          next: t(messages, "catalog.pagination.next"),
          page: t(messages, "catalog.pagination.page"),
          of: t(messages, "catalog.pagination.of"),
        }}
      />
    </DiscoveryControls>
  );
}
