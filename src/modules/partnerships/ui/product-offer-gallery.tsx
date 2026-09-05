import Decimal from "decimal.js";
import Image from "next/image";
import Link from "next/link";
import { EmptyState, Icon } from "@/src/modules/design-system";
import type { ProductTypeValue } from "@/src/modules/catalog";
import { CopyOfferLink, SaveProductButton } from "./discovery-card-actions";

export interface CatalogProductOffer {
  id: string;
  brandName: string;
  title: string;
  description: string;
  productType: ProductTypeValue;
  priceGel: string;
  imageUrls: readonly string[];
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
  cookieWindowDays: number;
  links: readonly { id: string; code?: string }[];
}

export function ProductOfferGallery({
  locale,
  offers,
  copy,
  baseUrl = "",
  savedScope = "guest",
}: {
  locale: string;
  offers: readonly CatalogProductOffer[];
  baseUrl?: string;
  savedScope?: string;
  copy: {
    emptyTitle: string;
    emptyBody: string;
    price: string;
    commission: string;
    cookieWindow: string;
    days: string;
    viewOffer: string;
    activeLink: string;
    imageFallback: string;
    productTypes: Record<ProductTypeValue, string>;
    save: string;
    unsave: string;
    copyLink: string;
    copied: string;
    copyError: string;
  };
}) {
  if (!offers.length)
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  return (
    <div className="discovery-grid" role="list">
      {offers.map((offer, index) => {
        const commission =
          offer.commissionType === "PERCENT"
            ? `${new Decimal(offer.commissionValue).times(100).toString()}%`
            : `${new Decimal(offer.commissionValue).toFixed(2)} ₾`;
        const href = `/${locale}/products/${offer.id}`;
        const activeLink = offer.links[0];
        return (
          <article className="discovery-card" key={offer.id} role="listitem">
            <Link
              className="discovery-product-image"
              href={href}
              aria-label={offer.title}
              tabIndex={-1}
            >
              {offer.imageUrls[0] ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  loading={index === 0 ? "eager" : "lazy"}
                  sizes="(max-width: 639px) 108px, (max-width: 1050px) 40vw, 25vw"
                  src={offer.imageUrls[0]}
                  unoptimized
                />
              ) : (
                <span className="discovery-image-fallback">
                  <Icon name="box" />
                  <span>{copy.imageFallback}</span>
                </span>
              )}
            </Link>
            <SaveProductButton
              id={offer.id}
              scope={savedScope}
              saveLabel={`${copy.save}: ${offer.title}`}
              unsaveLabel={`${copy.unsave}: ${offer.title}`}
            />
            <div className="discovery-card-body">
              <p className="discovery-brand">{offer.brandName}</p>
              <h2>
                <Link href={href}>{offer.title}</Link>
              </h2>
              <dl className="discovery-terms">
                <div>
                  <dt>{copy.price}</dt>
                  <dd>{new Decimal(offer.priceGel).toFixed(2)} ₾</dd>
                </div>
                <div className="discovery-commission">
                  <dt>{copy.commission}</dt>
                  <dd>{commission}</dd>
                </div>
              </dl>
              <p className="discovery-cookie">
                {offer.cookieWindowDays} {copy.days} {copy.cookieWindow}
              </p>
              {activeLink ? (
                <div className="discovery-active-link">
                  <Link href={href}>
                    <Icon name="link" />
                    <span>{copy.activeLink}</span>
                  </Link>
                  {activeLink.code ? (
                    <CopyOfferLink
                      url={`${baseUrl.replace(/\/$/, "")}/r/${activeLink.code}`}
                      label={copy.copyLink}
                      copiedLabel={copy.copied}
                      errorLabel={copy.copyError}
                    />
                  ) : null}
                </div>
              ) : (
                <Link className="discovery-primary" href={href}>
                  {copy.viewOffer}
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
