import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedBrand, seedCreator } from "@/src/test/fixtures/accounts";
import {
  getPublicBrandProfile,
  getPublicCreatorProfile,
  listPublicCreatorProfiles,
  prismaProfileRepository,
} from "./prisma-profile-repository";
describe("public profile persistence", () => {
  it("PROFILE-001 hides drafts and suspended owners at the query", async () => {
    const draft = await seedCreator();
    const suspended = await seedCreator({ status: "SUSPENDED" });
    await prisma.creatorProfile.createMany({
      data: [
        { creatorId: draft.id, slug: "draft-profile" },
        {
          creatorId: suspended.id,
          slug: "suspended-profile",
          status: "PUBLISHED",
          publishedAt: new Date(),
          taglineEn: "Hidden",
          descriptionEn: "Hidden",
          heroImageUrl: "/hidden",
          categories: ["Hidden"],
          socialLinks: [{ platform: "website", url: "https://example.com" }],
        },
      ],
    });
    await expect(
      getPublicCreatorProfile("draft-profile"),
    ).resolves.toBeUndefined();
    await expect(
      getPublicCreatorProfile("suspended-profile"),
    ).resolves.toBeUndefined();
  });
  it("allows multiple incomplete drafts without slugs", async () => {
    const [a, b] = await Promise.all([seedCreator(), seedCreator()]);
    await expect(
      prisma.creatorProfile.createMany({
        data: [{ creatorId: a.id }, { creatorId: b.id }],
      }),
    ).resolves.toMatchObject({ count: 2 });
  });
  it("PROFILE-005 returns an explicit safe brand projection", async () => {
    const brand = await seedBrand();
    await prisma.brandProfile.create({
      data: {
        brandId: brand.id,
        slug: "safe-brand",
        status: "PUBLISHED",
        publishedAt: new Date(),
        taglineEn: "Safe",
        descriptionEn: "Public",
        heroImageUrl: "/hero",
        categories: ["Care"],
        whatWeMake: [{ label: { ka: "", en: "Care" } }],
      },
    });
    const result = await getPublicBrandProfile("safe-brand");
    expect(result).toBeDefined();
    expect(result).not.toHaveProperty("brand.user");
    expect(result).not.toHaveProperty("brand.keyHash");
    expect(result).not.toHaveProperty("brand.conversions");
  });
  it("PROFILE-010 lists profiles deterministically with an id tie-break", async () => {
    const [a, b] = await Promise.all([seedCreator(), seedCreator()]);
    await prisma.creator.updateMany({
      where: { id: { in: [a.id, b.id] } },
      data: { displayName: "Same" },
    });
    await prisma.creatorProfile.createMany({
      data: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          creatorId: a.id,
          slug: "same-two",
          status: "PUBLISHED",
          publishedAt: new Date(),
          taglineEn: "A",
          descriptionEn: "A",
          heroImageUrl: "/a",
          categories: ["City"],
          socialLinks: [{ platform: "website", url: "https://a.example" }],
        },
        {
          id: "00000000-0000-4000-8000-000000000001",
          creatorId: b.id,
          slug: "same-one",
          status: "PUBLISHED",
          publishedAt: new Date(),
          taglineEn: "B",
          descriptionEn: "B",
          heroImageUrl: "/b",
          categories: ["City"],
          socialLinks: [{ platform: "website", url: "https://b.example" }],
        },
      ],
    });
    expect((await listPublicCreatorProfiles("en")).map((x) => x.id)).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ]);
  });

  it("stages incomplete edits without changing the published profile", async () => {
    const creator = await seedCreator();
    await prisma.creatorProfile.create({
      data: {
        creatorId: creator.id,
        slug: "published-then-incomplete",
        status: "PUBLISHED",
        publishedAt: new Date(),
        taglineEn: "Tag",
        descriptionEn: "Description",
        heroImageUrl: "/hero",
        categories: ["City"],
        socialLinks: [{ platform: "website", url: "https://example.com" }],
      },
    });
    const result = await prismaProfileRepository.saveCreatorSafely(creator.id, {
      slug: null,
      tagline: { ka: "", en: "Tag" },
      description: { ka: "", en: "Description" },
      location: { ka: "", en: "Tbilisi" },
      categories: [],
      socialLinks: [],
      heroImageUrl: "",
      languages: [],
      contentFormats: [],
      featuredWork: [],
    });
    expect(result.demoted).toBe(false);
    await expect(
      prisma.creatorProfile.findUnique({
        where: { creatorId: creator.id },
        select: { status: true, publishedAt: true },
      }),
    ).resolves.toEqual({ status: "PUBLISHED", publishedAt: expect.any(Date) });
  });

  it("never leaves invalid content published when save and publish race", async () => {
    const creator = await seedCreator();
    await prisma.creatorProfile.create({
      data: {
        creatorId: creator.id,
        slug: "publication-race",
        status: "PUBLISHED",
        publishedAt: new Date(),
        taglineEn: "Tag",
        descriptionEn: "Description",
        heroImageUrl: "/hero",
        categories: ["City"],
        socialLinks: [{ platform: "website", url: "https://example.com" }],
      },
    });
    const incomplete = {
      slug: null,
      tagline: { ka: "", en: "Tag" },
      description: { ka: "", en: "Description" },
      location: { ka: "", en: "" },
      categories: [],
      socialLinks: [],
      heroImageUrl: "",
      languages: [],
      contentFormats: [],
      featuredWork: [],
    };
    await Promise.all([
      prismaProfileRepository.saveCreatorSafely(creator.id, incomplete),
      prismaProfileRepository.publishCreatorSafely(creator.id),
    ]);
    await expect(
      prisma.creatorProfile.findUnique({
        where: { creatorId: creator.id },
        select: { status: true, publishedAt: true, slug: true },
      }),
    ).resolves.toEqual({
      status: "PUBLISHED",
      publishedAt: expect.any(Date),
      slug: "publication-race",
    });
  });

  it("counts only active owned products as brand publication evidence", async () => {
    const brand = await seedBrand();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `ARCHIVED-${crypto.randomUUID()}`,
        title: "Archived proof",
        priceGel: "25.00",
        backlinkUrl: "https://example.com/product",
        commissionType: "FIXED",
        commissionValue: "5.0000",
        status: "ARCHIVED",
      },
    });
    await prismaProfileRepository.saveBrandSafely(brand.id, {
      slug: "archived-proof-brand",
      tagline: { ka: "", en: "Tag" },
      description: { ka: "", en: "Description" },
      location: { ka: "", en: "Tbilisi" },
      categories: ["Care"],
      socialLinks: [],
      logoUrl: "",
      heroImageUrl: "/hero",
      whatWeMake: [],
      collaborationInterests: [],
      featuredProductIds: [product.id],
    });
    await expect(
      prismaProfileRepository.publishBrandSafely(brand.id),
    ).resolves.toMatchObject({
      kind: "incomplete",
      issues: expect.arrayContaining(["brandEvidence"]),
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { status: "ACTIVE" },
    });
    await expect(
      prismaProfileRepository.publishBrandSafely(brand.id),
    ).resolves.toMatchObject({ kind: "published" });
  });
});
