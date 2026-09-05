import { notFound, redirect } from "next/navigation";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import {
  brandPerformanceReport,
  WorkspaceOverview,
  parsePerformanceQuery,
  type PerformanceSearchParams,
} from "@/src/modules/conversions";
import { listProductsForBrand } from "@/src/modules/catalog";
export default async function BrandWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PerformanceSearchParams>;
}) {
  const { locale } = await params;
  const state = parsePerformanceQuery(await searchParams, "brand");
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  const allowed = requireBrand(viewer);
  if (!allowed.ok)
    redirect(
      "/" + locale + (viewer.kind === "creator" ? "/creator" : "/sign-in"),
    );
  const [report, catalog] = await Promise.all([
    brandPerformanceReport(allowed.value.brandId, state.filters),
    listProductsForBrand(allowed.value.brandId, { pageSize: 100 }),
  ]);
  return (
    <WorkspaceOverview
      state={state}
      locale={locale}
      name={allowed.value.brandName}
      report={report}
      products={[...catalog.items]
        .sort(
          (a, b) =>
            (report.breakdowns.products.findIndex((p) => p.id === a.id) < 0
              ? 999
              : report.breakdowns.products.findIndex((p) => p.id === a.id)) -
            (report.breakdowns.products.findIndex((p) => p.id === b.id) < 0
              ? 999
              : report.breakdowns.products.findIndex((p) => p.id === b.id)),
        )
        .slice(0, 3)
        .map((p) => ({
          id: p.id,
          title: p.title,
          brandName: allowed.value.brandName,
          imageUrl: p.imageUrls[0],
          price: p.priceGel.toString(),
          commissionType: p.commissionType,
          commissionValue: p.commissionValue.toString(),
        }))}
      discover={[]}
    />
  );
}
