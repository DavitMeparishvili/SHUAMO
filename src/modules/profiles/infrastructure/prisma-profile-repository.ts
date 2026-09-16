import { prisma } from "@/src/infrastructure/db/client";
import { Prisma } from "@/src/generated/prisma/client";
import type { Locale } from "@/src/modules/localization";
import type {
  BrandProfileInput,
  CreatorProfileInput,
} from "../domain/profile-content";
import { publicationIssues } from "../domain/profile-content";
import {
  brandProfileInputSchema,
  creatorProfileInputSchema,
} from "../application/profile-schemas";
import type { ProfileDirectoryFilters } from "../ports/profile-repository";

const brandSelect = {
  id: true,
  brandId: true,
  slug: true,
  status: true,
  taglineKa: true,
  taglineEn: true,
  descriptionKa: true,
  descriptionEn: true,
  locationKa: true,
  locationEn: true,
  logoUrl: true,
  heroImageUrl: true,
  categories: true,
  whatWeMake: true,
  collaborationInterests: true,
  socialLinks: true,
  featuredProductIds: true,
  publishedAt: true,
  brand: { select: { name: true } },
} as const;
const creatorSelect = {
  id: true,
  creatorId: true,
  slug: true,
  status: true,
  taglineKa: true,
  taglineEn: true,
  descriptionKa: true,
  descriptionEn: true,
  locationKa: true,
  locationEn: true,
  heroImageUrl: true,
  categories: true,
  languages: true,
  contentFormats: true,
  socialLinks: true,
  featuredWork: true,
  publishedAt: true,
  creator: { select: { displayName: true } },
} as const;

function brandData(input: BrandProfileInput) {
  return {
    slug: input.slug,
    taglineKa: input.tagline.ka,
    taglineEn: input.tagline.en,
    descriptionKa: input.description.ka,
    descriptionEn: input.description.en,
    locationKa: input.location.ka,
    locationEn: input.location.en,
    logoUrl: input.logoUrl,
    heroImageUrl: input.heroImageUrl,
    categories: input.categories,
    whatWeMake: input.whatWeMake as unknown as Prisma.InputJsonValue,
    collaborationInterests:
      input.collaborationInterests as unknown as Prisma.InputJsonValue,
    socialLinks: input.socialLinks as unknown as Prisma.InputJsonValue,
    featuredProductIds: input.featuredProductIds as Prisma.InputJsonValue,
  };
}
function creatorData(input: CreatorProfileInput) {
  return {
    slug: input.slug,
    taglineKa: input.tagline.ka,
    taglineEn: input.tagline.en,
    descriptionKa: input.description.ka,
    descriptionEn: input.description.en,
    locationKa: input.location.ka,
    locationEn: input.location.en,
    heroImageUrl: input.heroImageUrl,
    categories: input.categories,
    languages: input.languages,
    contentFormats: input.contentFormats,
    socialLinks: input.socialLinks as unknown as Prisma.InputJsonValue,
    featuredWork: input.featuredWork as unknown as Prisma.InputJsonValue,
  };
}

export function databaseBrandProfile(row: unknown): BrandProfileInput {
  const r = row as Record<string, unknown>;
  return brandProfileInputSchema.parse({
    slug: r.slug,
    tagline: { ka: r.taglineKa, en: r.taglineEn },
    description: { ka: r.descriptionKa, en: r.descriptionEn },
    location: { ka: r.locationKa, en: r.locationEn },
    logoUrl: r.logoUrl,
    heroImageUrl: r.heroImageUrl,
    categories: r.categories,
    whatWeMake: r.whatWeMake,
    collaborationInterests: r.collaborationInterests,
    socialLinks: r.socialLinks,
    featuredProductIds: r.featuredProductIds,
  });
}

export function databaseCreatorProfile(row: unknown): CreatorProfileInput {
  const r = row as Record<string, unknown>;
  return creatorProfileInputSchema.parse({
    slug: r.slug,
    tagline: { ka: r.taglineKa, en: r.taglineEn },
    description: { ka: r.descriptionKa, en: r.descriptionEn },
    location: { ka: r.locationKa, en: r.locationEn },
    heroImageUrl: r.heroImageUrl,
    categories: r.categories,
    languages: r.languages,
    contentFormats: r.contentFormats,
    socialLinks: r.socialLinks,
    featuredWork: r.featuredWork,
  });
}

