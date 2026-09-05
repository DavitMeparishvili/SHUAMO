import Decimal from "decimal.js";
import Link from "next/link";
import { setLinkStatusAction } from "./actions";
import { notFound, redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import { Button, Field, Select } from "@/src/modules/design-system";
import { brandLinkPerformanceSnapshots } from "@/src/modules/conversions";
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
  requireBrand,
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

function FilterForm({
  messages,
  query,
  creators,
  suffix,
  locale,
}: {
  messages: Messages;
  query: Query;
  creators: readonly { id: string; name: string }[];
  suffix: string;
  locale: string;
}) {
  return (
    <form
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,auto))_auto] lg:items-end"
      method="get"
    >
      {query.type ? (
        <input type="hidden" name="type" value={query.type} />
      ) : null}
      <Field
        defaultValue={query.q}
        id={`link-search-${suffix}`}
        label={t(messages, "catalog.filter.search")}
        name="q"
        placeholder={t(messages, "catalog.filter.searchPlaceholder")}
        type="search"
      />
      <Select
        defaultValue={query.creator ?? ""}
        id={`link-creator-${suffix}`}
        label={t(messages, "links.creator")}
        name="creator"
      >
        <option value="">{t(messages, "links.filter.anyCreator")}</option>
        {creators.map((creator) => (
          <option key={creator.id} value={creator.id}>
            {creator.name}
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
        <option value="creator">{t(messages, "links.sort.creator")}</option>
        <option value="commission_high">
          {t(messages, "catalog.sort.commissionHigh")}
        </option>
      </Select>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit">{t(messages, "catalog.filter.apply")}</Button>
        <Link
          className="inline-flex min-h-11 items-center px-3 type-small font-semibold text-slate-600 hover:text-ink"
          href={`/${locale}/brand/links`}
        >
          {t(messages, "catalog.filter.clear")}
        </Link>
      </div>
    </form>
  );
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
    <WorkspaceShell
      name={allowed.value.brandName}
      title={t(messages, "links.brandTitle")}
      intro={t(messages, "links.brandIntro")}
      contentVariant="plain"
      showName={false}
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
          <FilterForm
            creators={creators}
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
              creators={creators}
              locale={locale}
              messages={messages}
              query={query}
              suffix="mobile"
            />
          </MobileFilterSheet>
        </div>
        <LinkList
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
      </div>
    </WorkspaceShell>
  );
}
