import { notFound, redirect } from "next/navigation";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import {
  brandPerformanceReport,
  WorkspaceOverview,
} from "@/src/modules/conversions";
import { listProductsForBrand } from "@/src/modules/catalog";
export default async function BrandWorkspace({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  const allowed = requireBrand(viewer);
  if (!allowed.ok)
    redirect(
      "/" + locale + (viewer.kind === "creator" ? "/creator" : "/sign-in"),
    );
  const [report, catalog] = await Promise.all([
    brandPerformanceReport(allowed.value.brandId, { period: "30d" }),
    listProductsForBrand(allowed.value.brandId, { pageSize: 3 }),
  ]);
  return (
    <WorkspaceOverview
      locale={locale}
      name={allowed.value.brandName}
      report={report}
      products={catalog.items.map((p) => ({
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
