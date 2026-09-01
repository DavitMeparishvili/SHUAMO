import { notFound, redirect } from "next/navigation";
import { ProductForm } from "@/src/modules/catalog";
import {
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
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
    <WorkspaceShell
      name={allowed.value.brandName}
      title={t(messages, "catalog.newTitle")}
      intro={t(messages, "catalog.newIntro")}
    >
      <ProductForm
        action={createProductAction.bind(null, locale)}
        copy={formCopy(messages)}
      />
    </WorkspaceShell>
  );
}
