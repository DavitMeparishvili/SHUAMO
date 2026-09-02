import { notFound, redirect } from "next/navigation";
import {
  EarningsList,
  listEarningsForCreator,
} from "@/src/modules/conversions";
import {
  currentViewer,
  requireCreator,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";

export default async function CreatorEarningsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const [rows, messages] = await Promise.all([
    listEarningsForCreator(allowed.value.creatorId),
    Promise.resolve(getMessages(locale)),
  ]);
  return (
    <WorkspaceShell
      name={allowed.value.displayName}
      title={t(messages, "earnings.title")}
      intro={t(messages, "earnings.intro")}
    >
      <EarningsList
        rows={rows}
        locale={locale}
        copy={{
          emptyTitle: t(messages, "earnings.empty.title"),
          emptyBody: t(messages, "earnings.empty.body"),
          order: t(messages, "orders.order"),
          date: t(messages, "orders.date"),
          product: t(messages, "earnings.product"),
          commission: t(messages, "orders.commission"),
          statuses: {
            pending: t(messages, "orders.status.pending"),
            confirmed: t(messages, "orders.status.confirmed"),
            cancelled: t(messages, "orders.status.cancelled"),
            unattributed: t(messages, "orders.status.unattributed"),
          },
        }}
      />
    </WorkspaceShell>
  );
}
