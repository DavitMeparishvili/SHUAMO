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
      <span className="discovery-cookie">{label}</span>
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
    <div className="discovery-grid management-products" role="list">
      {products.map((product) => {
        const commission = new Decimal(product.commissionValue.toString());
        const rate =
          product.commissionType === "PERCENT"
            ? `${commission.times(100).toString()}%`
            : `${commission.toFixed(2)} ₾`;
        return (
          <article
            className="discovery-card management-product"
            key={product.id}
            role="listitem"
          >
            <div className="discovery-product-image">
              {product.imageUrls[0] ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="(max-width: 639px) 108px, (max-width: 1050px) 40vw, 25vw"
                  src={product.imageUrls[0]}
                  unoptimized
                />
              ) : (
                <ImagePlaceholder label={copy.imageFallback} />
              )}
            </div>
            <div className="discovery-card-body">
              <div className="management-product-meta">
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
              <h2>
                <Link
                  className="text-ink no-underline hover:text-signal"
                  href={`/${locale}/brand/products/${product.id}`}
                >
                  {product.title}
                </Link>
              </h2>
              {product.description ? (
                <p className="mb-0 mt-2 line-clamp-2 max-w-[64ch] type-small text-slate-600">
                  {product.description}
                </p>
              ) : null}
              <dl className="discovery-terms">
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
              className="discovery-primary management-product-action"
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
