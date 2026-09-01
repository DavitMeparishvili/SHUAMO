import { notFound, redirect } from "next/navigation";
import { CopyField } from "@/src/modules/design-system";
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
  const prefix = await brandKeyPrefix(allowed.value.brandId);
  return (
    <WorkspaceShell
      name={allowed.value.brandName}
      title={t(messages, "identity.key.title")}
      intro={t(messages, "identity.key.intro")}
    >
      <div className="grid max-w-2xl gap-8">
        {prefix !== undefined ? (
          <CopyField
            value={prefix}
            label={t(messages, "identity.key.currentPrefix")}
            copyLabel={t(messages, "design.copy.copy")}
            copiedLabel={t(messages, "design.copy.copied")}
            copyErrorLabel={t(messages, "design.copy.error")}
          />
        ) : null}
        <BrandKeyGenerator
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
          }}
        />
      </div>
    </WorkspaceShell>
  );
}
