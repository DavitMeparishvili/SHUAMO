import { notFound, redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import {
  brandProductCreators,
  ProductCreatorsView,
  ProductCreatorsDrawer,
  productWorkspaceQuery,
  catalogueReturnPath,
  type PerformanceSearchParams,
} from "@/src/modules/conversions";
import { changeProductLinkStatus } from "./link-actions";
export async function CreatorsRoute({
  params,
  searchParams,
  drawer = false,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<PerformanceSearchParams>;
  drawer?: boolean;
}) {
  const [{ locale, id }, raw] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const query = productWorkspaceQuery(raw);
  const data = await brandProductCreators(allowed.value.brandId, id, query);
  if (!data) notFound();
  const view = (
    <ProductCreatorsView
      data={data}
      query={query}
      locale={locale}
      baseUrl={serverEnv().APP_URL}
      returnTo={catalogueReturnPath(
        locale,
        typeof raw.returnTo === "string" ? raw.returnTo : undefined,
      )}
      drawer={drawer}
      changeStatus={changeProductLinkStatus.bind(null, locale)}
    />
  );
  return drawer ? (
    <ProductCreatorsDrawer title={data.product.title}>
      {view}
    </ProductCreatorsDrawer>
  ) : (
    view
  );
}
