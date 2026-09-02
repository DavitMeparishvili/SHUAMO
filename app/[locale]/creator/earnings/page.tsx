import { notFound, redirect } from "next/navigation";
import {
  creatorPerformanceReport,
  parsePerformanceQuery,
  PerformanceDashboard,
  type PerformanceSearchParams,
} from "@/src/modules/conversions";
import {
  currentViewer,
  requireCreator,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";

export default async function CreatorEarningsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PerformanceSearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const messages = getMessages(locale);
  const state = parsePerformanceQuery(query, "creator");
  const report = await creatorPerformanceReport(
    allowed.value.creatorId,
    state.filters,
  );
  const basePath = `/${locale}/creator/earnings`;
  return (
    <WorkspaceShell
      name={allowed.value.displayName}
      title={t(messages, "performance.title")}
      intro={t(messages, "performance.creatorIntro")}
      contentVariant="plain"
      showName={false}
    >
      <PerformanceDashboard
        basePath={basePath}
        locale={locale}
        messages={messages}
        report={report}
        state={state}
      />
    </WorkspaceShell>
  );
}
