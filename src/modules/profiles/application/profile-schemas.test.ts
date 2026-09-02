import { describe, expect, it } from "vitest";
import { publicationIssues } from "../domain/profile-content";
import {
  brandProfileInputSchema,
  creatorProfileInputSchema,
} from "./profile-schemas";
const shared = {
  slug: "valid-profile",
  tagline: { ka: "", en: "Tagline" },
  description: { ka: "", en: "Description" },
  location: { ka: "", en: "Tbilisi" },
  categories: ["Fashion"],
  socialLinks: [
    { platform: "instagram" as const, url: "https://instagram.com/name" },
  ],
};
describe("profile content contracts", () => {
  it("PROFILE-006 rejects non-HTTPS and duplicate social platforms", () => {
    expect(
      creatorProfileInputSchema.safeParse({
        ...shared,
        heroImageUrl: "image",
        languages: [],
        contentFormats: [],
        socialLinks: [{ platform: "website", url: "http://example.com" }],
        featuredWork: [],
      }).success,
    ).toBe(false);
    expect(
      creatorProfileInputSchema.safeParse({
        ...shared,
        heroImageUrl: "image",
        languages: [],
        contentFormats: [],
        socialLinks: [...shared.socialLinks, ...shared.socialLinks],
        featuredWork: [],
      }).success,
    ).toBe(false);
  });
  it("rejects lookalike social hosts and accepts exact or safe subdomains", () => {
    const creator = (url: string) => ({
      ...shared,
      heroImageUrl: "image",
      languages: [],
      contentFormats: [],
      socialLinks: [{ platform: "instagram" as const, url }],
      featuredWork: [],
    });
    expect(
      creatorProfileInputSchema.safeParse(
        creator("https://instagram.com.evil.example/name"),
      ).success,
    ).toBe(false);
    expect(
      creatorProfileInputSchema.safeParse(
        creator("https://www.instagram.com/name"),
      ).success,
    ).toBe(true);
  });
  it("requires role proof to publish while drafts parse", () => {
    const brand = brandProfileInputSchema.parse({
      ...shared,
      logoUrl: "",
      heroImageUrl: "image",
      whatWeMake: [],
      collaborationInterests: [],
      featuredProductIds: [],
    });
    expect(publicationIssues(brand)).toContain("brandEvidence");
    const creator = creatorProfileInputSchema.parse({
      ...shared,
      heroImageUrl: "image",
      languages: [],
      contentFormats: [],
      socialLinks: [],
      featuredWork: [],
    });
    expect(publicationIssues(creator)).toContain("creatorEvidence");
  });
  it("does not count empty brand rows or incomplete creator work as proof", () => {
    const brand = brandProfileInputSchema.parse({
      ...shared,
      logoUrl: "",
      heroImageUrl: "image",
      whatWeMake: [{ label: { ka: "", en: "" } }],
      collaborationInterests: [],
      featuredProductIds: [],
    });
    expect(publicationIssues(brand)).toContain("brandEvidence");
    const creator = creatorProfileInputSchema.parse({
      ...shared,
      heroImageUrl: "image",
      languages: [],
      contentFormats: [],
      socialLinks: [],
      featuredWork: [
        {
          title: { ka: "", en: "" },
          url: "https://example.com/work",
          imageUrl: "",
        },
      ],
    });
    expect(publicationIssues(creator)).toContain("creatorEvidence");
  });
  it("enforces public collection maxima", () =>
    expect(
      brandProfileInputSchema.safeParse({
        ...shared,
        logoUrl: "",
        heroImageUrl: "image",
        categories: ["1", "2", "3", "4", "5", "6"],
        whatWeMake: [],
        collaborationInterests: [],
        featuredProductIds: [],
      }).success,
    ).toBe(false));
});
