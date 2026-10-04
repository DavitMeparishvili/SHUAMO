import { profileIsPublished } from "@/src/infrastructure/profile-onboarding";
import { readOwnFinance } from "@/src/infrastructure/finance-services";
import { FinanceSummary } from "@/src/modules/finance";
import "@/app/finance.css";
import { notFound, redirect } from "next/navigation";
import { currentViewer, requireCreator } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import {
  creatorPerformanceReport,
  WorkspaceOverview,
  parsePerformanceQuery,
  type PerformanceSearchParams,
} from "@/src/modules/conversions";
import {
  listCreatorLinkCatalog,
  listPublicProductOffers,
} from "@/src/modules/partnerships";
import { serverEnv } from "@/src/config/env";
export default async function CreatorWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PerformanceSearchParams>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const state = parsePerformanceQuery(query, "creator");
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  const allowed = requireCreator(viewer);
  if (!allowed.ok)
    redirect("/" + locale + (viewer.kind === "brand" ? "/brand" : "/sign-in"));
  if (query.setup !== "later" && !(await profileIsPublished(viewer)))
    redirect(`/${locale}/creator/profile`);
  const [report, links, offers, finance] = await Promise.all([
    creatorPerformanceReport(allowed.value.creatorId, state.filters),
    listCreatorLinkCatalog(allowed.value.creatorId, {
      resolution: "ACTIVE",
      pageSize: 100,
    }),
    listPublicProductOffers({ pageSize: 3 }, allowed.value.creatorId),
    readOwnFinance(viewer, { page: 1 }, true),
  ]);
  const ranking = new Map(report.breakdowns.products.map((p, i) => [p.id, i]));
  const products = [...links.items]
    .sort(
      (a, b) =>
        (ranking.get(a.product.id) ?? 999) - (ranking.get(b.product.id) ?? 999),
    )
    .slice(0, 3)
    .map((l) => ({
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
      finance={
        finance.ok ? (
          <FinanceSummary account={finance.value} locale={locale} />
        ) : null
      }
      state={state}
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
