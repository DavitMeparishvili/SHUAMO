import { notFound, redirect } from "next/navigation";
import { currentViewer, requireCreator } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  CreatorShopEditor,
  listCreatorShopForOwner,
  listShopCandidates,
  prismaProfileRepository,
} from "@/src/modules/profiles";
import { ProfileEditor } from "@/src/modules/profiles";
import {
  publishCreatorProfileAction,
  saveCreatorProfileAction,
  unpublishCreatorProfileAction,
} from "./actions";
import {
  addShopItemsAction,
  removeShopItemAction,
  reorderShopItemsAction,
  setShopItemVisibleAction,
} from "./shop-actions";
export default async function CreatorProfileEditorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const creatorId = allowed.value.creatorId;
  const [profile, shopItems, candidates] = await Promise.all([
    prismaProfileRepository.getCreatorForOwner(creatorId),
    listCreatorShopForOwner(creatorId),
    listShopCandidates(creatorId),
  ]);
  const messages = getMessages(locale);
  const published = profile?.status === "PUBLISHED";
  return (
    <div className="profile-route">
      <ProfileEditor
        role="creator"
        locale={locale}
        name={profile?.creator.displayName ?? allowed.value.displayName}
        creatorCopy={creatorCopy(messages)}
        profile={profile as Parameters<typeof ProfileEditor>[0]["profile"]}
        saveAction={saveCreatorProfileAction.bind(null, locale)}
        publishAction={publishCreatorProfileAction.bind(null, locale)}
        unpublishAction={unpublishCreatorProfileAction.bind(null, locale)}
        copy={editorCopy(messages)}
        shop={
          <CreatorShopEditor
            locale={locale}
            items={shopItems}
            candidates={candidates}
            profileUrl={
              published && profile?.slug
                ? `/${locale}/creators/${profile.slug}`
                : null
            }
            published={published}
            hasAnyLinks={candidates.length > 0 || shopItems.length > 0}
            actions={{
              add: addShopItemsAction.bind(null, locale),
              remove: removeShopItemAction.bind(null, locale),
              setVisible: setShopItemVisibleAction.bind(null, locale),
              reorder: reorderShopItemsAction.bind(null, locale),
            }}
          />
        }
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
function creatorCopy(m: Record<string, string>) {
  return {
    preview: t(m, "profile.preview"),
    approved: t(m, "profile.approved"),
    ledger: t(m, "profile.ledger"),
    supplied: t(m, "profile.supplied"),
    disclosure: t(m, "profile.disclosure"),
    work: t(m, "profile.featuredWork"),
    leave: t(m, "profile.leave"),
    fallback: t(m, "profile.fallback"),
    source: t(m, "profile.source"),
    languages: t(m, "profile.languages"),
    contentFormats: t(m, "profile.contentFormats"),
    heroAlt: t(m, "profile.creatorHeroAlt"),
    workAlt: t(m, "profile.workImageAlt"),
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
