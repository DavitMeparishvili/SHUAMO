import type { LocalizedText } from "./localized-profile-text";
export const SOCIAL_PLATFORMS = [
  "website",
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "linkedin",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type ProfileStatus = "DRAFT" | "PUBLISHED";
export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}
export interface BrandProfileInput {
  profileName?: string | undefined;
  slug: string | null;
  tagline: LocalizedText;
  description: LocalizedText;
  location: LocalizedText;
  categories: string[];
  socialLinks: SocialLink[];
  logoUrl: string;
  heroImageUrl: string;
  whatWeMake: { label: LocalizedText }[];
  collaborationInterests: LocalizedText[];
  featuredProductIds: string[];
}
export interface CreatorProfileInput {
  profileName?: string | undefined;
  slug: string | null;
  tagline: LocalizedText;
  description: LocalizedText;
  location: LocalizedText;
  categories: string[];
  socialLinks: SocialLink[];
  heroImageUrl: string;
  languages: string[];
  contentFormats: string[];
  featuredWork: { title: LocalizedText; url: string; imageUrl: string }[];
}
export function publicationIssues(
  profile: BrandProfileInput | CreatorProfileInput,
): string[] {
  const issues: string[] = [];
  if (!profile.slug) issues.push("slug");
  if (!(profile.tagline.ka || profile.tagline.en)) issues.push("tagline");
  if (!(profile.description.ka || profile.description.en))
    issues.push("description");
  if (!profile.categories.length) issues.push("categories");
  if (!profile.heroImageUrl) issues.push("heroImageUrl");
  if (
    "featuredProductIds" in profile &&
    !profile.whatWeMake.some((item) => item.label.ka || item.label.en)
  )
    issues.push("brandEvidence");
  if (
    "featuredWork" in profile &&
    !profile.featuredWork.some(
      (item) => (item.title.ka || item.title.en) && item.url && item.imageUrl,
    ) &&
    !profile.socialLinks.length
  )
    issues.push("creatorEvidence");
  return issues;
}
