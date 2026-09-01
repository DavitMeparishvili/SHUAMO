import { notFound, redirect } from "next/navigation";
import {
  currentViewer,
  requireCreator,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  CreatorBrandList,
  listBrandsForCreator,
} from "@/src/modules/partnerships";
import { applyAction } from "./actions";

export default async function CreatorBrandsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const [messages, brands] = await Promise.all([
    Promise.resolve(getMessages(locale)),
    listBrandsForCreator(allowed.value.creatorId),
  ]);
  return (
    <WorkspaceShell
      name={allowed.value.displayName}
      title={t(messages, "partnership.creator.title")}
      intro={t(messages, "partnership.creator.intro")}
    >
      <CreatorBrandList
        brands={brands}
        applyAction={applyAction.bind(null, locale)}
        copy={{
          emptyTitle: t(messages, "partnership.brands.emptyTitle"),
          emptyBody: t(messages, "partnership.brands.emptyBody"),
          apply: t(messages, "partnership.apply"),
          pending: t(messages, "partnership.status.pending"),
          approved: t(messages, "partnership.status.approved"),
          rejected: t(messages, "partnership.status.rejected"),
        }}
      />
    </WorkspaceShell>
  );
}
