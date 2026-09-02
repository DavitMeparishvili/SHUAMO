import { notFound, redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import { brandLinkPerformanceSnapshots } from "@/src/modules/conversions";
import {
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import { CatalogPagination } from "@/src/modules/catalog";
import {
  BrandLinkList,
  listResolvedLinksForBrand,
} from "@/src/modules/partnerships";
import { setLinkStatusAction } from "./actions";

export default async function BrandLinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const [messages, links] = await Promise.all([
    Promise.resolve(getMessages(locale)),
    listResolvedLinksForBrand(allowed.value.brandId),
  ]);
  const requestedPage = typeof query.page === "string" ? Number(query.page) : 1;
  const pageCount = Math.max(Math.ceil(links.length / 12), 1);
  const page = Math.min(
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageCount,
  );
  const visibleLinks = links.slice((page - 1) * 12, page * 12);
  const performance = await brandLinkPerformanceSnapshots(
    allowed.value.brandId,
    visibleLinks.map((link) => link.id),
  );

  return (
    <WorkspaceShell
      name={allowed.value.brandName}
      title={t(messages, "links.brandTitle")}
      intro={t(messages, "links.brandIntro")}
    >
      <div className="grid gap-6">
        <BrandLinkList
          locale={locale}
          links={visibleLinks}
          performance={performance}
          baseUrl={serverEnv().APP_URL}
          setStatusAction={setLinkStatusAction.bind(null, locale)}
          copy={{
            emptyTitle: t(messages, "links.brandEmptyTitle"),
            emptyBody: t(messages, "links.brandEmptyBody"),
            active: t(messages, "links.active"),
            link: t(messages, "links.link"),
            creator: t(messages, "links.creator"),
            rate: t(messages, "links.rate"),
            enable: t(messages, "links.enable"),
            disable: t(messages, "links.disable"),
            copy: t(messages, "design.copy.copy"),
            copied: t(messages, "design.copy.copied"),
            copyError: t(messages, "design.copy.error"),
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
          copy={{
            label: t(messages, "links.pagination.label"),
            previous: t(messages, "catalog.pagination.previous"),
            next: t(messages, "catalog.pagination.next"),
            page: t(messages, "catalog.pagination.page"),
            of: t(messages, "catalog.pagination.of"),
          }}
          hrefForPage={(nextPage) =>
            nextPage > 1
              ? `/${locale}/brand/links?page=${nextPage}`
              : `/${locale}/brand/links`
          }
          page={page}
          pageCount={pageCount}
        />
      </div>
    </WorkspaceShell>
  );
}
