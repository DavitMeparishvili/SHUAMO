import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/src/modules/design-system";
import {
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";

export default async function BrandWorkspace({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  const allowed = requireBrand(viewer);
  if (!allowed.ok) {
    if (viewer.kind === "creator") redirect(`/${locale}/creator`);
    redirect(`/${locale}/sign-in`);
  }
  const messages = getMessages(locale);
  return (
    <WorkspaceShell
      name={allowed.value.brandName}
      title={t(messages, "identity.brand.title")}
      intro={t(messages, "identity.brand.intro")}
    >
      <EmptyState
        title={t(messages, "identity.brand.emptyTitle")}
        body={t(messages, "identity.brand.emptyBody")}
      />
    </WorkspaceShell>
  );
}
