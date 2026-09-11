import { notFound, redirect } from "next/navigation";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import {
  CreatorsDirectory,
  listCreatorDirectoryForBrand,
} from "@/src/modules/partnerships";
import { decideAction, inviteAction } from "./actions";

export default async function BrandCreatorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const items = await listCreatorDirectoryForBrand(
    allowed.value.brandId,
    locale,
  );
  return (
    <CreatorsDirectory
      items={items}
      locale={locale}
      decideAction={decideAction.bind(null, locale)}
      inviteAction={inviteAction.bind(null, locale)}
    />
  );
}
