import { notFound, redirect } from "next/navigation";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  listOwnedActiveProducts,
  prismaProfileRepository,
} from "@/src/modules/profiles";
import { ProfileEditor } from "@/src/modules/profiles";
import {
  publishBrandProfileAction,
  saveBrandProfileAction,
  unpublishBrandProfileAction,
} from "./actions";
export default async function BrandProfileEditorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const [profile, products] = await Promise.all([
    prismaProfileRepository.getBrandForOwner(allowed.value.brandId),
    listOwnedActiveProducts(allowed.value.brandId),
  ]);
  const messages = getMessages(locale);
  const record = profile as Parameters<typeof ProfileEditor>[0]["profile"];
  return (
    <div className="profile-route">
      <ProfileEditor
        role="brand"
        locale={locale}
        name={allowed.value.brandName}
        brandCopy={brandCopy(messages)}
        profile={record}
        products={products}
        saveAction={saveBrandProfileAction.bind(null, locale)}
        publishAction={publishBrandProfileAction.bind(null, locale)}
        unpublishAction={unpublishBrandProfileAction.bind(null, locale)}
        copy={editorCopy(messages)}
      />
    </div>
  );
}
function editorCopy(m: Record<string, string>) {
  const keys = [
    "slug",
    "taglineKa",
    "taglineEn",
    "descriptionKa",
    "descriptionEn",
    "locationKa",
    "locationEn",
    "categories",
    "hero",
    "logo",
    "socials",
    "socialPlatform",
    "socialUrl",
    "addSocial",
    "socialWebsite",
    "socialInstagram",
    "socialTiktok",
    "socialYoutube",
    "socialFacebook",
    "socialLinkedin",
    "remove",
    "evidence",
    "whatWeMakeKa",
    "whatWeMakeEn",
    "interestsKa",
    "interestsEn",
    "languages",
    "contentFormats",
    "workTitleKa",
    "workTitleEn",
    "workDestination",
    "workImage",
    "addWork",
    "moveUp",
    "moveDown",
    "workMaximum",
    "save",
    "publish",
    "unpublish",
    "preview",
    "pending",
    "uploadTooLarge",
    "uploading",
    "uploadComplete",
    "uploadFailed",
  ] as const;
  return Object.fromEntries(
    keys.map((k) => [k, t(m, `profile.editor.${k}`)]),
  ) as Record<(typeof keys)[number], string>;
}
function brandCopy(m: Record<string, string>) {
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
    socialLabels: {
      website: t(m, "profile.social.website"),
      instagram: t(m, "profile.social.instagram"),
      tiktok: t(m, "profile.social.tiktok"),
      youtube: t(m, "profile.social.youtube"),
      facebook: t(m, "profile.social.facebook"),
      linkedin: t(m, "profile.social.linkedin"),
    },
  };
}
