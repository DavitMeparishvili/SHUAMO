import { notFound, redirect } from "next/navigation";
import { currentViewer, requireAdmin } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import { parseAdminPerformanceQuery } from "@/src/modules/conversions";
import { AdminPerformance } from "@/src/modules/finance";
import {
  adminPerformanceReport,
  adminProductPerformanceReport,
  adminPerformanceFinance,
  adminPerformanceOptions,
} from "./admin-performance-services";
export async function renderAdminPerformance(
  locale: string,
  raw: Record<string, string | string[] | undefined>,
  surface: "performance" | "products",
  id?: string,
) {
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer(),
    access = requireAdmin(viewer);
  if (!access.ok) {
    if (access.error === "unauthenticated") redirect(`/${locale}/admin/login`);
    notFound();
  }
  const parsed = parseAdminPerformanceQuery({
    ...raw,
    ...(surface === "products" ? { tab: "products" } : {}),
  });
  if (!parsed.ok)
    return (
      <div className="finance-surface workspace-content">
        <h1>
          {locale === "ka" ? "ფილტრები არასწორია" : "Invalid report filters"}
        </h1>
        <p role="alert">
          {locale === "ka"
            ? "შეამოწმეთ თარიღები და არჩეული ანგარიშები."
            : "Check the dates and selected accounts."}
        </p>
        <a className="finance-button" href={`/${locale}/admin/${surface}`}>
          {locale === "ka" ? "ფილტრების გასუფთავება" : "Reset filters"}
        </a>
      </div>
    );
  const q = parsed.value;
  const [result, options] = await Promise.all([
    id
      ? adminProductPerformanceReport(viewer, id, q)
      : adminPerformanceReport(viewer, q),
    adminPerformanceOptions(viewer),
  ]);
  if (!result.ok) notFound();
  const rows = result.value.rows.items;
  const f = await adminPerformanceFinance(viewer, {
    from: q.from,
    to: q.to,
    brandIds: rows.filter((r) => r.kind === "brand").map((r) => r.id),
    creatorIds: rows.filter((r) => r.kind === "creator").map((r) => r.id),
  });
  if (!f.ok) notFound();
  const listPath = `/${locale}/admin/${raw.returnTo === "performance" ? "performance" : "products"}`;
  const listPage =
    typeof raw.listPage === "string" && /^[1-9]\d*$/.test(raw.listPage)
      ? raw.listPage
      : "1";
  return (
    <AdminPerformance
      report={result.value}
      finance={f.value}
      options={options}
      locale={locale}
      basePath={`/${locale}/admin/${surface}${id ? `/${id}` : ""}`}
      listPath={listPath}
      listPage={listPage}
    />
  );
}
