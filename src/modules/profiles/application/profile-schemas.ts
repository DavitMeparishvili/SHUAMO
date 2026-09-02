import { z } from "zod";
import { isProfileSlug, normalizeProfileSlug } from "../domain/profile-slug";
import { SOCIAL_PLATFORMS } from "../domain/profile-content";
export const profileSlugSchema = z
  .union([z.string(), z.null()])
  .transform((value, ctx) => {
    if (value === null) return null;
    const normalized = normalizeProfileSlug(value);
    if (!normalized) return null;
    if (!isProfileSlug(normalized)) {
      ctx.addIssue({ code: "custom", message: "invalid_slug" });
      return z.NEVER;
    }
    return normalized;
  });
const httpsUrl = z.url().transform((value, ctx) => {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    ctx.addIssue({ code: "custom", message: "https_required" });
    return z.NEVER;
  }
  url.hash = "";
  return url.toString();
});
const localized = (max: number) =>
  z.object({ ka: z.string().trim().max(max), en: z.string().trim().max(max) });
const uniqueTrimmed = (max: number, length = 60) =>
  z
    .array(z.string().trim().min(1).max(length))
    .max(max)
    .transform((v) => [...new Set(v)]);
const SOCIAL_HOSTS = {
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
  facebook: ["facebook.com"],
  linkedin: ["linkedin.com"],
} as const;
export function isSocialUrlCompatible(
  platform: (typeof SOCIAL_PLATFORMS)[number],
  value: string,
) {
  if (platform === "website") return true;
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/\.$/, "");
    return SOCIAL_HOSTS[platform].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}
const socialLinks = z
  .array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: httpsUrl }))
  .max(5)
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.forEach((x, i) => {
      if (seen.has(x.platform))
        ctx.addIssue({
          code: "custom",
          path: [i, "platform"],
          message: "duplicate_platform",
        });
      seen.add(x.platform);
      if (!isSocialUrlCompatible(x.platform, x.url))
        ctx.addIssue({
          code: "custom",
          path: [i, "url"],
          message: "platform_host_mismatch",
        });
    });
  });
const shared = z.object({
  slug: profileSlugSchema,
  tagline: localized(160),
  description: localized(4000),
  location: localized(120),
  categories: uniqueTrimmed(5),
  socialLinks,
});
export const brandProfileInputSchema = shared.extend({
  logoUrl: z.string().max(2048),
  heroImageUrl: z.string().max(2048),
  whatWeMake: z.array(z.object({ label: localized(80) })).max(5),
  collaborationInterests: z.array(localized(80)).max(4),
  featuredProductIds: z
    .array(z.string().uuid())
    .max(3)
    .transform((v) => [...new Set(v)]),
});
export const creatorProfileInputSchema = shared.extend({
  heroImageUrl: z.string().max(2048),
  languages: uniqueTrimmed(8),
  contentFormats: uniqueTrimmed(8),
  featuredWork: z
    .array(
      z.object({
        title: localized(120),
        url: httpsUrl,
        imageUrl: z.string().max(2048),
      }),
    )
    .max(6),
});
export function parseHttpsUrl(value: string) {
  return httpsUrl.safeParse(value);
}
