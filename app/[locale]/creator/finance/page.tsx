import { notFound, redirect } from "next/navigation";
import { currentViewer } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import { AccountFinance, tbilisiToday } from "@/src/modules/finance";
import { readOwnFinance } from "@/src/infrastructure/finance-services";
import "@/app/finance.css";
export default async function OwnerFinance({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    invoicePage?: string;
    record?: string;
  }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  if (viewer.kind === "anonymous") redirect(`/${locale}/sign-in`);
  if (viewer.kind !== "creator") notFound();
  const result = await readOwnFinance(viewer, {
    page: Number(query.page || 1),
    invoicePage: Number(query.invoicePage || 1),
    ...(query.record ? { record: query.record } : {}),
  });
  if (!result.ok) notFound();
  return (
    <AccountFinance
      account={result.value}
      locale={locale}
      requestKey={crypto.randomUUID()}
      today={tbilisiToday()}
    />
  );
}
