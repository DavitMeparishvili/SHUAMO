"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serverEnv } from "@/src/config/env";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { getMessages, t, type Locale } from "@/src/modules/localization";
import {
  brandProfileInputSchema,
  commaSeparated,
  countOwnedBrandProducts,
  explicitSocialLinks,
  pairedLocalizedLines,
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

export async function saveBrandProfileAction(
  locale: Locale,
  _previous: ProfileActionState,
  data: FormData,
): Promise<ProfileActionState> {
  void _previous;
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const messages = getMessages(locale);
  const whatWeMake = pairedLocalizedLines(
    data.get("whatWeMakeKa"),
    data.get("whatWeMakeEn"),
  );
  const parsed = brandProfileInputSchema.safeParse({
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
    logoUrl: data.get("logoUrl"),
    socialLinks: explicitSocialLinks(data),
    whatWeMake: whatWeMake.map((label) => ({ label })),
    collaborationInterests: pairedLocalizedLines(
      data.get("interestsKa"),
      data.get("interestsEn"),
    ),
    featuredProductIds: data.getAll("featuredProductIds"),
  });
  if (!parsed.success)
    return errorState(
      validationMessage(messages, parsed.error.issues[0]?.message),
      String(parsed.error.issues[0]?.path[0] ?? "profile"),
    );
  const env = serverEnv();
  for (const [url, kinds, field] of [
    [parsed.data.heroImageUrl, ["brand-hero"], "heroImageUrl"],
    [parsed.data.logoUrl, ["brand-logo"], "logoUrl"],
  ] as const)
    if (
      url &&
      !validateProfileMediaUrl({
        url,
        publicEndpoint: env.STORAGE_PUBLIC_ENDPOINT,
        bucket: env.STORAGE_BUCKET,
        role: "brands",
        ownerId: allowed.value.brandId,
        kinds: [...kinds],
      })
    )
      return errorState(t(messages, "profile.editor.invalidMedia"), field);
  const count = await countOwnedBrandProducts(
    allowed.value.brandId,
    parsed.data.featuredProductIds,
  );
  if (count !== parsed.data.featuredProductIds.length)
    return errorState(
      t(messages, "profile.editor.invalidProduct"),
      "featuredProductIds",
    );
  try {
    const result = await prismaProfileRepository.saveBrandSafely(
      allowed.value.brandId,
      parsed.data,
    );
    revalidatePath(`/${locale}/brand/profile`);
    revalidatePath(`/${locale}/brands`);
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

export async function publishBrandProfileAction(
  locale: Locale,
  _previous: ProfileActionState,
  _data: FormData,
): Promise<ProfileActionState> {
  void _previous;
  void _data;
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const messages = getMessages(locale);
  let result;
  try {
    result = await prismaProfileRepository.publishBrandSafely(
      allowed.value.brandId,
    );
  } catch (error) {
    const conflict =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002";
    return errorState(
      t(
        messages,
        conflict ? "profile.editor.slugTaken" : "profile.editor.saveFailed",
      ),
      conflict ? "slug" : undefined,
    );
  }
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
    revalidatePath(`/${locale}/brands/${result.profile.slug}`);
  revalidatePath(`/${locale}/brands`);
  revalidatePath(`/${locale}/brand/profile`);
  revalidatePath(`/${locale}`, "layout");
  return {
    status: "success",
    message: t(messages, "profile.editor.published"),
  };
}

export async function unpublishBrandProfileAction(
  locale: Locale,
  _previous: ProfileActionState,
  _data: FormData,
): Promise<ProfileActionState> {
  void _previous;
  void _data;
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  await prismaProfileRepository.setBrandStatus(allowed.value.brandId, "DRAFT");
  revalidatePath(`/${locale}/brands`);
  revalidatePath(`/${locale}/brand/profile`);
  revalidatePath(`/${locale}`, "layout");
  return {
    status: "success",
    message: t(getMessages(locale), "profile.editor.unpublished"),
  };
}