async function serializable<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (
        attempt >= 2 ||
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "P2034"
      )
        throw error;
    }
  }
}

async function brandPublicationIssues(
  database: Prisma.TransactionClient,
  brandId: string,
  input: BrandProfileInput,
) {
  const issues = publicationIssues(input);
  if (!issues.includes("brandEvidence")) return issues;
  const activeProducts = await database.product.count({
    where: {
      brandId,
      status: "ACTIVE",
      id: { in: input.featuredProductIds },
    },
  });
  return activeProducts > 0
    ? issues.filter((issue) => issue !== "brandEvidence")
    : issues;
}

async function saveBrandSafely(brandId: string, input: BrandProfileInput) {
  return serializable(async (tx) => {
    const current = await tx.brandProfile.findUnique({
      where: { brandId },
      select: { status: true },
    });
    if (current?.status === "PUBLISHED") {
      const profile = await tx.brandProfile.update({
        where: { brandId },
        data: { draftData: input as unknown as Prisma.InputJsonValue },
        select: brandSelect,
      });
      return { profile, demoted: false };
    }
    if (input.profileName !== undefined)
      await tx.brand.update({
        where: { id: brandId },
        data: { name: input.profileName },
      });
    const profile = await tx.brandProfile.upsert({
      where: { brandId },
      create: { brandId, ...brandData(input) },
      update: { ...brandData(input), draftData: Prisma.DbNull },
      select: brandSelect,
    });
    return { profile, demoted: false };
  });
}

async function saveCreatorSafely(
  creatorId: string,
  input: CreatorProfileInput,
) {
  return serializable(async (tx) => {
    const current = await tx.creatorProfile.findUnique({
      where: { creatorId },
      select: { status: true },
    });
    if (current?.status === "PUBLISHED") {
      const profile = await tx.creatorProfile.update({
        where: { creatorId },
        data: { draftData: input as unknown as Prisma.InputJsonValue },
        select: creatorSelect,
      });
      return { profile, demoted: false };
    }
    if (input.profileName !== undefined)
      await tx.creator.update({
        where: { id: creatorId },
        data: { displayName: input.profileName },
      });
    const profile = await tx.creatorProfile.upsert({
      where: { creatorId },
      create: { creatorId, ...creatorData(input) },
      update: { ...creatorData(input), draftData: Prisma.DbNull },
      select: creatorSelect,
    });
    return { profile, demoted: false };
  });
}

