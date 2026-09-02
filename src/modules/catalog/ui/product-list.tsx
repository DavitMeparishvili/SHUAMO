import Decimal from "decimal.js";
import Image from "next/image";
import Link from "next/link";
import {
  EmptyState,
  MoneyAmount,
  StatusPill,
} from "@/src/modules/design-system";
import { Money } from "@/src/modules/shared";
import type { ProductTypeValue } from "../domain/product-taxonomy";

function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="grid size-full place-items-center bg-slate-100 text-slate-500">
      <svg
        aria-hidden="true"
        className="size-7"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="m5 16 4-4 3 3 2-2 5 5M15.5 9.5h.01"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ProductList({
  locale,
  products,
  copy,
}: {
  locale: string;
  products: readonly {
    id: string;
    sku: string;
    title: string;
    description: string;
    productType: ProductTypeValue;
    imageUrls: readonly string[];
    priceGel: { toString(): string };
    commissionType: "PERCENT" | "FIXED";
    commissionValue: { toString(): string };
    cookieWindowDays: number;
    status: "ACTIVE" | "ARCHIVED";
    _count: { links: number };
  }[];
  copy: {
    price: string;
    rate: string;
    links: string;
    active: string;
    archived: string;
    manage: string;
    imageFallback: string;
    cookieWindow: string;
    days: string;
    emptyTitle: string;
    emptyBody: string;
    productTypes: Record<ProductTypeValue, string>;
  };
}) {
  if (products.length === 0)
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  return (
    <div className="grid gap-3" role="list">
      {products.map((product) => {
        const commission = new Decimal(product.commissionValue.toString());
        const rate =
          product.commissionType === "PERCENT"
            ? `${commission.times(100).toString()}%`
            : `${commission.toFixed(2)} ₾`;
        return (
          <article
            className="grid gap-4 rounded-md bg-paper p-3 shadow-xs sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center sm:p-4"
            key={product.id}
            role="listitem"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-slate-100 sm:aspect-square">
              {product.imageUrls[0] ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="(max-width: 639px) 100vw, 112px"
                  src={product.imageUrls[0]}
                  unoptimized
                />
              ) : (
                <ImagePlaceholder label={copy.imageFallback} />
              )}
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 type-caption text-slate-600">
                <span>{copy.productTypes[product.productType]}</span>
                <span aria-hidden="true">·</span>
                <span className="type-mono">{product.sku}</span>
                <StatusPill
                  label={
                    product.status === "ACTIVE" ? copy.active : copy.archived
                  }
                  state={product.status === "ACTIVE" ? "active" : "disabled"}
                />
              </div>
              <Link
                className="type-h3 text-ink no-underline hover:text-signal"
                href={`/${locale}/brand/products/${product.id}`}
              >
                {product.title}
              </Link>
              {product.description ? (
                <p className="mb-0 mt-2 line-clamp-2 max-w-[64ch] type-small text-slate-600">
                  {product.description}
                </p>
              ) : null}
              <dl className="mb-0 mt-4 grid grid-cols-2 gap-x-5 gap-y-2 type-caption sm:flex sm:flex-wrap sm:gap-6">
                <div>
                  <dt className="text-slate-600">{copy.price}</dt>
                  <dd className="m-0 mt-1">
                    <MoneyAmount
                      size="sm"
                      value={Money.of(product.priceGel.toString())}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">{copy.rate}</dt>
                  <dd className="m-0 mt-1 type-mono font-semibold text-ink">
                    {rate}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">{copy.cookieWindow}</dt>
                  <dd className="m-0 mt-1 type-mono text-ink">
                    {product.cookieWindowDays} {copy.days}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">{copy.links}</dt>
                  <dd className="m-0 mt-1 type-mono text-ink">
                    {product._count.links}
                  </dd>
                </div>
              </dl>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-pill border border-slate-300 px-5 type-small font-semibold text-ink no-underline hover:border-ink sm:self-center"
              href={`/${locale}/brand/products/${product.id}`}
            >
              {copy.manage}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
