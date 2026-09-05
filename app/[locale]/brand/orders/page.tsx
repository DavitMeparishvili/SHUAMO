import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/src/modules/localization";
import type { PerformanceSearchParams } from "@/src/modules/conversions";
export default async function BrandSalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PerformanceSearchParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    if (typeof value === "string") query.set(key, value);
  query.set("tab", "sales");
  redirect(`/${locale}/brand/performance?${query}`);
}
