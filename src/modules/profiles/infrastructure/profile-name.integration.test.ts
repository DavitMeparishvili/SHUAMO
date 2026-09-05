import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedBrand, seedCreator } from "@/src/test/fixtures/accounts";
import { prismaProfileRepository } from "./prisma-profile-repository";

const shared = {
  slug: null,
  tagline: { ka: "", en: "" },
  description: { ka: "", en: "" },
  location: { ka: "", en: "" },
  categories: [],
  socialLinks: [],
  heroImageUrl: "",
};
describe("owner-scoped profile names", () => {
  it("updates only the selected creator and preserves private draft status", async () => {
    const [owner, other] = await Promise.all([seedCreator(), seedCreator()]);
    const before = await prisma.creator.findUniqueOrThrow({
      where: { id: other.id },
    });
    await prismaProfileRepository.saveCreatorSafely(owner.id, {
      ...shared,
      profileName: "Updated creator",
      languages: [],
      contentFormats: [],
      featuredWork: [],
    });
    const result = await prismaProfileRepository.getCreatorForOwner(owner.id);
    expect(result).toMatchObject({
      status: "DRAFT",
      creator: { displayName: "Updated creator" },
    });
    expect(
      await prisma.creator.findUnique({ where: { id: other.id } }),
    ).toEqual(before);
  });
  it("updates only the selected brand and rolls back a name when profile save fails", async () => {
    const [owner, other] = await Promise.all([seedBrand(), seedBrand()]);
    const input = {
      ...shared,
      profileName: "Updated brand",
      logoUrl: "",
      whatWeMake: [],
      collaborationInterests: [],
      featuredProductIds: [],
    };
    const before = await prisma.brand.findUniqueOrThrow({
      where: { id: other.id },
    });
    await prismaProfileRepository.saveBrandSafely(owner.id, input);
    expect(
      await prismaProfileRepository.getBrandForOwner(owner.id),
    ).toMatchObject({ brand: { name: "Updated brand" } });
    expect(await prisma.brand.findUnique({ where: { id: other.id } })).toEqual(
      before,
    );
    await prismaProfileRepository.saveBrandSafely(other.id, {
      ...input,
      slug: "occupied-brand",
    });
    await expect(
      prismaProfileRepository.saveBrandSafely(owner.id, {
        ...input,
        slug: "occupied-brand",
        profileName: "Must roll back",
      }),
    ).rejects.toThrow();
    expect(
      await prisma.brand.findUnique({ where: { id: owner.id } }),
    ).toMatchObject({ name: "Updated brand" });
  });
});
