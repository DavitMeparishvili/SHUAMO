import { notFound, redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import {
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  BrandLinkList,
  listResolvedLinksForBrand,
} from "@/src/modules/partnerships";
import { setLinkStatusAction } from "./actions";

export default async function BrandLinksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const [messages, links] = await Promise.all([
    Promise.resolve(getMessages(locale)),
    listResolvedLinksForBrand(allowed.value.brandId),
  ]);

  return (
    <WorkspaceShell
      name={allowed.value.brandName}
      title={t(messages, "links.brandTitle")}
      intro={t(messages, "links.brandIntro")}
    >
      <BrandLinkList
        links={links}
        baseUrl={serverEnv().APP_URL}
        setStatusAction={setLinkStatusAction.bind(null, locale)}
        copy={{
          emptyTitle: t(messages, "links.brandEmptyTitle"),
          emptyBody: t(messages, "links.brandEmptyBody"),
          active: t(messages, "links.active"),
          link: t(messages, "links.link"),
          creator: t(messages, "links.creator"),
          rate: t(messages, "links.rate"),
          enable: t(messages, "links.enable"),
          disable: t(messages, "links.disable"),
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
