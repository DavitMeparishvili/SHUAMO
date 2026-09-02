import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { currentViewer } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  BrandProfile,
  getProfilePartnership,
  getPublicBrandProfile,
} from "@/src/modules/profiles";
import { ProfileAction } from "@/src/modules/profiles";
import { applyFromProfile } from "./actions";
export const dynamic = "force-dynamic";
const getProfile = cache(getPublicBrandProfile);
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
    title: `${profile.brand.name} — SHUAMO`,
    description,
    alternates: {
      canonical: `/${locale}/brands/${slug}`,
      languages: { ka: `/ka/brands/${slug}`, en: `/en/brands/${slug}` },
    },
    openGraph: { images: profile.heroImageUrl ? [profile.heroImageUrl] : [] },
  };
}
export default async function BrandPublicPage({
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
  const messages = getMessages(locale);
  let action = (
    <ProfileAction
      kind="link"
      href={`/${locale}/sign-in?returnTo=${encodeURIComponent(`/${locale}/brands/${slug}`)}`}
      label={t(messages, "profile.signInToConnect")}
    />
  );
  if (viewer.kind === "creator") {
    const relationship = await getProfilePartnership(
      profile.brandId,
      viewer.creatorId,
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
        action={applyFromProfile.bind(null, locale, slug, profile.brandId)}
        label={t(messages, "profile.apply")}
      />
    );
  } else if (viewer.kind === "brand" && viewer.brandId === profile.brandId)
    action = (
      <ProfileAction
        kind="link"
        href={`/${locale}/brand/profile`}
        label={t(messages, "profile.editBrand")}
      />
    );
  else if (viewer.kind !== "anonymous")
    action = (
      <ProfileAction kind="status" label={t(messages, "profile.viewOnly")} />
    );
  return (
    <BrandProfile
      profile={profile}
      locale={locale}
      action={action}
      copy={profileCopy(messages)}
    />
  );
}
function profileCopy(m: Record<string, string>) {
  return {
    preview: t(m, "profile.preview"),
    approved: t(m, "profile.approved"),
    story: t(m, "profile.story"),
    whatWeMake: t(m, "profile.whatWeMake"),
    products: t(m, "profile.featuredProducts"),
    interests: t(m, "profile.interests"),
    socials: t(m, "profile.socials"),
    leave: t(m, "profile.leave"),
    fallback: t(m, "profile.fallback"),
    heroAlt: t(m, "profile.brandHeroAlt"),
    logoAlt: t(m, "profile.brandLogoAlt"),
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
