import Link from "next/link";
import Decimal from "decimal.js";
import {
  DataTable,
  EmptyState,
  MoneyAmount,
  StatusPill,
} from "@/src/modules/design-system";
import { Money } from "@/src/modules/shared";

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
    priceGel: { toString(): string };
    commissionType: "PERCENT" | "FIXED";
    commissionValue: { toString(): string };
    status: "ACTIVE" | "ARCHIVED";
    _count: { links: number };
  }[];
  copy: Record<
    | "caption"
    | "sku"
    | "title"
    | "price"
    | "rate"
    | "status"
    | "links"
    | "active"
    | "archived"
    | "emptyTitle"
    | "emptyBody",
    string
  >;
}) {
  if (products.length === 0) {
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  }
  const rows = products.map((product) => ({
    rowId: product.id,
    sku: (
      <Link
        className="font-semibold text-ink"
        href={`/${locale}/brand/products/${product.id}`}
      >
        {product.sku}
      </Link>
    ),
    title: (
      <span
        className={
          product.status === "ARCHIVED" ? "text-slate-500" : "text-ink"
        }
      >
        {product.title}
      </span>
    ),
    price: (
      <MoneyAmount size="sm" value={Money.of(product.priceGel.toString())} />
    ),
    rate: (
      <code className="type-mono">
        {product.commissionType === "PERCENT"
          ? `${new Decimal(product.commissionValue.toString()).times(100).toString()}%`
          : `${product.commissionValue.toString()} ₾`}
      </code>
    ),
    status: (
      <StatusPill
        state={product.status === "ACTIVE" ? "active" : "disabled"}
        label={product.status === "ACTIVE" ? copy.active : copy.archived}
      />
    ),
    links: (
      <Link
        className="type-mono font-semibold text-signal underline decoration-signal-200 underline-offset-4 hover:text-signal-hover"
        href={`/${locale}/brand/products/${product.id}#creator-links`}
      >
        {product._count.links}
        <span className="sr-only">
          {copy.links}: {product.title}
        </span>
      </Link>
    ),
  }));
  return (
    <DataTable
      caption={copy.caption}
      columns={[
        { key: "sku", label: copy.sku },
        { key: "title", label: copy.title },
        { key: "price", label: copy.price, align: "right" },
        { key: "rate", label: copy.rate, align: "right" },
        { key: "status", label: copy.status },
        { key: "links", label: copy.links, align: "right" },
      ]}
      rowKey="rowId"
      rows={rows}
    />
  );
}
