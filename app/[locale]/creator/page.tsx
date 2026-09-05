import { notFound, redirect } from "next/navigation";
import { currentViewer, requireCreator } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import {
  creatorPerformanceReport,
  WorkspaceOverview,
} from "@/src/modules/conversions";
import {
  listCreatorLinkCatalog,
  listPublicProductOffers,
} from "@/src/modules/partnerships";
import { serverEnv } from "@/src/config/env";
export default async function CreatorWorkspace({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  const allowed = requireCreator(viewer);
  if (!allowed.ok)
    redirect("/" + locale + (viewer.kind === "brand" ? "/brand" : "/sign-in"));
  const [report, links, offers] = await Promise.all([
    creatorPerformanceReport(allowed.value.creatorId, { period: "30d" }),
    listCreatorLinkCatalog(allowed.value.creatorId, {
      resolution: "ACTIVE",
      pageSize: 3,
    }),
    listPublicProductOffers({ pageSize: 3 }, allowed.value.creatorId),
  ]);
  const products = links.items.map((l) => ({
    id: l.product.id,
    title: l.product.title,
    brandName: l.product.brand.name,
    imageUrl: l.product.imageUrls[0],
    price: l.product.priceGel.toFixed(2),
    commissionType: l.commissionType,
    commissionValue: l.commissionValue.toString(),
    linkId: l.id,
    linkUrl: serverEnv().APP_URL + "/r/" + l.code,
  }));
  return (
    <WorkspaceOverview
      locale={locale}
      name={allowed.value.displayName}
      report={report}
      products={products}
      discover={offers.items.map((p) => ({
        ...p,
        price: p.priceGel,
        imageUrl: p.imageUrls[0],
      }))}
    />
  );
}
