import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button, Field, Select } from "@/src/modules/design-system";
import {
  CatalogPagination,
  isProductType,
  MobileFilterSheet,
  PRODUCT_TYPES,
  productTypeMessageKey,
  type ProductTypeValue,
} from "@/src/modules/catalog";
import {
  currentViewer,
  requireCreator,
  WorkspaceShell,
} from "@/src/modules/identity";
import {
  getMessages,
  isLocale,
  t,
  type Messages,
} from "@/src/modules/localization";
import {
  listProductOffersForCreator,
  ProductOfferGallery,
} from "@/src/modules/partnerships";

type Query = {
  q?: string;
  type?: string;
  commission?: string;
  sort?: string;
  page?: string;
};

function validPage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function FilterForm({
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
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(160px,auto))_auto] lg:items-end"
      method="get"
    >
      <Field
        defaultValue={query.q}
        id={`offer-search-${suffix}`}
        label={t(messages, "catalog.filter.search")}
        name="q"
        placeholder={t(messages, "catalog.filter.searchPlaceholder")}
        type="search"
      />
      <Select
        defaultValue={query.type ?? ""}
        id={`offer-type-${suffix}`}
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
        defaultValue={query.commission ?? ""}
        id={`offer-commission-${suffix}`}
        label={t(messages, "catalog.field.rateType")}
        name="commission"
      >
        <option value="">{t(messages, "catalog.filter.anyCommission")}</option>
        <option value="PERCENT">{t(messages, "catalog.rate.percent")}</option>
        <option value="FIXED">{t(messages, "catalog.rate.fixed")}</option>
      </Select>
      <Select
        defaultValue={query.sort ?? "newest"}
        id={`offer-sort-${suffix}`}
        label={t(messages, "catalog.filter.sort")}
        name="sort"
      >
        <option value="newest">{t(messages, "catalog.sort.newest")}</option>
        <option value="title">{t(messages, "catalog.sort.title")}</option>
        <option value="price_low">
          {t(messages, "catalog.sort.priceLow")}
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

export default async function CreatorProductsPage({
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
  const productType =
    query.type && isProductType(query.type) ? query.type : undefined;
  const commissionType =
    query.commission === "PERCENT" || query.commission === "FIXED"
      ? query.commission
      : undefined;
  const sort = ["newest", "title", "price_low", "commission_high"].includes(
    query.sort ?? "",
  )
    ? (query.sort as "newest" | "title" | "price_low" | "commission_high")
    : "newest";
  const search = query.q?.trim();
  const catalog = await listProductOffersForCreator(allowed.value.creatorId, {
    ...(search ? { q: search } : {}),
    ...(productType ? { productType } : {}),
    ...(commissionType ? { commissionType } : {}),
    sort,
    page: validPage(query.page),
  });
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
      commission: commissionType,
      sort: query.sort && query.sort !== "newest" ? query.sort : undefined,
      ...updates,
    }))
      if (value) values.set(key, value);
    const serialized = values.toString();
    return serialized ? `?${serialized}` : `/${locale}/creator/products`;
  };
  const activeFilterCount = [
    query.q,
    productType,
    commissionType,
    query.sort && query.sort !== "newest",
  ].filter(Boolean).length;
  return (
    <WorkspaceShell
      name={allowed.value.displayName}
      title={t(messages, "catalog.discover.title")}
      intro={t(messages, "catalog.discover.intro")}
    >
      <div className="grid gap-7">
        <nav
          aria-label={t(messages, "catalog.filter.productType")}
          className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-2"
        >
          <Link
            aria-current={!productType ? "page" : undefined}
            className={`shrink-0 border-b-2 px-4 py-3 type-small font-semibold no-underline ${!productType ? "border-signal text-ink" : "border-transparent text-slate-600 hover:text-ink"}`}
            href={queryWith({ type: undefined, page: undefined })}
          >
            {t(messages, "catalog.filter.all")}
          </Link>
          {PRODUCT_TYPES.map((type) => (
            <Link
              aria-current={productType === type ? "page" : undefined}
              className={`shrink-0 border-b-2 px-4 py-3 type-small font-semibold no-underline ${productType === type ? "border-signal text-ink" : "border-transparent text-slate-600 hover:text-ink"}`}
              href={queryWith({ type, page: undefined })}
              key={type}
            >
              {productTypes[type]}
            </Link>
          ))}
        </nav>
        <div className="hidden sm:block">
          <FilterForm messages={messages} query={query} suffix="desktop" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="m-0 type-small text-slate-600">
            {t(messages, "catalog.results").replace(
              "{count}",
              String(catalog.total),
            )}
          </p>
          <MobileFilterSheet
            activeCount={activeFilterCount}
            closeLabel={t(messages, "catalog.filter.close")}
            label={t(messages, "catalog.filter.mobile")}
          >
            <FilterForm messages={messages} query={query} suffix="mobile" />
          </MobileFilterSheet>
        </div>
        <ProductOfferGallery
          locale={locale}
          offers={catalog.items}
          copy={{
            emptyTitle: t(messages, "catalog.discover.emptyTitle"),
            emptyBody: t(messages, "catalog.discover.emptyBody"),
            price: t(messages, "catalog.field.price"),
            commission: t(messages, "catalog.field.rate"),
            cookieWindow: t(messages, "catalog.terms.cookieWindow"),
            days: t(messages, "catalog.terms.days"),
            viewOffer: t(messages, "catalog.viewOffer"),
            activeLink: t(messages, "catalog.activeLink"),
            imageFallback: t(messages, "catalog.image.fallback"),
            productTypes,
          }}
        />
        <CatalogPagination
          page={catalog.page}
          pageCount={catalog.pageCount}
          hrefForPage={(page) =>
            queryWith({ page: page > 1 ? String(page) : undefined })
          }
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
