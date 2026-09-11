import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Banner, ManagementDiscovery } from "@/src/modules/design-system";
import {
  CatalogPagination,
  isProductType,
  listProductsForBrand,
  PRODUCT_TYPES,
  productTypeMessageKey,
  ProductList,
  type ProductTypeValue,
} from "@/src/modules/catalog";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";

type Query = {
  created?: string;
  archived?: string;
  q?: string;
  status?: string;
  type?: string;
  sort?: string;
  page?: string;
};

function pageNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
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
  const status =
    query.status === "active"
      ? "ACTIVE"
      : query.status === "archived"
        ? "ARCHIVED"
        : undefined;
  const sort = ["newest", "title", "price_high", "commission_high"].includes(
    query.sort ?? "",
  )
    ? (query.sort as "newest" | "title" | "price_high" | "commission_high")
    : "newest";
  const search = query.q?.trim();
  const catalog = await listProductsForBrand(allowed.value.brandId, {
    ...(search ? { q: search } : {}),
    ...(productType ? { productType } : {}),
    ...(status ? { status } : {}),
    sort,
    page: pageNumber(query.page),
  });
  const productTypes = Object.fromEntries(
    PRODUCT_TYPES.map((type) => [
      type,
      t(messages, productTypeMessageKey(type)),
    ]),
  ) as Record<ProductTypeValue, string>;
  const hrefForPage = (page: number) => {
    const values = new URLSearchParams();
    if (query.q) values.set("q", query.q);
    if (productType) values.set("type", productType);
    if (query.status) values.set("status", query.status);
    if (query.sort && query.sort !== "newest") values.set("sort", query.sort);
    if (page > 1) values.set("page", String(page));
    const serialized = values.toString();
    return serialized ? `?${serialized}` : `/${locale}/brand/products`;
  };
  return (
    <ManagementDiscovery
      title={t(messages, "catalog.title")}
      intro={t(messages, "catalog.intro")}
      values={{
        q: search ?? "",
        type: productType ?? "",
        status: status?.toLowerCase() ?? "",
        sort,
      }}
      total={catalog.total}
      action={
        <Link
          className="discovery-primary management-create"
          href={`/${locale}/brand/products/new`}
        >
          {t(messages, "catalog.new")}
        </Link>
      }
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
          name: "status",
          label: t(messages, "catalog.field.status"),
          options: [
            { value: "", label: t(messages, "catalog.filter.all") },
            { value: "active", label: t(messages, "catalog.filter.active") },
            {
              value: "archived",
              label: t(messages, "catalog.filter.archived"),
            },
          ],
        },
      ]}
      sortOptions={["newest", "title", "price_high", "commission_high"].map(
        (value) => ({
          value,
          label: t(
            messages,
            `catalog.sort.${value === "price_high" ? "priceHigh" : value === "commission_high" ? "commissionHigh" : value}`,
          ),
        }),
      )}
      copy={{
        search: t(messages, "catalog.filter.searchPlaceholder"),
        filters: t(messages, "discovery.filters"),
        clear: t(messages, "catalog.filter.clear"),
        close: t(messages, "catalog.filter.close"),
        apply: t(messages, "catalog.filter.apply"),
        sort: t(messages, "catalog.filter.sort"),
        results: t(messages, "catalog.results"),
      }}
    >
      {query.created !== undefined ? (
        <Banner
          tone="info"
          title={t(messages, "catalog.createdTitle")}
          body={t(messages, "catalog.createdBody").replace(
            "{count}",
            query.created,
          )}
        />
      ) : null}
      {query.archived ? (
        <Banner
          tone="info"
          title={t(messages, "catalog.archivedTitle")}
          body={t(messages, "catalog.archivedBody")}
        />
      ) : null}
      <ProductList
        locale={locale}
        products={catalog.items}
        copy={{
          price: t(messages, "catalog.field.price"),
          rate: t(messages, "catalog.field.rate"),
          links: t(messages, "catalog.field.links"),
          active: t(messages, "catalog.status.active"),
          archived: t(messages, "catalog.status.archived"),
          manage: t(messages, "catalog.manage"),
          imageFallback: t(messages, "catalog.image.fallback"),
          cookieWindow: t(messages, "catalog.terms.cookieWindow"),
          days: t(messages, "catalog.terms.days"),
          emptyTitle: t(messages, "catalog.empty.title"),
          emptyBody: t(messages, "catalog.empty.body"),
          productTypes,
        }}
      />
      <CatalogPagination
        page={catalog.page}
        pageCount={catalog.pageCount}
        hrefForPage={hrefForPage}
        copy={{
          label: t(messages, "catalog.pagination.label"),
          previous: t(messages, "catalog.pagination.previous"),
          next: t(messages, "catalog.pagination.next"),
          page: t(messages, "catalog.pagination.page"),
          of: t(messages, "catalog.pagination.of"),
        }}
      />
    </ManagementDiscovery>
  );
}
