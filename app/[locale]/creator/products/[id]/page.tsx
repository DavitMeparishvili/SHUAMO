import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banner,
  Button,
  MoneyAmount,
  StatusPill,
} from "@/src/modules/design-system";
import {
  ProductImageGallery,
  productTypeMessageKey,
} from "@/src/modules/catalog";
import { currentViewer, WorkspaceShell } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import { getPublicProductOffer } from "@/src/modules/partnerships";
import { Money } from "@/src/modules/shared";
import { createProductLinkAction } from "../../links/actions";

function textOrFallback(value: string, fallback: string) {
  return value.trim() || fallback;
}

export default async function CreatorProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const [{ locale, id }, viewer] = await Promise.all([params, currentViewer()]);
  if (!isLocale(locale)) notFound();
  const [messages, offer] = await Promise.all([
    Promise.resolve(getMessages(locale)),
    getPublicProductOffer(
      id,
      viewer.kind === "creator" ? viewer.creatorId : undefined,
    ),
  ]);
  if (!offer) notFound();
  const rate =
    offer.commissionType === "PERCENT"
      ? `${new Decimal(offer.commissionValue).times(100).toString()}%`
      : `${new Decimal(offer.commissionValue).toFixed(2)} ₾`;
  const earnings =
    offer.commissionType === "PERCENT"
      ? new Decimal(offer.priceGel)
          .times(offer.commissionValue)
          .toDecimalPlaces(2)
          .toFixed(2)
      : new Decimal(offer.commissionValue).toDecimalPlaces(2).toFixed(2);
  const dateFormat = new Intl.DateTimeFormat(
    locale === "ka" ? "ka-GE" : "en-GB",
    { dateStyle: "medium" },
  );
  const fallback = t(messages, "catalog.terms.notSpecified");
  const payout = t(messages, `catalog.payoutTiming.${offer.payoutTiming}`);
  const channelLabels = offer.allowedChannels.map((channel) =>
    t(messages, `catalog.channel.${channel}`),
  );
  const prohibitedLabels = offer.prohibitedPromotionMethods.map((method) =>
    t(messages, `catalog.prohibited.${method}`),
  );
  const activeLink = offer.links[0];
  return (
    <WorkspaceShell
      name={offer.brandName}
      title={offer.title}
      intro={t(messages, productTypeMessageKey(offer.productType))}
    >
      <div className="grid gap-10">
        <Link
          className="w-fit type-small font-semibold text-slate-600 hover:text-ink"
          href={`/${locale}/products`}
        >
          ← {t(messages, "catalog.backToProducts")}
        </Link>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)] lg:items-start">
          <ProductImageGallery
            images={offer.imageUrls}
            title={offer.title}
            copy={{
              image: t(messages, "catalog.gallery.image"),
              of: t(messages, "catalog.pagination.of"),
              enlarge: t(messages, "catalog.gallery.enlarge"),
              close: t(messages, "catalog.filter.close"),
              empty: t(messages, "catalog.image.fallback"),
            }}
          />
          <aside
            className="grid gap-6 rounded-md bg-paper p-5 shadow-xs lg:sticky lg:top-24 lg:p-6"
            aria-labelledby="offer-summary-title"
          >
            <div>
              <p className="m-0 type-small text-slate-600">
                {offer.brandName} · {offer.sku}
              </p>
              <h2
                className="mb-0 mt-2 type-h2 text-ink"
                id="offer-summary-title"
              >
                {t(messages, "catalog.offerSummary")}
              </h2>
            </div>
            <dl className="m-0 grid gap-4">
              <div className="border-b border-slate-200 pb-4">
                <dt className="type-small text-slate-600">
                  {t(messages, "catalog.field.price")} ·{" "}
                  {t(messages, "catalog.estimate")}
                </dt>
                <dd className="m-0 mt-1">
                  <MoneyAmount value={Money.of(offer.priceGel)} />
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4">
                <div>
                  <dt className="type-small text-slate-600">
                    {t(messages, "catalog.field.rate")}
                  </dt>
                  <dd className="m-0 mt-1 type-figure text-ink">{rate}</dd>
                </div>
                <div>
                  <dt className="type-small text-slate-600">
                    {t(messages, "catalog.rate.estimateEarnings")}
                  </dt>
                  <dd className="m-0 mt-1">
                    <MoneyAmount value={Money.of(earnings)} />
                  </dd>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="type-small text-slate-600">
                    {t(messages, "catalog.terms.cookieWindow")}
                  </dt>
                  <dd className="m-0 mt-1 type-mono text-ink">
                    {offer.cookieWindowDays} {t(messages, "catalog.terms.days")}
                  </dd>
                </div>
                <div>
                  <dt className="type-small text-slate-600">
                    {t(messages, "catalog.terms.eligibility")}
                  </dt>
                  <dd className="m-0 mt-1">
                    <StatusPill
                      label={t(
                        messages,
                        offer.isCreatorEligible
                          ? "catalog.terms.eligible"
                          : "catalog.terms.readOnly",
                      )}
                      state={offer.isCreatorEligible ? "active" : "disabled"}
                    />
                  </dd>
                </div>
              </div>
            </dl>
            {activeLink ? (
              <Banner
                tone="info"
                title={t(messages, "catalog.activeLink")}
                body={t(messages, "catalog.activeLinkBody")}
                action={
                  <Link
                    className="type-small font-semibold text-signal"
                    href={`/${locale}/creator/links`}
                  >
                    {t(messages, "nav.links")}
                  </Link>
                }
              />
            ) : viewer.kind === "creator" && offer.isCreatorEligible ? (
              <form
                action={createProductLinkAction.bind(null, locale)}
                className="grid gap-4"
              >
                <input name="productId" type="hidden" value={offer.id} />
                <input
                  name="commissionType"
                  type="hidden"
                  value={offer.commissionType}
                />
                <input
                  name="commissionValue"
                  type="hidden"
                  value={offer.commissionValue}
                />
                <input
                  name="termsVersion"
                  type="hidden"
                  value={offer.termsVersion}
                />
                <label className="flex cursor-pointer items-start gap-3 rounded-sm bg-slate-50 p-3 type-small text-slate-700">
                  <input
                    className="mt-1 size-4 accent-signal"
                    name="accepted"
                    required
                    type="checkbox"
                  />
                  <span>
                    {t(messages, "catalog.terms.accept").replace(
                      "{version}",
                      String(offer.termsVersion),
                    )}
                  </span>
                </label>
                <Button type="submit">
                  {t(messages, "links.createAtRate")}
                </Button>
              </form>
            ) : viewer.kind === "anonymous" ? (
              <Banner
                tone="info"
                title={t(messages, "catalog.access.signInTitle")}
                body={t(messages, "catalog.access.signInBody")}
                action={
                  <Link
                    className="type-small font-semibold text-signal"
                    href={`/${locale}/sign-in`}
                  >
                    {t(messages, "nav.signIn")}
                  </Link>
                }
              />
            ) : viewer.kind === "creator" ? (
              <Banner
                tone="info"
                title={t(messages, "catalog.access.partnershipTitle")}
                body={t(messages, "catalog.access.partnershipBody")}
                action={
                  <Link
                    className="type-small font-semibold text-signal"
                    href={`/${locale}/brands`}
                  >
                    {t(messages, "catalog.access.browseBrands")}
                  </Link>
                }
              />
            ) : (
              <Banner
                tone="info"
                title={t(messages, "catalog.access.viewOnlyTitle")}
                body={t(messages, "catalog.access.viewOnlyBody")}
              />
            )}
            <a
              className="text-center type-small font-semibold text-slate-600 hover:text-ink"
              href={offer.backlinkUrl}
              rel="noreferrer"
              target="_blank"
            >
              {t(messages, "catalog.openStore")} ↗
            </a>
          </aside>
        </div>
        <section
          className="grid gap-4 border-t border-slate-200 pt-8"
          aria-labelledby="description-title"
        >
          <h2 className="m-0 type-h2 text-ink" id="description-title">
            {t(messages, "catalog.field.description")}
          </h2>
          <p className="m-0 max-w-[72ch] whitespace-pre-line text-slate-700">
            {textOrFallback(offer.description, fallback)}
          </p>
        </section>
        <section
          className="grid gap-6 border-t border-slate-200 pt-8"
          aria-labelledby="terms-title"
        >
          <div className="max-w-[70ch]">
            <h2 className="m-0 type-h2 text-ink" id="terms-title">
              {t(messages, "catalog.terms.title")}
            </h2>
            <p className="mb-0 mt-2 text-slate-600">
              {t(messages, "catalog.terms.intro")}
            </p>
          </div>
          <dl className="m-0 grid gap-x-10 gap-y-6 md:grid-cols-2">
            <div>
              <dt className="type-small font-semibold text-ink">
                {t(messages, "catalog.terms.payoutTiming")}
              </dt>
              <dd className="m-0 mt-2 text-slate-600">{payout}</dd>
            </div>
            <div>
              <dt className="type-small font-semibold text-ink">
                {t(messages, "catalog.terms.allowedChannels")}
              </dt>
              <dd className="m-0 mt-2 text-slate-600">
                {channelLabels.length ? channelLabels.join(", ") : fallback}
              </dd>
            </div>
            <div>
              <dt className="type-small font-semibold text-ink">
                {t(messages, "catalog.terms.prohibitedMethods")}
              </dt>
              <dd className="m-0 mt-2 text-slate-600">
                {prohibitedLabels.length
                  ? prohibitedLabels.join(", ")
                  : fallback}
              </dd>
            </div>
            <div>
              <dt className="type-small font-semibold text-ink">
                {t(messages, "catalog.terms.regions")}
              </dt>
              <dd className="m-0 mt-2 text-slate-600">
                {offer.availableRegions.length
                  ? offer.availableRegions.join(", ")
                  : t(messages, "catalog.terms.allRegions")}
              </dd>
            </div>
            <div>
              <dt className="type-small font-semibold text-ink">
                {t(messages, "catalog.terms.couponPolicy")}
              </dt>
              <dd className="m-0 mt-2 whitespace-pre-line text-slate-600">
                {textOrFallback(offer.couponPolicy, fallback)}
              </dd>
            </div>
            <div>
              <dt className="type-small font-semibold text-ink">
                {t(messages, "catalog.terms.returnPolicy")}
              </dt>
              <dd className="m-0 mt-2 whitespace-pre-line text-slate-600">
                {textOrFallback(offer.returnPolicy, fallback)}
              </dd>
            </div>
            <div>
              <dt className="type-small font-semibold text-ink">
                {t(messages, "catalog.terms.contentRequirements")}
              </dt>
              <dd className="m-0 mt-2 whitespace-pre-line text-slate-600">
                {textOrFallback(offer.contentRequirements, fallback)}
              </dd>
            </div>
            <div>
              <dt className="type-small font-semibold text-ink">
                {t(messages, "catalog.terms.specialTerms")}
              </dt>
              <dd className="m-0 mt-2 whitespace-pre-line text-slate-600">
                {textOrFallback(offer.specialTerms, fallback)}
              </dd>
            </div>
            <div>
              <dt className="type-small font-semibold text-ink">
                {t(messages, "catalog.terms.offerPeriod")}
              </dt>
              <dd className="m-0 mt-2 text-slate-600">
                {offer.offerStartsAt
                  ? dateFormat.format(offer.offerStartsAt)
                  : t(messages, "catalog.terms.openStart")}{" "}
                —{" "}
                {offer.offerEndsAt
                  ? dateFormat.format(offer.offerEndsAt)
                  : t(messages, "catalog.terms.openEnd")}
              </dd>
            </div>
            <div>
              <dt className="type-small font-semibold text-ink">
                {t(messages, "catalog.terms.version")}
              </dt>
              <dd className="m-0 mt-2 type-mono text-slate-600">
                {offer.termsVersion} · {dateFormat.format(offer.termsUpdatedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </WorkspaceShell>
  );
}
