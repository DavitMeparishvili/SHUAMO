import { notFound, redirect } from "next/navigation";
import { Button, EmptyState } from "@/src/modules/design-system";
import { prismaProductRepository } from "@/src/modules/catalog";
import {
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  listApprovedCreatorsForBrand,
  listPartnershipsForBrand,
  PartnershipQueue,
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
  const [partnerships, candidates, activeProducts] = await Promise.all([
    listPartnershipsForBrand(allowed.value.brandId),
    listApprovedCreatorsForBrand(allowed.value.brandId),
    prismaProductRepository.listActiveForBrand(allowed.value.brandId),
  ]);
  const messages = getMessages(locale);
  return (
    <WorkspaceShell
      name={allowed.value.brandName}
      title={t(messages, "partnership.brand.title")}
      intro={t(messages, "partnership.brand.intro")}
    >
      <div className="grid gap-10">
        <section className="grid gap-4">
          <h2 className="m-0 type-h2 text-ink">
            {t(messages, "partnership.applications")}
          </h2>
          <PartnershipQueue
            partnerships={partnerships}
            activeProductCount={activeProducts.length}
            decideAction={decideAction.bind(null, locale)}
            copy={{
              emptyTitle: t(messages, "partnership.empty.title"),
              emptyBody: t(messages, "partnership.empty.body"),
              approve: t(messages, "partnership.approve"),
              reject: t(messages, "partnership.reject"),
              pending: t(messages, "partnership.status.pending"),
              approved: t(messages, "partnership.status.approved"),
              rejected: t(messages, "partnership.status.rejected"),
              mintNotice: t(messages, "partnership.mintNotice"),
              remove: t(messages, "partnership.remove"),
              removeNotice: t(messages, "partnership.removeNotice"),
              restore: t(messages, "partnership.restore"),
            }}
          />
        </section>
        <section className="grid gap-4">
          <h2 className="m-0 type-h2 text-ink">
            {t(messages, "partnership.invite.title")}
          </h2>
          {candidates.length === 0 ? (
            <EmptyState
              title={t(messages, "partnership.invite.emptyTitle")}
              body={t(messages, "partnership.invite.emptyBody")}
            />
          ) : (
            <div className="grid gap-3">
              {candidates.map((creator) => (
                <article
                  className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-paper p-5"
                  key={creator.id}
                >
                  <h3 className="m-0 type-h3 text-ink">
                    {creator.displayName}
                  </h3>
                  <form action={inviteAction.bind(null, locale, creator.id)}>
                    <Button type="submit">
                      {t(messages, "partnership.invite.action")}
                    </Button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
