import { notFound, redirect } from "next/navigation";
import { createProductReservation } from "@/src/infrastructure/product-upload-reservation";
import { ProductForm } from "@/src/modules/catalog";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { getMessages, isLocale } from "@/src/modules/localization";
import { createProductAction } from "../actions";
import { formCopy } from "../form-copy";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const messages = getMessages(locale);
  return (
    <ProductForm
      action={createProductAction.bind(null, locale)}
      copy={formCopy(messages)}
      locale={locale}
      brandName={allowed.value.brandName}
      uploadReservation={createProductReservation(allowed.value.brandId)}
    />
  );
}
