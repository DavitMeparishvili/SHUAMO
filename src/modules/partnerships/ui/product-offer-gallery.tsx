import Decimal from "decimal.js";
import Image from "next/image";
import Link from "next/link";
import {
  EmptyState,
  MoneyAmount,
  StatusPill,
} from "@/src/modules/design-system";
import { Money } from "@/src/modules/shared";
import type { ProductTypeValue } from "@/src/modules/catalog";

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
  links: readonly { id: string }[];
}

export function ProductOfferGallery({
  locale,
  offers,
  copy,
}: {
  locale: string;
  offers: readonly CatalogProductOffer[];
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
  };
}) {
  if (offers.length === 0)
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" role="list">
      {offers.map((offer) => {
        const rate =
          offer.commissionType === "PERCENT"
            ? `${new Decimal(offer.commissionValue).times(100).toString()}%`
            : `${new Decimal(offer.commissionValue).toFixed(2)} ₾`;
        return (
          <article
            className="group overflow-hidden rounded-md bg-paper shadow-xs"
            key={offer.id}
            role="listitem"
          >
            <Link
              className="block text-inherit no-underline"
              href={`/${locale}/creator/products/${offer.id}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {offer.imageUrls[0] ? (
                  <Image
                    alt=""
                    className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.025]"
                    fill
                    sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"
                    src={offer.imageUrls[0]}
                    unoptimized
                  />
                ) : (
                  <div className="grid size-full place-items-center text-slate-500">
                    <svg
                      aria-hidden="true"
                      className="size-9"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="m5 16 4-4 3 3 2-2 5 5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <span className="sr-only">{copy.imageFallback}</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3 type-caption text-slate-600">
                  <span>{offer.brandName}</span>
                  <span>{copy.productTypes[offer.productType]}</span>
                </div>
                <h2 className="mb-0 mt-2 type-h3 text-ink group-hover:text-signal">
                  {offer.title}
                </h2>
                {offer.description ? (
                  <p className="mb-0 mt-2 line-clamp-2 type-small text-slate-600">
                    {offer.description}
                  </p>
                ) : null}
                <dl className="mb-0 mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 type-caption">
                  <div>
                    <dt className="text-slate-600">{copy.price}</dt>
                    <dd className="m-0 mt-1">
                      <MoneyAmount size="sm" value={Money.of(offer.priceGel)} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">{copy.commission}</dt>
                    <dd className="m-0 mt-1 type-mono font-semibold text-ink">
                      {rate}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <span className="type-caption text-slate-600">
                    {offer.cookieWindowDays} {copy.days} {copy.cookieWindow}
                  </span>
                  {offer.links.length > 0 ? (
                    <StatusPill label={copy.activeLink} state="active" />
                  ) : (
                    <span className="type-small font-semibold text-signal">
                      {copy.viewOffer} →
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
