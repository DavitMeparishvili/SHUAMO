import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Banner, Button, Field, Select } from "@/src/modules/design-system";
import {
  CatalogPagination,
  isProductType,
  listProductsForBrand,
  MobileFilterSheet,
  PRODUCT_TYPES,
  productTypeMessageKey,
  ProductList,
  type ProductTypeValue,
} from "@/src/modules/catalog";
import {
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import {
  getMessages,
  isLocale,
  t,
  type Messages,
} from "@/src/modules/localization";

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

function filterForm({
  messages,
  query,
  suffix,
}: {
  messages: Messages;
  query: Query;
  suffix: string;
}) {
  return (
    <form
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,auto))_auto] lg:items-end"
      method="get"
    >
      <Field
        defaultValue={query.q}
        id={`catalog-search-${suffix}`}
        label={t(messages, "catalog.filter.search")}
        name="q"
        placeholder={t(messages, "catalog.filter.searchPlaceholder")}
        type="search"
      />
      <Select
        defaultValue={query.type ?? ""}
        id={`catalog-type-${suffix}`}
        label={t(messages, "catalog.filter.productType")}
        name="type"
      >
        <option value="">{t(messages, "catalog.filter.anyType")}</option>
        {PRODUCT_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(messages, productTypeMessageKey(type))}
          </option>
        ))}
      </Select>
      <Select
        defaultValue={query.status ?? ""}
        id={`catalog-status-${suffix}`}
        label={t(messages, "catalog.field.status")}
        name="status"
      >
        <option value="">{t(messages, "catalog.filter.all")}</option>
        <option value="active">{t(messages, "catalog.filter.active")}</option>
        <option value="archived">
          {t(messages, "catalog.filter.archived")}
        </option>
      </Select>
      <Select
        defaultValue={query.sort ?? "newest"}
        id={`catalog-sort-${suffix}`}
        label={t(messages, "catalog.filter.sort")}
        name="sort"
      >
        <option value="newest">{t(messages, "catalog.sort.newest")}</option>
        <option value="title">{t(messages, "catalog.sort.title")}</option>
        <option value="price_high">
          {t(messages, "catalog.sort.priceHigh")}
        </option>
        <option value="commission_high">
          {t(messages, "catalog.sort.commissionHigh")}
        </option>
      </Select>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit">{t(messages, "catalog.filter.apply")}</Button>
        <Link
          className="inline-flex min-h-11 items-center px-3 type-small font-semibold text-slate-600 hover:text-ink"
          href="?"
        >
          {t(messages, "catalog.filter.clear")}
        </Link>
      </div>
    </form>
  );
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
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
  const activeFilterCount = [
    query.q,
    productType,
    status,
    query.sort && query.sort !== "newest",
  ].filter(Boolean).length;
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
    <WorkspaceShell
      name={allowed.value.brandName}
      title={t(messages, "catalog.title")}
      intro={t(messages, "catalog.intro")}
    >
      <div className="grid gap-7">
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="m-0 type-small text-slate-600">
            {t(messages, "catalog.results").replace(
              "{count}",
              String(catalog.total),
            )}
          </p>
          <Link
            className="inline-flex min-h-11 items-center rounded-pill bg-signal px-5 type-small font-semibold text-paper no-underline hover:bg-signal-hover"
            href={`/${locale}/brand/products/new`}
          >
            {t(messages, "catalog.new")}
          </Link>
        </div>
        <div className="hidden sm:block">
          {filterForm({ messages, query, suffix: "desktop" })}
        </div>
        <MobileFilterSheet
          activeCount={activeFilterCount}
          closeLabel={t(messages, "catalog.filter.close")}
          label={t(messages, "catalog.filter.mobile")}
        >
          {filterForm({ messages, query, suffix: "mobile" })}
        </MobileFilterSheet>
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
      </div>
    </WorkspaceShell>
  );
}
