import { notFound, redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import {
  IntegrationGuide,
  integrationCopy,
  recentIntegrationRequests,
} from "@/src/modules/conversions";
import {
  brandKeyPrefix,
  BrandKeyGenerator,
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";

export default async function BrandSettings({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  const allowed = requireBrand(viewer);
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const messages = getMessages(locale);
  const copy = integrationCopy(locale);
  const [prefix, requests] = await Promise.all([
    brandKeyPrefix(allowed.value.brandId),
    recentIntegrationRequests(allowed.value.brandId).catch(() => null),
  ]);
  return (
    <WorkspaceShell
      name={allowed.value.brandName}
      title={copy.title}
      intro={copy.intro}
      contentVariant="plain"
      showName={false}
    >
      <IntegrationGuide
        locale={locale}
        apiBase={new URL(serverEnv().APP_URL).origin}
        requests={requests}
        credentials={
          <BrandKeyGenerator
            prefix={prefix}
            copy={{
              generate: t(messages, "identity.key.generate"),
              generating: t(messages, "identity.key.generating"),
              label: t(messages, "identity.key.label"),
              copy: t(messages, "design.copy.copy"),
              copied: t(messages, "design.copy.copied"),
              copyError: t(messages, "design.copy.error"),
              warningTitle: t(messages, "identity.key.warningTitle"),
              warningBody: t(messages, "identity.key.warningBody"),
              requestError: t(messages, "identity.key.error"),
              prefixLabel: copy.prefixLabel,
              prefixHint: copy.prefixHint,
              rotateWarning: copy.rotateWarning,
              confirm: copy.confirm,
              cancel: copy.cancel,
            }}
          />
        }
      />
    </WorkspaceShell>
  );
}
