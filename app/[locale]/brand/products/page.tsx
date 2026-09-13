import { notFound, redirect } from "next/navigation";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import { PRODUCT_TYPES, productTypeMessageKey } from "@/src/modules/catalog";
import {
  brandProductCatalogue,
  BrandProductCatalogue,
  productWorkspaceQuery,
  type PerformanceSearchParams,
} from "@/src/modules/conversions";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PerformanceSearchParams>;
}) {
  const [{ locale }, raw] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const query = productWorkspaceQuery(raw);
  const data = await brandProductCatalogue(allowed.value.brandId, query);
  const messages = getMessages(locale);
  return (
    <BrandProductCatalogue
      data={data}
      query={query}
      locale={locale}
      productTypes={PRODUCT_TYPES.map((value) => ({
        value,
        label: t(messages, productTypeMessageKey(value)),
      }))}
    />
  );
}
