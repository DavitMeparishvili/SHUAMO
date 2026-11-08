import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { currentViewer } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  CreatorProfile,
  getProfilePartnership,
  getPublicCreatorProfile,
  listPublicCreatorShop,
} from "@/src/modules/profiles";
import { ProfileAction } from "@/src/modules/profiles";
import { inviteFromProfile } from "./actions";
export const dynamic = "force-dynamic";
const getProfile = cache(getPublicCreatorProfile);
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const profile = await getProfile(slug);
  if (!profile) return { robots: { index: false, follow: false } };
  const description =
    (locale === "ka" ? profile.taglineKa : profile.taglineEn) ||
    (locale === "ka" ? profile.taglineEn : profile.taglineKa);
  return {
    title: `${profile.creator.displayName} — Xurjin`,
    description,
    alternates: {
      canonical: `/${locale}/creators/${slug}`,
      languages: { ka: `/ka/creators/${slug}`, en: `/en/creators/${slug}` },
    },
    openGraph: { images: profile.heroImageUrl ? [profile.heroImageUrl] : [] },
  };
}
export default async function CreatorPublicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [profile, viewer] = await Promise.all([
    getProfile(slug),
    currentViewer(),
  ]);
  if (!profile) notFound();
  // Started now so it runs alongside the viewer-specific lookups below.
  const shopItems = listPublicCreatorShop(profile.creatorId);
  const messages = getMessages(locale);
  let action = (
    <ProfileAction
      kind="link"
      href={`/${locale}/sign-in?returnTo=${encodeURIComponent(`/${locale}/creators/${slug}`)}`}
      label={t(messages, "profile.signInToConnect")}
    />
  );
  if (viewer.kind === "brand") {
    const relationship = await getProfilePartnership(
      viewer.brandId,
      profile.creatorId,
    );
    action = relationship ? (
      <ProfileAction
        kind="status"
        label={t(
          messages,
          `partnership.status.${relationship.status.toLowerCase()}`,
        )}
      />
    ) : (
      <ProfileAction
        kind="form"
        action={inviteFromProfile.bind(null, locale, slug, profile.creatorId)}
        label={t(messages, "profile.invite")}
      />
    );
  } else if (
    viewer.kind === "creator" &&
    viewer.creatorId === profile.creatorId
  )
    action = (
      <ProfileAction
        kind="link"
        href={`/${locale}/creator/profile`}
        label={t(messages, "profile.editCreator")}
      />
    );
  else if (viewer.kind !== "anonymous")
    action = (
      <ProfileAction kind="status" label={t(messages, "profile.viewOnly")} />
    );
  const shop = await shopItems;
  return (
    <CreatorProfile
      profile={profile}
      locale={locale}
      action={action}
      shop={shop}
      copy={profileCopy(messages)}
    />
  );
}
function profileCopy(m: Record<string, string>) {
  return {
    preview: t(m, "profile.preview"),
    approved: t(m, "profile.approved"),
    ledger: t(m, "profile.ledger"),
    disclosure: t(m, "profile.disclosure"),
    work: t(m, "profile.featuredWork"),
    leave: t(m, "profile.leave"),
    fallback: t(m, "profile.fallback"),
    source: t(m, "profile.source"),
    languages: t(m, "profile.languages"),
    contentFormats: t(m, "profile.contentFormats"),
    heroAlt: t(m, "profile.creatorHeroAlt"),
    workAlt: t(m, "profile.workImageAlt"),
    socialLabels: socialLabels(m),
  };
}

function socialLabels(m: Record<string, string>) {
  return {
    website: t(m, "profile.social.website"),
    instagram: t(m, "profile.social.instagram"),
    tiktok: t(m, "profile.social.tiktok"),
    youtube: t(m, "profile.social.youtube"),
    facebook: t(m, "profile.social.facebook"),
    linkedin: t(m, "profile.social.linkedin"),
  };
}
