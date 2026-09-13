import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  brandPerformanceReport,
  parsePerformanceQuery,
  PerformanceDashboard,
  type PerformanceSearchParams,
} from "@/src/modules/conversions";
import {
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";

export default async function BrandPerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PerformanceSearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const messages = getMessages(locale);
  const state = parsePerformanceQuery(query, "brand");
  const report = await brandPerformanceReport(
    allowed.value.brandId,
    state.filters,
  );
  return (
    <WorkspaceShell
      contentVariant="plain"
      intro={t(messages, "performance.brandIntro")}
      name={allowed.value.brandName}
      showName={false}
      title={t(messages, "performance.title")}
    >
      <Link className="pl-legacy-link" href={`/${locale}/brand/links`}>{locale === "ka" ? "ყველა თვალთვალის ბმული" : "All tracking links"}</Link>
      <PerformanceDashboard
        basePath={`/${locale}/brand/performance`}
        locale={locale}
        messages={messages}
        report={report}
        state={state}
      />
    </WorkspaceShell>
  );
}
