import { notFound, redirect } from "next/navigation";
import {
  listOrdersForBrand,
  OrdersQueue,
  PendingBanner,
  pendingOrderSummary,
} from "@/src/modules/conversions";
import {
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import { decideOrderAction } from "./actions";

export default async function BrandOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const [orders, pending] = await Promise.all([
    listOrdersForBrand(allowed.value.brandId),
    pendingOrderSummary(allowed.value.brandId, new Date()),
  ]);
  const messages = getMessages(locale);
  const statuses = {
    pending: t(messages, "orders.status.pending"),
    confirmed: t(messages, "orders.status.confirmed"),
    cancelled: t(messages, "orders.status.cancelled"),
    unattributed: t(messages, "orders.status.unattributed"),
  };

  return (
    <WorkspaceShell
      name={allowed.value.brandName}
      title={t(messages, "orders.title")}
      intro={t(messages, "orders.intro")}
    >
      <div className="grid gap-6">
        <PendingBanner
          count={pending.count}
          oldestDays={pending.oldestDays}
          copy={{
            title: t(messages, "orders.pending.title"),
            body: t(messages, "orders.pending.body"),
          }}
        />
        <OrdersQueue
          orders={orders}
          locale={locale}
          decisionAction={decideOrderAction.bind(null, locale)}
          copy={{
            emptyTitle: t(messages, "orders.empty.title"),
            emptyBody: t(messages, "orders.empty.body"),
            order: t(messages, "orders.order"),
            date: t(messages, "orders.date"),
            lineItems: t(messages, "orders.lineItems"),
            sku: t(messages, "orders.sku"),
            quantity: t(messages, "orders.quantity"),
            creator: t(messages, "orders.creator"),
            commission: t(messages, "orders.commission"),
            noAttribution: t(messages, "orders.noAttribution"),
            unattributedExplanation: t(
              messages,
              "orders.unattributed.explanation",
            ),
            confirm: t(messages, "orders.confirm"),
            cancel: t(messages, "orders.cancel"),
            pendingAction: t(messages, "orders.actionPending"),
            cancelConfirmedWarning: t(
              messages,
              "orders.cancelConfirmedWarning",
            ),
            statuses,
          }}
        />
      </div>
    </WorkspaceShell>
  );
}
