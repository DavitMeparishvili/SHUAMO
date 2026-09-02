import {
  EmptyState,
  MoneyAmount,
  StatusPill,
} from "@/src/modules/design-system";
import { Money } from "@/src/modules/shared";
import type { ConversionStatus } from "../domain/order-transitions";

export function EarningsList({
  rows,
  locale,
  copy,
}: {
  rows: readonly {
    id: string;
    orderId: string;
    brandName: string;
    sku: string;
    occurredAt: string;
    status: ConversionStatus;
    commissionAmount: string;
  }[];
  locale: "ka" | "en";
  copy: {
    emptyTitle: string;
    emptyBody: string;
    order: string;
    date: string;
    product: string;
    commission: string;
    statuses: Record<Lowercase<ConversionStatus>, string>;
  };
}) {
  if (rows.length === 0)
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  const dates = new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-GB", {
    dateStyle: "medium",
    timeZone: "Asia/Tbilisi",
  });
  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const state = row.status.toLowerCase() as Lowercase<ConversionStatus>;
        return (
          <article
            className="grid gap-3 rounded-md border border-slate-200 bg-paper p-5 sm:grid-cols-[1fr_auto] sm:items-center"
            key={row.id}
          >
            <div className="grid gap-1">
              <h2 className="m-0 type-h3 text-ink">{row.brandName}</h2>
              <p className="m-0 type-small text-slate-600">
                {copy.order} #{row.orderId} · {copy.product} {row.sku} ·{" "}
                {copy.date} {dates.format(new Date(row.occurredAt))}
              </p>
              <div className="mt-1">
                <StatusPill state={state} label={copy.statuses[state]} />
              </div>
            </div>
            <div className="grid justify-items-start gap-1 sm:justify-items-end">
              <span className="type-caption text-slate-600">
                {copy.commission}
              </span>
              <MoneyAmount value={Money.of(row.commissionAmount)} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