async function publishBrandSafely(brandId: string) {
  return serializable(async (tx) => {
    const row = await tx.brandProfile.findUnique({
      where: { brandId },
      select: { ...brandSelect, draftData: true },
    });
    if (!row) return { kind: "not-found" as const };
    const profile = row.draftData
      ? brandProfileInputSchema.parse(row.draftData)
      : databaseBrandProfile(row);
    const issues = await brandPublicationIssues(tx, brandId, profile);
    if (issues.length) return { kind: "incomplete" as const, issues };
    if (profile.profileName !== undefined)
      await tx.brand.update({
        where: { id: brandId },
        data: { name: profile.profileName },
      });
    await tx.brandProfile.update({
      where: { brandId },
      data: {
        ...brandData(profile),
        draftData: Prisma.DbNull,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    return { kind: "published" as const, profile };
  });
}

async function publishCreatorSafely(creatorId: string) {
  return serializable(async (tx) => {
    const row = await tx.creatorProfile.findUnique({
      where: { creatorId },
      select: { ...creatorSelect, draftData: true },
    });
    if (!row) return { kind: "not-found" as const };
    const profile = row.draftData
      ? creatorProfileInputSchema.parse(row.draftData)
      : databaseCreatorProfile(row);
    const issues = publicationIssues(profile);
    if (issues.length) return { kind: "incomplete" as const, issues };
    if (profile.profileName !== undefined)
      await tx.creator.update({
        where: { id: creatorId },
        data: { displayName: profile.profileName },
      });
    await tx.creatorProfile.update({
      where: { creatorId },
      data: {
        ...creatorData(profile),
        draftData: Prisma.DbNull,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    return { kind: "published" as const, profile };
  });
}

export const prismaProfileRepository = {
  getBrandForOwner: async (brandId: string) => {
    const row = await prisma.brandProfile.findUnique({
      where: { brandId },
      select: { ...brandSelect, draftData: true },
    });
    if (!row?.draftData) return row;
    const draft = brandProfileInputSchema.parse(row.draftData);
    return {
      ...row,
      ...brandData(draft),
      brand: { name: draft.profileName ?? row.brand.name },
      hasUnpublishedChanges: true,
    };
  },
  getCreatorForOwner: async (creatorId: string) => {
    const row = await prisma.creatorProfile.findUnique({
      where: { creatorId },
      select: { ...creatorSelect, draftData: true },
    });
    if (!row?.draftData) return row;
    const draft = creatorProfileInputSchema.parse(row.draftData);
    return {
      ...row,
      ...creatorData(draft),
      creator: { displayName: draft.profileName ?? row.creator.displayName },
      hasUnpublishedChanges: true,
    };
  },
  saveBrand: saveBrandSafely,
  saveCreator: saveCreatorSafely,
  saveBrandSafely,
  saveCreatorSafely,
  publishBrandSafely,
  publishCreatorSafely,
  setBrandStatus: async (brandId: string, status: "DRAFT" | "PUBLISHED") => {
    if (status === "PUBLISHED") {
      const result = await publishBrandSafely(brandId);
      if (result.kind !== "published") throw new Error(result.kind);
      return;
    }
    await prisma.brandProfile.update({
      where: { brandId },
      data: { status: "DRAFT", publishedAt: null },
    });
  },
  setCreatorStatus: async (
    creatorId: string,
    status: "DRAFT" | "PUBLISHED",
  ) => {
    if (status === "PUBLISHED") {
      const result = await publishCreatorSafely(creatorId);
      if (result.kind !== "published") throw new Error(result.kind);
      return;
    }
    await prisma.creatorProfile.update({
      where: { creatorId },
      data: { status: "DRAFT", publishedAt: null },
    });
  },
};

export async function countOwnedBrandProducts(
  brandId: string,
  productIds: readonly string[],
) {
  return prisma.product.count({
    where: { brandId, id: { in: [...productIds] } },
  });
}

export async function getPublicBrandProfile(slug: string) {
  const profile = await prisma.brandProfile.findFirst({
    where: { slug, status: "PUBLISHED", brand: { status: "APPROVED" } },
    select: brandSelect,
  });
  if (!profile) return undefined;
  const ids = Array.isArray(profile.featuredProductIds)
    ? profile.featuredProductIds.filter(
        (x): x is string => typeof x === "string",
      )
    : [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, brandId: profile.brandId, status: "ACTIVE" },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrls: true,
      backlinkUrl: true,
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return {
    ...profile,
    featuredProducts: ids.flatMap((id) => {
      const value = byId.get(id);
      return value ? [value] : [];
    }),
  };
}

export async function getPublicCreatorProfile(slug: string) {
  return (
    (await prisma.creatorProfile.findFirst({
      where: { slug, status: "PUBLISHED", creator: { status: "APPROVED" } },
      select: creatorSelect,
    })) ?? undefined
  );
}

function textWhere(
  filters: ProfileDirectoryFilters,
  locale: Locale,
  role: "brand" | "creator",
) {
  const query = filters.query?.trim();
  const location = filters.location?.trim();
  const nameField = role === "brand" ? "name" : "displayName";
  return {
    ...(filters.category ? { categories: { has: filters.category } } : {}),
    ...(location
      ? {
          OR: [
            {
              [locale === "ka" ? "locationKa" : "locationEn"]: {
                contains: location,
                mode: "insensitive" as const,
              },
            },
            {
              [locale === "ka" ? "locationEn" : "locationKa"]: {
                contains: location,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(query
      ? {
          AND: [
            {
              OR: [
                {
                  [locale === "ka" ? "taglineKa" : "taglineEn"]: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  [role]: {
                    [nameField]: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                },
              ],
            },
          ],
        }
      : {}),
  };
}

export async function listPublicBrandProfiles(
  locale: Locale,
  filters: ProfileDirectoryFilters = {},
) {
  return prisma.brandProfile.findMany({
    where: {
      status: "PUBLISHED",
      slug: { not: null },
      brand: { status: "APPROVED" },
      ...textWhere(filters, locale, "brand"),
    },
    select: {
      id: true,
      slug: true,
      taglineKa: true,
      taglineEn: true,
      locationKa: true,
      locationEn: true,
      heroImageUrl: true,
      logoUrl: true,
      categories: true,
      brand: { select: { name: true } },
    },
    orderBy: [{ brand: { name: "asc" } }, { id: "asc" }],
  });
}
export async function listPublicCreatorProfiles(
  locale: Locale,
  filters: ProfileDirectoryFilters = {},
) {
  return prisma.creatorProfile.findMany({
    where: {
      status: "PUBLISHED",
      slug: { not: null },
      creator: { status: "APPROVED" },
      ...textWhere(filters, locale, "creator"),
    },
    select: {
      id: true,
      slug: true,
      taglineKa: true,
      taglineEn: true,
      locationKa: true,
      locationEn: true,
      heroImageUrl: true,
      categories: true,
      creator: { select: { displayName: true } },
    },
    orderBy: [{ creator: { displayName: "asc" } }, { id: "asc" }],
  });
}

export async function getProfilePartnership(
  brandId: string,
  creatorId: string,
) {
  return prisma.partnership.findUnique({
    where: { brandId_creatorId: { brandId, creatorId } },
    select: { status: true },
  });
}

export async function listOwnedActiveProducts(brandId: string) {
  return prisma.product.findMany({
    where: { brandId, status: "ACTIVE" },
    select: { id: true, title: true, imageUrls: true, backlinkUrl: true },
    orderBy: [{ title: "asc" }, { id: "asc" }],
  });
}

export async function getBrandProfileForAdmin(brandId: string) {
  const [account, savedProfile] = await Promise.all([
    prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        id: true,
        name: true,
        status: true,
        user: { select: { email: true, accessDisabled: true } },
      },
    }),
    prisma.brandProfile.findUnique({
      where: { brandId },
      select: { ...brandSelect, draftData: true },
    }),
  ]);
  if (!account) return undefined;
  if (!savedProfile)
    return {
      kind: "brand" as const,
      account: {
        id: account.id,
        name: account.name,
        email: account.user.email,
        status: account.user.accessDisabled ? "SUSPENDED" : account.status,
      },
      profile: undefined,
      publicationStatus: undefined,
    };
  const draft = savedProfile.draftData
    ? brandProfileInputSchema.parse(savedProfile.draftData)
    : undefined;
  const profile = draft
    ? {
        ...savedProfile,
        ...brandData(draft),
        brand: { name: draft.profileName ?? savedProfile.brand.name },
      }
    : savedProfile;
  const ids = Array.isArray(profile.featuredProductIds)
    ? profile.featuredProductIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, brandId },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrls: true,
      backlinkUrl: true,
    },
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  return {
    kind: "brand" as const,
    account: {
      id: account.id,
      name: account.name,
      email: account.user.email,
      status: account.user.accessDisabled ? "SUSPENDED" : account.status,
    },
    publicationStatus: savedProfile.status,
    profile: {
      ...profile,
      featuredProducts: ids.flatMap((id) => {
        const product = byId.get(id);
        return product ? [product] : [];
      }),
    },
  };
}

export async function getCreatorProfileForAdmin(creatorId: string) {
  const [account, savedProfile] = await Promise.all([
    prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        displayName: true,
        status: true,
        user: { select: { email: true, accessDisabled: true } },
      },
    }),
    prisma.creatorProfile.findUnique({
      where: { creatorId },
      select: { ...creatorSelect, draftData: true },
    }),
  ]);
  if (!account) return undefined;
  if (!savedProfile)
    return {
      kind: "creator" as const,
      account: {
        id: account.id,
        name: account.displayName,
        email: account.user.email,
        status: account.user.accessDisabled ? "SUSPENDED" : account.status,
      },
      profile: undefined,
      publicationStatus: undefined,
    };
  const draft = savedProfile.draftData
    ? creatorProfileInputSchema.parse(savedProfile.draftData)
    : undefined;
  const profile = draft
    ? {
        ...savedProfile,
        ...creatorData(draft),
        creator: {
          displayName: draft.profileName ?? savedProfile.creator.displayName,
        },
      }
    : savedProfile;
  return {
    kind: "creator" as const,
    account: {
      id: account.id,
      name: account.displayName,
      email: account.user.email,
      status: account.user.accessDisabled ? "SUSPENDED" : account.status,
    },
    publicationStatus: savedProfile.status,
    profile,
  };
}
