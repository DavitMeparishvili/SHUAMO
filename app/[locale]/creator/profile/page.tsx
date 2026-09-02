import { notFound, redirect } from "next/navigation";
import {
  currentViewer,
  requireCreator,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  CreatorProfile,
  prismaProfileRepository,
} from "@/src/modules/profiles";
import { ProfileEditor } from "@/src/modules/profiles";
import {
  publishCreatorProfileAction,
  saveCreatorProfileAction,
  unpublishCreatorProfileAction,
} from "./actions";
export default async function CreatorProfileEditorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const profile = await prismaProfileRepository.getCreatorForOwner(
    allowed.value.creatorId,
  );
  const messages = getMessages(locale);
  const base = profile as unknown as Record<string, unknown> | null;
  return (
    <WorkspaceShell
      name={allowed.value.displayName}
      title={t(messages, "profile.editor.creatorTitle")}
      intro={t(messages, "profile.editor.intro")}
    >
      <ProfileEditor
        role="creator"
        profile={profile as Parameters<typeof ProfileEditor>[0]["profile"]}
        saveAction={saveCreatorProfileAction.bind(null, locale)}
        publishAction={publishCreatorProfileAction.bind(null, locale)}
        unpublishAction={unpublishCreatorProfileAction.bind(null, locale)}
        copy={editorCopy(messages)}
      />
      {profile ? (
        <div
          className="mt-12 border-t border-slate-300 pt-8"
          id="profile-preview"
        >
          <CreatorProfile
            profile={
              {
                ...base,
                creator: { displayName: allowed.value.displayName },
              } as never
            }
            locale={locale}
            preview
            copy={creatorCopy(messages)}
          />
        </div>
      ) : null}
    </WorkspaceShell>
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
