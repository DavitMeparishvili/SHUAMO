import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
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
  LinkList,
  listCreatorLinkBrands,
  listCreatorLinkCatalog,
} from "@/src/modules/partnerships";

type Query = {
  q?: string;
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

function FilterForm({
  messages,
  query,
  brands,
  suffix,
  locale,
}: {
  messages: Messages;
  query: Query;
  brands: readonly { id: string; name: string }[];
  suffix: string;
  locale: string;
}) {
  return (
    <form
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,auto))_auto] lg:items-end"
      method="get"
    >
      <Field
        defaultValue={query.q}
        id={`link-search-${suffix}`}
        label={t(messages, "catalog.filter.search")}
        name="q"
        placeholder={t(messages, "catalog.filter.searchPlaceholder")}
        type="search"
      />
      <Select
        defaultValue={query.brand ?? ""}
        id={`link-brand-${suffix}`}
        label={t(messages, "links.filter.brand")}
        name="brand"
      >
        <option value="">{t(messages, "links.filter.anyBrand")}</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </Select>
      <Select
        defaultValue={query.status ?? ""}
        id={`link-status-${suffix}`}
        label={t(messages, "links.filter.status")}
        name="status"
      >
        <option value="">{t(messages, "links.filter.anyStatus")}</option>
        <option value="ACTIVE">{t(messages, "links.active")}</option>
        <option value="DISABLED">
          {t(messages, "links.filter.unavailable")}
        </option>
      </Select>
      <Select
        defaultValue={query.sort ?? "newest"}
        id={`link-sort-${suffix}`}
        label={t(messages, "catalog.filter.sort")}
        name="sort"
      >
        <option value="newest">{t(messages, "catalog.sort.newest")}</option>
        <option value="title">{t(messages, "catalog.sort.title")}</option>
        <option value="brand">{t(messages, "links.sort.brand")}</option>
        <option value="commission_high">
          {t(messages, "catalog.sort.commissionHigh")}
        </option>
      </Select>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit">{t(messages, "catalog.filter.apply")}</Button>
        <Link
          className="inline-flex min-h-11 items-center px-3 type-small font-semibold text-slate-600 hover:text-ink"
          href={`/${locale}/creator/links`}
        >
          {t(messages, "catalog.filter.clear")}
        </Link>
      </div>
    </form>
  );
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
  const productType =
    query.type && isProductType(query.type) ? query.type : undefined;
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
  const [catalog, brands] = await Promise.all([
    listCreatorLinkCatalog(allowed.value.creatorId, {
      ...(search ? { q: search } : {}),
      ...(productType ? { productType } : {}),
      ...(brandId ? { brandId } : {}),
      ...(resolution ? { resolution } : {}),
      sort,
      page: validPage(query.page),
      pageSize: 6,
    }),
    listCreatorLinkBrands(allowed.value.creatorId),
  ]);
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
      brand: brandId,
      status: resolution,
      sort: query.sort && query.sort !== "newest" ? query.sort : undefined,
      ...updates,
    }))
      if (value) values.set(key, value);
    const serialized = values.toString();
    return serialized ? `?${serialized}` : `/${locale}/creator/links`;
  };
  const activeFilterCount = [
    query.q,
    productType,
    brandId,
    resolution,
    query.sort && query.sort !== "newest",
  ].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;
  return (
    <WorkspaceShell
      name={allowed.value.displayName}
      title={t(messages, "links.title")}
      intro={t(messages, "links.intro")}
      contentVariant="plain"
      showName={false}
    >
      <div
        className="grid gap-7"
        data-links-direction-contract="THESIS: product imagery identifies where every creator link leads, while copying remains a distinct utility. OWN-WORLD: SHUAMO paper, ink, signal indigo, editorial product crops, restrained borders, and mono link data. STORY: creators filter their links, recognize a product, open its detail page, or copy its tracking URL. FIRST VIEWPORT: product-type navigation, compact filters, result count, and a three-column gallery of product-first link cards. FORM: Active Product Gallery, fifth grounded structure, seed de440c92. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md"
      >
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
          <FilterForm
            brands={brands}
            locale={locale}
            messages={messages}
            query={query}
            suffix="desktop"
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="m-0 type-small text-slate-600">
            {t(messages, "links.results").replace(
              "{count}",
              String(catalog.total),
            )}
          </p>
          <MobileFilterSheet
            activeCount={activeFilterCount}
            closeLabel={t(messages, "catalog.filter.close")}
            label={t(messages, "catalog.filter.mobile")}
          >
            <FilterForm
              brands={brands}
              locale={locale}
              messages={messages}
              query={query}
              suffix="mobile"
            />
          </MobileFilterSheet>
        </div>
        <LinkList
          locale={locale}
          links={catalog.items}
          baseUrl={serverEnv().APP_URL}
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
      </div>
    </WorkspaceShell>
  );
}
