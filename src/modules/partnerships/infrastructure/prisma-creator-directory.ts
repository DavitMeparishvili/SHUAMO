import { prisma } from "@/src/infrastructure/db/client";
import type { Locale } from "@/src/modules/localization";
import type { CreatorDirectoryItem } from "../domain/creator-directory";

export async function listCreatorDirectoryForBrand(
  brandId: string,
  locale: Locale,
): Promise<CreatorDirectoryItem[]> {
  const [creators, sellers] = await Promise.all([
    prisma.creator.findMany({
      where: {
        OR: [{ status: "APPROVED" }, { partnerships: { some: { brandId } } }],
      },
      select: {
        id: true,
        displayName: true,
        createdAt: true,
        profile: {
          where: { status: "PUBLISHED", slug: { not: null } },
          select: {
            slug: true,
            taglineEn: true,
            taglineKa: true,
            locationEn: true,
            locationKa: true,
            heroImageUrl: true,
            categories: true,
            contentFormats: true,
          },
        },
        partnerships: {
          where: { brandId },
          select: { id: true, status: true, createdAt: true },
        },
        _count: { select: { links: { where: { product: { brandId } } } } },
      },
    }),
    prisma.creator.findMany({
      where: {
        links: {
          some: {
            product: { brandId },
            clicks: {
              some: {
                attributions: {
                  some: {
                    status: "CANONICAL",
                    conversionItem: { conversion: { status: "CONFIRMED" } },
                  },
                },
              },
            },
          },
        },
      },
      select: { id: true },
    }),
  ]);
  const hasSale = new Set(sellers.map((creator) => creator.id));
  return creators.map((creator) => {
    const profile = creator.profile;
    const partnership = creator.partnerships[0];
    const localized = (en: string | undefined, ka: string | undefined) =>
      (locale === "ka" ? ka || en : en || ka) ?? "";
    return {
      id: creator.id,
      name: creator.displayName,
      tagline: localized(profile?.taglineEn, profile?.taglineKa),
      location: localized(profile?.locationEn, profile?.locationKa),
      locationKey: profile?.locationEn || profile?.locationKa || "",
      imageUrl: profile?.heroImageUrl ?? "",
      profileHref: profile?.slug ? `/${locale}/creators/${profile.slug}` : null,
      categories: profile?.categories ?? [],
      formats: profile?.contentFormats ?? [],
      status: partnership?.status ?? "NOT_PARTNERED",
      partnershipId: partnership?.id ?? null,
      createdAt: creator.createdAt.toISOString(),
      appliedAt: partnership?.createdAt.toISOString() ?? null,
      linkCount: creator._count.links,
      hasSale: hasSale.has(creator.id),
    };
  });
}
