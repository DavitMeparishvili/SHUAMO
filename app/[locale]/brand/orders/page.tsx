import { notFound, redirect } from "next/navigation";
import { listOrdersForBrand, OrdersQueue } from "@/src/modules/conversions";
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
  const orders = await listOrdersForBrand(allowed.value.brandId);
  const messages = getMessages(locale);
  // Format once on the server: browser ICU may not include Georgian locale data.
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "ka" ? "ka-GE" : "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tbilisi",
    },
  );
  const statuses = {
    confirmed: t(messages, "orders.status.confirmed"),
    cancelled: t(messages, "orders.status.cancelled"),
  };

  return (
    <WorkspaceShell
      name={allowed.value.brandName}
      title={t(messages, "orders.title")}
      intro={t(messages, "orders.intro")}
      contentVariant="plain"
      showName={false}
    >
      <div className="grid gap-6">
        <OrdersQueue
          orders={orders}
          locale={locale}
          formattedDates={Object.fromEntries(
            orders.map((order) => [
              order.id,
              dateFormatter.format(new Date(order.occurredAt)),
            ]),
          )}
          decisionAction={decideOrderAction.bind(null, locale)}
          copy={{
            emptyTitle: t(messages, "orders.empty.title"),
            all: t(messages, "orders.all"),
            search: t(messages, "orders.search"),
            searchPlaceholder: t(messages, "orders.searchPlaceholder"),
            details: t(messages, "orders.details"),
            products: t(messages, "orders.products"),
            explanation: t(messages, "orders.explanation"),
            cancelledNote: t(messages, "orders.cancelledNote"),
            noResults: t(messages, "orders.noResults"),
            reset: t(messages, "orders.reset"),
            previous: t(messages, "orders.previous"),
            next: t(messages, "orders.next"),
            page: t(messages, "orders.page"),
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
