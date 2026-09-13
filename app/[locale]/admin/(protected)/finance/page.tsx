import { notFound } from "next/navigation";
import { currentViewer } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import { AdminFinance } from "@/src/modules/finance";
import {
  readAdminAccounts,
  readAdminTransactions,
} from "@/src/infrastructure/finance-services";
export default async function FinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const tab = query.tab || "brands",
    q = query.q || "",
    page = Number(query.page || "1");
  if (
    typeof tab !== "string" ||
    !["brands", "creators", "transactions"].includes(tab) ||
    typeof q !== "string" ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 1000000 ||
    Array.isArray(query.page)
  )
    notFound();
  const viewer = await currentViewer();
  if (tab === "transactions") {
    const result = await readAdminTransactions(viewer, { query: q, page });
    if (!result.ok) notFound();
    return (
      <AdminFinance
        locale={locale}
        tab={tab}
        q={q}
        transactions={result.value}
      />
    );
  }
  const result = await readAdminAccounts(
    viewer,
    tab === "brands" ? "brand" : "creator",
    { query: q, page },
  );
  if (!result.ok) notFound();
  return (
    <AdminFinance locale={locale} tab={tab} q={q} accounts={result.value} />
  );
}
