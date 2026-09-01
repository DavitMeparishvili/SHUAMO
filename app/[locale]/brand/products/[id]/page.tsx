import { notFound, redirect } from "next/navigation";
import { Banner } from "@/src/modules/design-system";
import { getProductForBrand, ProductForm } from "@/src/modules/catalog";
import {
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import { archiveProductAction, updateProductAction } from "../actions";
import { formCopy } from "../form-copy";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ locale, id }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const [messages, product] = await Promise.all([
    Promise.resolve(getMessages(locale)),
    getProductForBrand(allowed.value.brandId, id),
  ]);
  if (!product) notFound();
  return (
    <WorkspaceShell
      name={allowed.value.brandName}
      title={product.title}
      intro={t(messages, "catalog.editIntro")}
    >
      <div className="grid gap-8">
        {query.created !== undefined ? (
          <Banner
            tone="info"
            title={t(messages, "catalog.createdTitle")}
            body={t(messages, "catalog.createdBody").replace(
              "{count}",
              query.created,
            )}
          />
        ) : null}
        <ProductForm
          action={updateProductAction.bind(null, locale, id)}
          copy={formCopy(messages)}
          initial={{
            id: product.id,
            sku: product.sku,
            title: product.title,
            description: product.description,
            priceGel: product.priceGel.toString(),
            imageUrls: product.imageUrls,
            backlinkUrl: product.backlinkUrl,
            commissionType: product.commissionType,
            commissionValue: product.commissionValue.toString(),
          }}
          {...(product.status === "ACTIVE"
            ? { archiveAction: archiveProductAction.bind(null, locale, id) }
            : {})}
        />
      </div>
    </WorkspaceShell>
  );
}
