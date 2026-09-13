import { notFound, redirect } from "next/navigation";
import { getProductForBrand, ProductForm } from "@/src/modules/catalog";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { getMessages, isLocale } from "@/src/modules/localization";
import { archiveProductAction, updateProductAction } from "../actions";
import { formCopy } from "../form-copy";
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const product = await getProductForBrand(allowed.value.brandId, id);
  if (!product) notFound();
  const messages = getMessages(locale);
  return (
    <ProductForm
      action={updateProductAction.bind(null, locale, id)}
      copy={formCopy(messages)}
      locale={locale}
      brandName={allowed.value.brandName}
      status={product.status}
      initial={{
        id: product.id,
        sku: product.sku,
        title: product.title,
        description: product.description,
        productType: product.productType,
        priceGel: product.priceGel.toString(),
        imageUrls: product.imageUrls,
        backlinkUrl: product.backlinkUrl,
        commissionType: product.commissionType,
        commissionValue: product.commissionValue.toString(),
        cookieWindowDays: product.cookieWindowDays,
        payoutTiming: product.payoutTiming,
        allowedChannels: product.allowedChannels,
        prohibitedPromotionMethods: product.prohibitedPromotionMethods,
        availableRegions: product.availableRegions,
        couponPolicy: product.couponPolicy,
        returnPolicy: product.returnPolicy,
        contentRequirements: product.contentRequirements,
        specialTerms: product.specialTerms,
        offerStartsAt: product.offerStartsAt,
        offerEndsAt: product.offerEndsAt,
      }}
      {...(product.status === "ACTIVE"
        ? { archiveAction: archiveProductAction.bind(null, locale, id) }
        : {})}
    />
  );
}
