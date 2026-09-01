import { notFound, redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import {
  currentViewer,
  requireCreator,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  LinkList,
  listResolvedLinksForCreator,
} from "@/src/modules/partnerships";

export default async function CreatorLinksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const [messages, links] = await Promise.all([
    Promise.resolve(getMessages(locale)),
    listResolvedLinksForCreator(allowed.value.creatorId),
  ]);
  return (
    <WorkspaceShell
      name={allowed.value.displayName}
      title={t(messages, "links.title")}
      intro={t(messages, "links.intro")}
    >
      <LinkList
        links={links}
        baseUrl={serverEnv().APP_URL}
        copy={{
          emptyTitle: t(messages, "links.emptyTitle"),
          emptyBody: t(messages, "links.emptyBody"),
          active: t(messages, "links.active"),
          link: t(messages, "links.link"),
          rate: t(messages, "links.rate"),
          copy: t(messages, "design.copy.copy"),
          copied: t(messages, "design.copy.copied"),
          copyError: t(messages, "design.copy.error"),
          reasons: {
            BRAND_DISABLED: t(messages, "links.reason.BRAND_DISABLED"),
            CREATOR_REMOVED: t(messages, "links.reason.CREATOR_REMOVED"),
            PRODUCT_ARCHIVED: t(messages, "links.reason.PRODUCT_ARCHIVED"),
            LINK_DISABLED: t(messages, "links.reason.LINK_DISABLED"),
          },
        }}
      />
    </WorkspaceShell>
  );
}
