import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AccountStatusControl, accountStatusCopy } from "@/src/modules/finance";
import {
  prismaTeamRepository,
  TeamSettingsControl,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  BrandProfile,
  CreatorProfile,
  getBrandProfileForAdmin,
  getCreatorProfileForAdmin,
} from "@/src/modules/profiles";

export const dynamic = "force-dynamic";

export default async function AdminProfileReviewPage({
  params,
}: {
  params: Promise<{ locale: string; kind: string; id: string }>;
}) {
  const { locale, kind, id } = await params;
  if (
    !isLocale(locale) ||
    (kind !== "brand" && kind !== "creator") ||
    !z.uuid().safeParse(id).success
  )
    notFound();
  const review =
    kind === "brand"
      ? await getBrandProfileForAdmin(id)
      : await getCreatorProfileForAdmin(id);
  if (!review) notFound();
  const [team, leads] =
    kind === "creator"
      ? await Promise.all([
          prismaTeamRepository.settings(id),
          prismaTeamRepository.listLeads(),
        ])
      : [undefined, []];
  const messages = getMessages(locale);
  const statusCopy = accountStatusCopy(messages);
  const tab = kind === "brand" ? "brands" : "creators";
  const role = t(messages, `admin.accounts.role.${kind}`);
  const publication =
    review.publicationStatus === "PUBLISHED"
      ? t(messages, "admin.accounts.profile.published")
      : review.publicationStatus === "DRAFT"
        ? t(messages, "admin.accounts.profile.draft")
        : t(messages, "admin.accounts.profile.none");
  return (
    <div className="finance-surface workspace-content admin-profile-review">
      <header className="admin-profile-review-heading">
        <div>
          <Link href={`/${locale}/admin/finance?tab=${tab}`}>
            {t(messages, "admin.accounts.back")}
          </Link>
          <h1>{review.account.name}</h1>
          <p>
            {role} · {review.account.email} · {publication}
          </p>
        </div>
        <AccountStatusControl
          kind={kind}
          id={id}
          name={review.account.name}
          initialStatus={review.account.status}
          copy={statusCopy}
          expanded
        />
      </header>
      {team ? (
        <TeamSettingsControl
          creatorId={id}
          locale={locale}
          initial={team}
          leads={leads}
        />
      ) : null}
      <p className="finance-note admin-profile-review-note">
        {t(messages, "admin.accounts.previewNote")}
      </p>
      {review.profile ? (
        <section className="finance-panel admin-profile-preview">
          {review.kind === "brand" ? (
            <BrandProfile
              profile={review.profile}
              locale={locale}
              preview
              showApprovalBadge={review.account.status === "APPROVED"}
              copy={brandCopy(messages)}
            />
          ) : (
            <CreatorProfile
              profile={review.profile}
              locale={locale}
              preview
              copy={creatorCopy(messages)}
            />
          )}
        </section>
      ) : (
        <section className="finance-panel admin-profile-empty">
          <h2>{t(messages, "admin.accounts.empty.title")}</h2>
          <p>{t(messages, "admin.accounts.empty.body")}</p>
          <Link
            className="finance-button"
            href={`/${locale}/admin/finance?tab=${tab}`}
          >
            {t(messages, "admin.accounts.empty.action")}
          </Link>
        </section>
      )}
    </div>
  );
}

function brandCopy(messages: Record<string, string>) {
  return {
    preview: t(messages, "admin.accounts.profile.preview"),
    approved: t(messages, "profile.approved"),
    story: t(messages, "profile.story"),
    whatWeMake: t(messages, "profile.whatWeMake"),
    products: t(messages, "profile.featuredProducts"),
    interests: t(messages, "profile.interests"),
    socials: t(messages, "profile.socials"),
    leave: t(messages, "profile.leave"),
    fallback: t(messages, "profile.fallback"),
    heroAlt: t(messages, "profile.brandHeroAlt"),
    logoAlt: t(messages, "profile.brandLogoAlt"),
    socialLabels: socialLabels(messages),
  };
}

function creatorCopy(messages: Record<string, string>) {
  return {
    preview: t(messages, "admin.accounts.profile.preview"),
    approved: t(messages, "profile.approved"),
    ledger: t(messages, "profile.ledger"),
    disclosure: t(messages, "profile.disclosure"),
    work: t(messages, "profile.featuredWork"),
    leave: t(messages, "profile.leave"),
    fallback: t(messages, "profile.fallback"),
    source: t(messages, "profile.source"),
    languages: t(messages, "profile.languages"),
    contentFormats: t(messages, "profile.contentFormats"),
    heroAlt: t(messages, "profile.creatorHeroAlt"),
    workAlt: t(messages, "profile.workImageAlt"),
    socialLabels: socialLabels(messages),
  };
}

function socialLabels(messages: Record<string, string>) {
  return {
    website: t(messages, "profile.social.website"),
    instagram: t(messages, "profile.social.instagram"),
    tiktok: t(messages, "profile.social.tiktok"),
    youtube: t(messages, "profile.social.youtube"),
    facebook: t(messages, "profile.social.facebook"),
    linkedin: t(messages, "profile.social.linkedin"),
  };
}
