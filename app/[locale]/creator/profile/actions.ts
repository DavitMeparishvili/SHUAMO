"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import { currentViewer, requireCreator } from "@/src/modules/identity";
import { getMessages, t, type Locale } from "@/src/modules/localization";
import {
  commaSeparated,
  creatorProfileInputSchema,
  creatorWorkRows,
  explicitSocialLinks,
  prismaProfileRepository,
  type ProfileActionState,
  validateProfileMediaUrl,
} from "@/src/modules/profiles";

function errorState(message: string, field?: string): ProfileActionState {
  return {
    status: "error",
    message,
    ...(field ? { fieldErrors: { [field]: message } } : {}),
  };
}

function validationMessage(messages: Record<string, string>, code?: string) {
  if (code === "platform_host_mismatch")
    return t(messages, "profile.editor.invalidSocialHost");
  if (code === "https_required")
    return t(messages, "profile.editor.httpsRequired");
  return t(messages, "profile.editor.invalid");
}

export async function saveCreatorProfileAction(
  locale: Locale,
  _previous: ProfileActionState,
  data: FormData,
): Promise<ProfileActionState> {
  void _previous;
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const messages = getMessages(locale);
  const parsed = creatorProfileInputSchema.safeParse({
    profileName: data.get("profileName") ?? undefined,
    slug: data.get("slug"),
    tagline: { ka: data.get("taglineKa"), en: data.get("taglineEn") },
    description: {
      ka: data.get("descriptionKa"),
      en: data.get("descriptionEn"),
    },
    location: { ka: data.get("locationKa"), en: data.get("locationEn") },
    categories: commaSeparated(data.get("categories")),
    heroImageUrl: data.get("heroImageUrl"),
    languages: commaSeparated(data.get("languages")),
    contentFormats: commaSeparated(data.get("contentFormats")),
    socialLinks: explicitSocialLinks(data),
    featuredWork: creatorWorkRows(data),
  });
  if (!parsed.success)
    return errorState(
      validationMessage(messages, parsed.error.issues[0]?.message),
      String(parsed.error.issues[0]?.path[0] ?? "profile"),
    );
  const env = serverEnv();
  if (
    parsed.data.heroImageUrl &&
    !validateProfileMediaUrl({
      url: parsed.data.heroImageUrl,
      publicEndpoint: env.STORAGE_PUBLIC_ENDPOINT,
      bucket: env.STORAGE_BUCKET,
      role: "creators",
      ownerId: allowed.value.creatorId,
      kinds: ["creator-hero"],
    })
  )
    return errorState(
      t(messages, "profile.editor.invalidMedia"),
      "heroImageUrl",
    );
  for (const work of parsed.data.featuredWork)
    if (
      work.imageUrl &&
      !validateProfileMediaUrl({
        url: work.imageUrl,
        publicEndpoint: env.STORAGE_PUBLIC_ENDPOINT,
        bucket: env.STORAGE_BUCKET,
        role: "creators",
        ownerId: allowed.value.creatorId,
        kinds: ["creator-work"],
      })
    )
      return errorState(
        t(messages, "profile.editor.invalidMedia"),
        "featuredWork",
      );
  try {
    const result = await prismaProfileRepository.saveCreatorSafely(
      allowed.value.creatorId,
      parsed.data,
    );
    revalidatePath(`/${locale}/creator/profile`);
    revalidatePath(`/${locale}/creators`);
    return {
      status: "success",
      message: t(
        messages,
        result.demoted ? "profile.editor.savedAsDraft" : "profile.editor.saved",
      ),
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    )
      return errorState(t(messages, "profile.editor.slugTaken"), "slug");
    return errorState(t(messages, "profile.editor.saveFailed"));
  }
}

export async function publishCreatorProfileAction(
  locale: Locale,
  _previous: ProfileActionState,
  _data: FormData,
): Promise<ProfileActionState> {
  void _previous;
  void _data;
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const messages = getMessages(locale);
  const result = await prismaProfileRepository.publishCreatorSafely(
    allowed.value.creatorId,
  );
  if (result.kind === "not-found")
    return errorState(t(messages, "profile.editor.saveBeforePublish"));
  if (result.kind === "incomplete")
    return {
      status: "error",
      message: t(messages, "profile.editor.incomplete"),
      fieldErrors: Object.fromEntries(
        result.issues.map((issue) => [
          issue,
          t(messages, "profile.editor.requiredForPublish"),
        ]),
      ),
    };
  if (result.profile.slug)
    revalidatePath(`/${locale}/creators/${result.profile.slug}`);
  revalidatePath(`/${locale}/creators`);
  revalidatePath(`/${locale}/creator/profile`);
  return {
    status: "success",
    message: t(messages, "profile.editor.published"),
  };
}

export async function unpublishCreatorProfileAction(
  locale: Locale,
  _previous: ProfileActionState,
  _data: FormData,
): Promise<ProfileActionState> {
  void _previous;
  void _data;
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  await prismaProfileRepository.setCreatorStatus(
    allowed.value.creatorId,
    "DRAFT",
  );
  revalidatePath(`/${locale}/creators`);
  revalidatePath(`/${locale}/creator/profile`);
  return {
    status: "success",
    message: t(getMessages(locale), "profile.editor.unpublished"),
  };
}
