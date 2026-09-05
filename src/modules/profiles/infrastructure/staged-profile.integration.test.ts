import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedBrand, seedCreator } from "@/src/test/fixtures/accounts";
import {
  prismaProfileRepository,
  getPublicCreatorProfile,
  getPublicBrandProfile,
} from "./prisma-profile-repository";

const shared = {
  tagline: { en: "Product stories", ka: "" },
  description: { en: "Thoughtful stories about everyday products.", ka: "" },
  location: { en: "Tbilisi", ka: "" },
  categories: ["Lifestyle"],
  heroImageUrl: "https://example.com/hero.jpg",
  socialLinks: [{ platform: "website" as const, url: "https://example.com" }],
};
describe("private staged profile edits", () => {
  it("keeps creator edits and name private until explicit publication", async () => {
    const c = await seedCreator();
    const input = {
      ...shared,
      slug: "creator-stage",
      profileName: "Public name",
      languages: [],
      contentFormats: [],
      featuredWork: [],
    };
    await prismaProfileRepository.saveCreatorSafely(c.id, input);
    expect(await getPublicCreatorProfile(input.slug)).toBeUndefined();
    await prismaProfileRepository.publishCreatorSafely(c.id);
    await prismaProfileRepository.saveCreatorSafely(c.id, {
      ...input,
      profileName: "Private name",
      tagline: { en: "Private tagline", ka: "" },
    });
    expect(await getPublicCreatorProfile(input.slug)).toMatchObject({
      taglineEn: "Product stories",
      creator: { displayName: "Public name" },
    });
    expect(
      await prismaProfileRepository.getCreatorForOwner(c.id),
    ).toMatchObject({
      taglineEn: "Private tagline",
      creator: { displayName: "Private name" },
    });
    await prismaProfileRepository.publishCreatorSafely(c.id);
    expect(await getPublicCreatorProfile(input.slug)).toMatchObject({
      taglineEn: "Private tagline",
      creator: { displayName: "Private name" },
    });
  });
  it("can unpublish both roles even when their staged slug conflicts", async () => {
    const b = await seedBrand(),
      otherB = await seedBrand(),
      c = await seedCreator(),
      otherC = await seedCreator();
    const brandInput = {
      ...shared,
      slug: "brand-live",
      logoUrl: "https://example.com/logo.jpg",
      whatWeMake: [{ label: { en: "Perfume", ka: "" } }],
      collaborationInterests: [],
      featuredProductIds: [],
    };
    const creatorInput = {
      ...shared,
      slug: "creator-live",
      languages: [],
      contentFormats: [],
      featuredWork: [],
    };
    await prismaProfileRepository.saveBrandSafely(b.id, brandInput);
    await prismaProfileRepository.publishBrandSafely(b.id);
    await prismaProfileRepository.saveCreatorSafely(c.id, creatorInput);
    await prismaProfileRepository.publishCreatorSafely(c.id);
    await prismaProfileRepository.saveBrandSafely(otherB.id, {
      ...brandInput,
      slug: "occupied-brand",
    });
    await prismaProfileRepository.saveCreatorSafely(otherC.id, {
      ...creatorInput,
      slug: "occupied-creator",
    });
    await prismaProfileRepository.saveBrandSafely(b.id, {
      ...brandInput,
      slug: "occupied-brand",
    });
    await prismaProfileRepository.saveCreatorSafely(c.id, {
      ...creatorInput,
      slug: "occupied-creator",
    });
    await expect(
      prismaProfileRepository.publishBrandSafely(b.id),
    ).rejects.toMatchObject({ code: "P2002" });
    await expect(
      prismaProfileRepository.publishCreatorSafely(c.id),
    ).rejects.toMatchObject({ code: "P2002" });
    await prismaProfileRepository.setBrandStatus(b.id, "DRAFT");
    await prismaProfileRepository.setCreatorStatus(c.id, "DRAFT");
    expect(await getPublicBrandProfile("brand-live")).toBeUndefined();
    expect(await getPublicCreatorProfile("creator-live")).toBeUndefined();
    expect(
      await prisma.brandProfile.findUnique({ where: { brandId: b.id } }),
    ).toMatchObject({
      status: "DRAFT",
      draftData: expect.objectContaining({ slug: "occupied-brand" }),
    });
    expect(
      await prisma.creatorProfile.findUnique({ where: { creatorId: c.id } }),
    ).toMatchObject({
      status: "DRAFT",
      draftData: expect.objectContaining({ slug: "occupied-creator" }),
    });
  });
});
