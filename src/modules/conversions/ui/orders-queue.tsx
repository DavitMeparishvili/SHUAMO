import {
  EmptyState,
  MoneyAmount,
  StatusPill,
} from "@/src/modules/design-system";
import { Money } from "@/src/modules/shared";
import type {
  ConversionStatus,
  OrderAction,
} from "../domain/order-transitions";
import type { ConversionView } from "../ports/conversion-repository";
import { OrderDecisionForm } from "./order-decision-form";

function statusState(status: ConversionStatus) {
  return status.toLowerCase() as Lowercase<ConversionStatus>;
}

export function OrdersQueue({
  orders,
  locale,
  decisionAction,
  copy,
}: {
  orders: readonly ConversionView[];
  locale: "ka" | "en";
  decisionAction: (
    conversionId: string,
    action: OrderAction,
  ) => void | Promise<void>;
  copy: {
    emptyTitle: string;
    emptyBody: string;
    order: string;
    date: string;
    lineItems: string;
    sku: string;
    quantity: string;
    creator: string;
    commission: string;
    noAttribution: string;
    unattributedExplanation: string;
    cancel: string;
    pendingAction: string;
    cancelConfirmedWarning: string;
    statuses: Record<Lowercase<ConversionStatus>, string>;
  };
}) {
  if (orders.length === 0) {
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  }
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "ka" ? "ka-GE" : "en-GB",
    { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tbilisi" },
  );
  return (
    <div className="grid gap-5">
      {orders.map((order) => (
        <article
          className="grid gap-5 rounded-md border border-slate-200 bg-paper p-5 shadow-xs"
          key={order.id}
        >
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-1">
              <h2 className="m-0 type-h3 text-ink">
                {copy.order} #{order.orderId}
              </h2>
              <p className="m-0 type-small text-slate-600">
                {copy.date}: {dateFormatter.format(new Date(order.occurredAt))}
              </p>
            </div>
            <StatusPill
              state={statusState(order.status)}
              label={copy.statuses[statusState(order.status)]}
            />
          </header>

          {!order.items.some((item) => item.attribution !== undefined) ? (
            <p className="m-0 max-w-[70ch] type-small text-slate-700">
              {copy.unattributedExplanation}
            </p>
          ) : null}

          <div
            className="max-w-full overflow-x-auto"
            role="region"
            tabIndex={0}
          >
            <table className="w-full min-w-[620px] border-collapse type-small">
              <caption className="pb-2 text-left font-semibold text-ink">
                {copy.lineItems}
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-slate-600">
                  <th className="px-3 py-2 text-left" scope="col">
                    {copy.sku}
                  </th>
                  <th className="px-3 py-2 text-right" scope="col">
                    {copy.quantity}
                  </th>
                  <th className="px-3 py-2 text-left" scope="col">
                    {copy.creator}
                  </th>
                  <th className="px-3 py-2 text-right" scope="col">
                    {copy.commission}
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr
                    className="border-b border-slate-200 last:border-0"
                    key={item.id}
                  >
                    <td className="px-3 py-3 font-mono text-ink">{item.sku}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {item.qty}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {item.attribution?.creatorName ?? copy.noAttribution}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <MoneyAmount
                        size="sm"
                        value={Money.of(
                          item.attribution?.commissionAmount ?? "0.00",
                        )}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
            <p className="m-0 flex items-baseline gap-2 type-small font-semibold text-slate-700">
              {copy.commission}
              <MoneyAmount size="sm" value={Money.of(order.commissionAmount)} />
            </p>
            {order.status === "CONFIRMED" ? (
              <OrderDecisionForm
                conversionId={order.id}
                action="CANCEL"
                decisionAction={decisionAction}
                label={copy.cancel}
                pendingLabel={copy.pendingAction}
                confirmation={copy.cancelConfirmedWarning}
              />
            ) : null}
          </footer>
        </article>
      ))}
    </div>
  );
}
