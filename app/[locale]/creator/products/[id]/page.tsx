import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import { Banner, Button, Icon } from "@/src/modules/design-system";
import {
  ProductImageGallery,
  ProductTermGroup,
  productTypeMessageKey,
} from "@/src/modules/catalog";
import { currentViewer } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  CopyOfferLink,
  getPublicProductOffer,
  parseAcceptedOfferTerms,
} from "@/src/modules/partnerships";
import { createProductLinkAction } from "../../links/actions";

export default async function CreatorProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const [{ locale, id }, viewer] = await Promise.all([params, currentViewer()]);
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  const offer = await getPublicProductOffer(
    id,
    viewer.kind === "creator" ? viewer.creatorId : undefined,
    viewer.kind === "brand" ? viewer.brandId : undefined,
  );
  if (!offer) notFound();
  const canEdit = viewer.kind === "brand" && viewer.brandId === offer.brandId;
  const copy = (key: string) => t(messages, key);
  const activeLink = offer.links[0];
  const accepted = parseAcceptedOfferTerms(activeLink?.acceptedTerms);
  const terms = accepted ?? offer;
  const commissionType = activeLink?.commissionType ?? offer.commissionType;
  const commissionValue = activeLink?.commissionValue ?? offer.commissionValue;
  const rate =
    commissionType === "PERCENT"
      ? new Decimal(commissionValue).times(100).toString() + "%"
      : new Decimal(commissionValue).toFixed(2) + " ₾";
  const earnings =
    commissionType === "PERCENT"
      ? new Decimal(offer.priceGel).times(commissionValue).toFixed(2)
      : new Decimal(commissionValue).toFixed(2);
  const dateFormat = new Intl.DateTimeFormat(
    locale === "ka" ? "ka-GE" : "en-GB",
    { dateStyle: "medium", timeZone: "UTC" },
  );
  const fallback = copy("catalog.terms.notSpecified");
  const text = (value: string) => value.trim() || fallback;
  const groups: { title: string; intro: string; items: [string, string][] }[] =
    [
      {
        title: "catalog.detail.payoutGroup",
        intro: "",
        items: [
          [
            "catalog.terms.payoutTiming",
            copy("catalog.payoutTiming." + terms.payoutTiming),
          ],
          [
            "catalog.terms.offerPeriod",
            (terms.offerStartsAt
              ? dateFormat.format(terms.offerStartsAt)
              : copy("catalog.terms.openStart")) +
              " — " +
              (terms.offerEndsAt
                ? dateFormat.format(terms.offerEndsAt)
                : copy("catalog.terms.openEnd")),
          ],
        ],
      },
      {
        title: "catalog.detail.promotionGroup",
        intro: "catalog.detail.promotionIntro",
        items: [
          [
            "catalog.terms.allowedChannels",
            terms.allowedChannels
              .map((channel) => copy("catalog.channel." + channel))
              .join(", ") || fallback,
          ],
          [
            "catalog.terms.prohibitedMethods",
            terms.prohibitedPromotionMethods
              .map((method) => copy("catalog.prohibited." + method))
              .join(", ") || fallback,
          ],
          [
            "catalog.terms.contentRequirements",
            text(terms.contentRequirements),
          ],
          ["catalog.terms.couponPolicy", text(terms.couponPolicy)],
        ],
      },
      {
        title: "catalog.detail.conditionsGroup",
        intro: "catalog.detail.conditionsIntro",
        items: [
          [
            "catalog.terms.regions",
            terms.availableRegions.join(", ") ||
              copy("catalog.terms.allRegions"),
          ],
          ["catalog.terms.returnPolicy", text(terms.returnPolicy)],
          ["catalog.terms.specialTerms", text(terms.specialTerms)],
        ],
      },
    ];
  return (
    <div className="product-detail">
      <div className="product-detail-toolbar">
        <Link
          className="product-detail-back"
          href={canEdit ? `/${locale}/brand/products` : `/${locale}/products`}
        >
          <Icon name="arrow" />
          {copy("catalog.backToProducts")}
        </Link>
        {canEdit && (
          <Link
            className="product-detail-edit"
            href={`/${locale}/brand/products/${offer.id}`}
          >
            {copy("catalog.detail.edit")}
          </Link>
        )}
      </div>
      {offer.status === "ARCHIVED" && (
        <p className="product-detail-owner-notice" role="status">
          {copy("catalog.detail.archivedOwner")}
        </p>
      )}
      <div className="product-detail-grid">
        <header className="product-detail-heading">
          <div className="product-detail-category">
            <Link href={`/${locale}/products?brand=${offer.brandId}`}>
              {offer.brandName}
            </Link>
            <span>{copy(productTypeMessageKey(offer.productType))}</span>
          </div>
          <h1>{offer.title}</h1>
        </header>
        <div className="product-detail-gallery">
          <ProductImageGallery
            images={offer.imageUrls}
            title={offer.title}
            copy={{
              image: copy("catalog.gallery.image"),
              of: copy("catalog.pagination.of"),
              enlarge: copy("catalog.gallery.enlarge"),
              previous: copy("catalog.gallery.previous"),
              next: copy("catalog.gallery.next"),
              close: copy("catalog.filter.close"),
              empty: copy("catalog.image.fallback"),
            }}
          />
        </div>
        <aside
          className="product-detail-offer"
          aria-labelledby="offer-summary-title"
        >
          <div className="product-detail-offer-heading">
            <h2 id="offer-summary-title">{copy("catalog.detail.offer")}</h2>
            {activeLink ? (
              <span className="product-detail-active">
                <span />
                {copy("catalog.activeLink")}
              </span>
            ) : null}
          </div>
          <dl className="product-detail-commission">
            <dt>{copy("catalog.detail.commission")}</dt>
            <dd>{rate}</dd>
            <dd className="product-detail-per-sale">
              {copy("catalog.detail.perSale")}
            </dd>
          </dl>
          <dl className="product-detail-facts">
            <div>
              <dt>
                {copy("catalog.field.price")} · {copy("catalog.estimate")}
              </dt>
              <dd>{new Decimal(offer.priceGel).toFixed(2)} ₾</dd>
            </div>
            <div>
              <dt>{copy("catalog.detail.attribution")}</dt>
              <dd>
                {terms.cookieWindowDays} {copy("catalog.terms.days")}
              </dd>
            </div>
            <div>
              <dt>{copy("catalog.terms.eligibility")}</dt>
              <dd>
                <span
                  className={
                    offer.isCreatorEligible
                      ? "product-detail-eligible"
                      : "product-detail-readonly"
                  }
                >
                  {copy(
                    offer.isCreatorEligible
                      ? "catalog.terms.eligible"
                      : "catalog.terms.readOnly",
                  )}
                </span>
              </dd>
            </div>
            <div>
              <dt>{copy("catalog.detail.earnings")}</dt>
              <dd>{earnings} ₾</dd>
            </div>
          </dl>
          {activeLink ? (
            <div className="product-detail-link">
              <p className="product-detail-notice">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v6m0-10v1" />
                </svg>
                {copy(
                  accepted
                    ? "catalog.detail.savedTerms"
                    : "catalog.detail.legacyTerms",
                )}
              </p>
              <CopyOfferLink
                url={new URL(
                  "/r/" + activeLink.code,
                  serverEnv().APP_URL,
                ).toString()}
                label={copy("catalog.detail.copy")}
                copiedLabel={copy("design.copy.copied")}
                errorLabel={copy("design.copy.error")}
              />
              <Link
                className="product-detail-manage"
                href={`/${locale}/creator/links?brand=${offer.brandId}&q=${encodeURIComponent(offer.sku)}`}
              >
                {copy("catalog.detail.manage")}
              </Link>
            </div>
          ) : viewer.kind === "creator" && offer.isCreatorEligible ? (
            <form
              action={createProductLinkAction.bind(null, locale)}
              className="product-detail-accept"
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
              <label>
                <input name="accepted" required type="checkbox" />
                <span>
                  {copy("catalog.terms.accept").replace(
                    "{version}",
                    String(offer.termsVersion),
                  )}
                </span>
              </label>
              <Button type="submit">{copy("links.createAtRate")}</Button>
            </form>
          ) : (
            <Banner
              tone="info"
              title={copy(
                viewer.kind === "anonymous"
                  ? "catalog.access.signInTitle"
                  : viewer.kind === "creator"
                    ? "catalog.access.partnershipTitle"
                    : "catalog.access.viewOnlyTitle",
              )}
              body={copy(
                viewer.kind === "anonymous"
                  ? "catalog.access.signInBody"
                  : viewer.kind === "creator"
                    ? "catalog.access.partnershipBody"
                    : "catalog.access.viewOnlyBody",
              )}
              action={
                viewer.kind === "anonymous" ? (
                  <Link href={`/${locale}/sign-in`}>{copy("nav.signIn")}</Link>
                ) : viewer.kind === "creator" ? (
                  <Link href={`/${locale}/brands`}>
                    {copy("catalog.access.browseBrands")}
                  </Link>
                ) : undefined
              }
            />
          )}
          <a
            className="product-detail-store"
            href={offer.backlinkUrl}
            rel="noreferrer"
            target="_blank"
          >
            {copy("catalog.detail.store")}
            <Icon name="arrow" />
          </a>
        </aside>
        <section
          className="product-detail-description"
          aria-labelledby="description-title"
        >
          <h2 id="description-title">{copy("catalog.detail.about")}</h2>
          <p>{text(offer.description)}</p>
          <p className="product-detail-sku">SKU · {offer.sku}</p>
        </section>
      </div>
      <section className="product-detail-terms" aria-labelledby="terms-title">
        <header>
          <h2 id="terms-title">{copy("catalog.terms.title")}</h2>
          <p className="product-detail-version">
            {copy(
              accepted
                ? "catalog.detail.acceptedVersion"
                : "catalog.terms.version",
            )}{" "}
            · {accepted?.version ?? offer.termsVersion} ·{" "}
            {dateFormat.format(
              accepted && activeLink
                ? activeLink.termsAcceptedAt
                : offer.termsUpdatedAt,
            )}
          </p>
          <p className="product-detail-terms-intro">
            {copy(
              accepted ? "catalog.detail.termsIntro" : "catalog.terms.intro",
            )}
          </p>
        </header>
        {groups.map((group, index) => (
          <ProductTermGroup key={group.title} initiallyOpen={index === 0}>
            <summary>
              <span className="product-detail-term-number">{index + 1}</span>
              <span className="product-detail-term-title">
                {copy(group.title)}
              </span>
              {group.intro ? (
                <span className="product-detail-term-preview">
                  {copy(group.intro)}
                </span>
              ) : null}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <dl>
              {group.items.map(([key, value]) => (
                <div key={key}>
                  <dt>{copy(key)}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </ProductTermGroup>
        ))}
      </section>
    </div>
  );
}
