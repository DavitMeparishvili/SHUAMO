import { notFound, redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import { Banner } from "@/src/modules/design-system";
import { brandLinkPerformanceSnapshots } from "@/src/modules/conversions";
import { getProductForBrand, ProductForm } from "@/src/modules/catalog";
import {
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  BrandLinkList,
  listResolvedLinksForBrandProduct,
} from "@/src/modules/partnerships";
import { setLinkStatusAction } from "../../links/actions";
import { archiveProductAction, updateProductAction } from "../actions";
import { formCopy } from "../form-copy";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  const [{ locale, id }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const [messages, product, links] = await Promise.all([
    Promise.resolve(getMessages(locale)),
    getProductForBrand(allowed.value.brandId, id),
    listResolvedLinksForBrandProduct(allowed.value.brandId, id),
  ]);
  if (!product) notFound();
  const performance = await brandLinkPerformanceSnapshots(
    allowed.value.brandId,
    links.map((link) => link.id),
  );
  return (
    <WorkspaceShell
      name={allowed.value.brandName}
      title={product.title}
      intro={t(messages, "catalog.editIntro")}
    >
      <div className="grid gap-12">
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
        {query.saved !== undefined ? (
          <Banner
            tone="info"
            title={t(messages, "catalog.savedTitle")}
            body={t(messages, "catalog.savedBody")}
          />
        ) : null}
        <ProductForm
          action={updateProductAction.bind(null, locale, id)}
          copy={formCopy(messages)}
          initial={{
            id: product.id,
            sku: product.sku,
            title: product.title,
            description: product.description,
            productType: product.productType,
            priceGel: product.priceGel.toString(),
            imageUrls: product.imageUrls,
            backlinkUrl: product.backlinkUrl,
            commissionType: product.commissionType,
            commissionValue: product.commissionValue.toString(),
            cookieWindowDays: product.cookieWindowDays,
            payoutTiming: product.payoutTiming,
            allowedChannels: product.allowedChannels,
            prohibitedPromotionMethods: product.prohibitedPromotionMethods,
            availableRegions: product.availableRegions,
            couponPolicy: product.couponPolicy,
            returnPolicy: product.returnPolicy,
            contentRequirements: product.contentRequirements,
            specialTerms: product.specialTerms,
            offerStartsAt: product.offerStartsAt,
            offerEndsAt: product.offerEndsAt,
          }}
          {...(product.status === "ACTIVE"
            ? { archiveAction: archiveProductAction.bind(null, locale, id) }
            : {})}
        />
        <section
          aria-labelledby="creator-links-title"
          className="grid scroll-mt-8 gap-5"
          id="creator-links"
        >
          <div className="grid max-w-2xl gap-2">
            <h2 className="m-0 type-h2 text-ink" id="creator-links-title">
              {t(messages, "catalog.creatorLinks.title")}
            </h2>
            <p className="m-0 text-slate-600">
              {t(messages, "catalog.creatorLinks.intro")}
            </p>
          </div>
          <BrandLinkList
            baseUrl={serverEnv().APP_URL}
            locale={locale}
            copy={{
              emptyTitle: t(messages, "catalog.creatorLinks.emptyTitle"),
              emptyBody: t(messages, "catalog.creatorLinks.emptyBody"),
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
            links={links}
            performance={performance}
            setStatusAction={setLinkStatusAction.bind(null, locale)}
            showProduct={false}
          />
        </section>
      </div>
    </WorkspaceShell>
  );
}
