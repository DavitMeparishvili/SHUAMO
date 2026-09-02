import Decimal from "decimal.js";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/src/modules/design-system";

export interface CreatorProductOffer {
  productId: string;
  title: string;
  brandName: string;
  imageUrls: readonly string[];
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
}

export function LinkOfferList({
  locale,
  offers,
  copy,
}: {
  locale: string;
  offers: readonly CreatorProductOffer[];
  copy: { title: string; empty: string; browse: string; view: string };
}) {
  if (offers.length === 0)
    return <EmptyState title={copy.title} body={copy.empty} />;
  return (
    <section className="grid gap-4" aria-labelledby="link-offers-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="link-offers-title" className="m-0 type-h2 text-ink">
          {copy.title}
        </h2>
        <Link
          className="type-small font-semibold text-signal"
          href={`/${locale}/creator/products`}
        >
          {copy.browse} →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {offers.slice(0, 6).map((offer) => {
          const rate =
            offer.commissionType === "PERCENT"
              ? `${new Decimal(offer.commissionValue).times(100).toString()}%`
              : `${new Decimal(offer.commissionValue).toFixed(2)} ₾`;
          return (
            <Link
              className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-md bg-paper p-3 text-inherit no-underline shadow-xs hover:shadow-sm"
              href={`/${locale}/creator/products/${offer.productId}`}
              key={offer.productId}
            >
              <div className="relative aspect-square overflow-hidden rounded-sm bg-slate-100">
                {offer.imageUrls[0] ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="72px"
                    src={offer.imageUrls[0]}
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="m-0 type-caption text-slate-600">
                  {offer.brandName}
                </p>
                <h3 className="mb-0 mt-1 truncate type-small font-semibold text-ink">
                  {offer.title}
                </h3>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <code className="type-mono text-ink">{rate}</code>
                  <span className="type-caption font-semibold text-signal">
                    {copy.view}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
