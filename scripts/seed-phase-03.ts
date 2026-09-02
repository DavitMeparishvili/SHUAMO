import "dotenv/config";

Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? "development" });
const { prisma } = await import("@/src/infrastructure/db/client");

const brand = await prisma.brand.findUniqueOrThrow({
  where: { userId: "02000000-0000-4000-8000-000000000001" },
});
const creators = await prisma.creator.findMany({
  where: {
    userId: {
      in: [
        "02000000-0000-4000-8000-000000000002",
        "02000000-0000-4000-8000-000000000003",
        "02000000-0000-4000-8000-000000000004",
      ],
    },
  },
  orderBy: { userId: "asc" },
});
if (creators.length !== 3)
  throw new Error("Run pnpm seed:phase-2 before seed:phase-3");

const historicalLinkIds = (
  await prisma.trackingLink.findMany({
    where: { product: { brandId: brand.id } },
    select: { id: true },
  })
).map(({ id }) => id);

const productFixtures = [
  {
    id: "32000000-0000-4000-8000-000000000001",
    sku: "AROMA-100",
    title: "Amber perfume 100ml",
    productType: "BEAUTY_FRAGRANCE" as const,
    priceGel: "250.00",
    commissionType: "PERCENT" as const,
    commissionValue: "0.1250",
    status: "ACTIVE" as const,
  },
  {
    id: "32000000-0000-4000-8000-000000000002",
    sku: "AROMA-050",
    title: "Citrus perfume 50ml",
    productType: "BEAUTY_FRAGRANCE" as const,
    priceGel: "145.00",
    commissionType: "PERCENT" as const,
    commissionValue: "0.1000",
    status: "ACTIVE" as const,
  },
  {
    id: "32000000-0000-4000-8000-000000000003",
    sku: "CANDLE-01",
    title: "Amber candle",
    productType: "HOME_FRAGRANCE" as const,
    priceGel: "80.00",
    commissionType: "FIXED" as const,
    commissionValue: "8.0000",
    status: "ACTIVE" as const,
  },
  {
    id: "32000000-0000-4000-8000-000000000004",
    sku: "ARCHIVE-01",
    title: "Retired discovery set",
    productType: "BEAUTY_FRAGRANCE" as const,
    priceGel: "60.00",
    commissionType: "FIXED" as const,
    commissionValue: "6.0000",
    status: "ARCHIVED" as const,
  },
];

for (const fixture of productFixtures) {
  await prisma.product.upsert({
    where: { id: fixture.id },
    create: {
      ...fixture,
      brandId: brand.id,
      description: "Phase 3 catalogue fixture",
      backlinkUrl: `https://aromashop.ge/p/${fixture.sku.toLowerCase()}`,
    },
    update: {
      sku: fixture.sku,
      title: fixture.title,
      priceGel: fixture.priceGel,
      commissionType: fixture.commissionType,
      commissionValue: fixture.commissionValue,
      status: fixture.status,
    },
  });
}

for (const [index, creator] of creators.entries()) {
  await prisma.partnership.upsert({
    where: { brandId_creatorId: { brandId: brand.id, creatorId: creator.id } },
    create: {
      id: `42000000-0000-4000-8000-00000000000${index + 1}`,
      brandId: brand.id,
      creatorId: creator.id,
      status: creator.status === "APPROVED" ? "APPROVED" : "PENDING",
    },
    update: { status: creator.status === "APPROVED" ? "APPROVED" : "PENDING" },
  });
}

const linkFixtures = [
  {
    code: "P1C1X000",
    product: productFixtures[0]!,
    creator: creators[0]!,
  },
  {
    code: "P2C1X000",
    product: productFixtures[1]!,
    creator: creators[0]!,
  },
  {
    code: "P3C1X000",
    product: productFixtures[2]!,
    creator: creators[0]!,
  },
  {
    code: "P1C2X000",
    product: productFixtures[0]!,
    creator: creators[1]!,
  },
] as const;

for (const fixture of linkFixtures) {
  await prisma.trackingLink.upsert({
    where: { code: fixture.code },
    create: {
      productId: fixture.product.id,
      creatorId: fixture.creator.id,
      code: fixture.code,
      commissionType: fixture.product.commissionType,
      commissionValue: fixture.product.commissionValue,
    },
    update: { status: "ACTIVE" },
  });
}

const intendedLinks = await prisma.trackingLink.findMany({
  where: {
    code: { in: linkFixtures.map(({ code }) => code) },
  },
  select: {
    productId: true,
    creatorId: true,
    product: { select: { status: true } },
    creator: {
      select: {
        partnerships: {
          where: { brandId: brand.id },
          select: { status: true },
        },
      },
    },
  },
});
if (
  intendedLinks.length !== linkFixtures.length ||
  intendedLinks.some(
    (link) =>
      link.product.status !== "ACTIVE" ||
      link.creator.partnerships[0]?.status !== "APPROVED",
  )
) {
  throw new Error(
    `Phase 3 seed expected ${linkFixtures.length} valid intended links, found ${intendedLinks.length}`,
  );
}

const linksForNonApprovedPartnerships = await prisma.trackingLink.count({
  where: {
    product: { brandId: brand.id },
    creator: {
      partnerships: {
        some: { brandId: brand.id, status: { not: "APPROVED" } },
      },
    },
  },
});
if (linksForNonApprovedPartnerships !== 0) {
  throw new Error(
    `Phase 3 seed found ${linksForNonApprovedPartnerships} links for non-approved partnerships`,
  );
}

const preservedHistoricalLinks = await prisma.trackingLink.count({
  where: { id: { in: historicalLinkIds } },
});
if (preservedHistoricalLinks !== historicalLinkIds.length) {
  throw new Error("Phase 3 seed must preserve every historical tracking link");
}

console.log(
  JSON.stringify({
    event: "phase_3_seeded",
    products: productFixtures.length,
    partnerships: creators.length,
    trackingLinks: intendedLinks.length,
    preservedHistoricalLinks,
  }),
);
await prisma.$disconnect();
