import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/src/modules/design-system";
import {
  currentViewer,
  requireCreator,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";

export default async function CreatorWorkspace({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  const allowed = requireCreator(viewer);
  if (!allowed.ok) {
    if (viewer.kind === "brand") redirect(`/${locale}/brand`);
    redirect(`/${locale}/sign-in`);
  }
  const messages = getMessages(locale);
  return (
    <WorkspaceShell
      name={allowed.value.displayName}
      title={t(messages, "identity.creator.title")}
      intro={t(messages, "identity.creator.intro")}
    >
      <EmptyState
        title={t(messages, "identity.creator.emptyTitle")}
        body={t(messages, "identity.creator.emptyBody")}
      />
    </WorkspaceShell>
  );
}
