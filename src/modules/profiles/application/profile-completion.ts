import {
  publicationIssues,
  type BrandProfileInput,
  type CreatorProfileInput,
} from "../domain/profile-content";
import { creatorProfileInputSchema } from "./profile-schemas";

export function profileCompletionIssues(
  profile: Record<string, unknown>,
  role: "brand" | "creator",
  activeProductIds: string[] = [],
) {
  const text = (key: string) =>
    typeof profile[key] === "string" ? profile[key].trim() : "";
  const localized = (key: string) => ({
    ka: text(key + "Ka"),
    en: text(key + "En"),
  });
  const base = {
    slug: text("slug") || null,
    tagline: localized("tagline"),
    description: localized("description"),
    location: localized("location"),
    categories: (profile.categories ?? []) as string[],
    socialLinks: (creatorProfileInputSchema.shape.socialLinks.safeParse(
      profile.socialLinks ?? [],
    ).data ?? []) as CreatorProfileInput["socialLinks"],
    heroImageUrl: text("heroImageUrl"),
  };
  if (role === "creator")
    return publicationIssues({
      ...base,
      languages: [],
      contentFormats: [],
      featuredWork: (profile.featuredWork ??
        []) as CreatorProfileInput["featuredWork"],
    });
  const featuredProductIds = (profile.featuredProductIds ?? []) as string[];
  const issues = publicationIssues({
    ...base,
    logoUrl: text("logoUrl"),
    collaborationInterests: [],
    featuredProductIds,
    whatWeMake: (profile.whatWeMake ?? []) as BrandProfileInput["whatWeMake"],
  });
  return featuredProductIds.some((id) => activeProductIds.includes(id))
    ? issues.filter((issue) => issue !== "brandEvidence")
    : issues;
}
