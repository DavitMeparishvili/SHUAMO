import Decimal from "decimal.js";
import { Button, EmptyState } from "@/src/modules/design-system";

export interface CreatorProductOffer {
  productId: string;
  title: string;
  brandName: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
}

export function LinkOfferList({
  offers,
  createAction,
  copy,
}: {
  offers: readonly CreatorProductOffer[];
  createAction: (formData: FormData) => void | Promise<void>;
  copy: { title: string; empty: string; create: string };
}) {
  if (offers.length === 0)
    return <EmptyState title={copy.title} body={copy.empty} />;
  return (
    <section className="grid gap-4" aria-labelledby="link-offers-title">
      <h2 id="link-offers-title" className="m-0 type-h2 text-ink">
        {copy.title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {offers.map((offer) => {
          const rate =
            offer.commissionType === "PERCENT"
              ? `${new Decimal(offer.commissionValue).times(100).toString()}%`
              : `${offer.commissionValue} ₾`;
          return (
            <article
              className="grid gap-3 rounded-md border border-slate-200 bg-paper p-5"
              key={offer.productId}
            >
              <p className="m-0 type-small font-semibold text-slate-600">
                {offer.brandName}
              </p>
              <h3 className="m-0 type-h3 text-ink">{offer.title}</h3>
              <code className="type-mono text-ink">{rate}</code>
              <form action={createAction}>
                <input type="hidden" name="productId" value={offer.productId} />
                <input
                  type="hidden"
                  name="commissionType"
                  value={offer.commissionType}
                />
                <input
                  type="hidden"
                  name="commissionValue"
                  value={offer.commissionValue}
                />
                <Button type="submit">{copy.create}</Button>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
}
