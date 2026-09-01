import "dotenv/config";

Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? "development" });
const { prisma } = await import("@/src/infrastructure/db/client");

const brand = await prisma.brand.findUniqueOrThrow({
  where: { userId: "02000000-0000-4000-8000-000000000001" },
});
const creator = await prisma.creator.findUniqueOrThrow({
  where: { userId: "02000000-0000-4000-8000-000000000002" },
});

await prisma.partnership.upsert({
  where: { brandId_creatorId: { brandId: brand.id, creatorId: creator.id } },
  create: {
    id: "42000000-0000-4000-8000-000000000001",
    brandId: brand.id,
    creatorId: creator.id,
    status: "APPROVED",
  },
  update: { status: "APPROVED" },
});

const destination = new URL("/test-shop", process.env.APP_URL).toString();
const fixtures = [
  {
    productId: "34000000-0000-4000-8000-000000000001",
    linkId: "44000000-0000-4000-8000-000000000001",
    sku: "PHASE4-ACTIVE-1",
    code: "P4ACTV01",
    linkStatus: "ACTIVE" as const,
  },
  {
    productId: "34000000-0000-4000-8000-000000000002",
    linkId: "44000000-0000-4000-8000-000000000002",
    sku: "PHASE4-ACTIVE-2",
    code: "P4ACTV02",
    linkStatus: "ACTIVE" as const,
  },
  {
    productId: "34000000-0000-4000-8000-000000000003",
    linkId: "44000000-0000-4000-8000-000000000003",
    sku: "PHASE4-DISABLED",
    code: "P4END001",
    linkStatus: "DISABLED" as const,
  },
];

for (const fixture of fixtures) {
  await prisma.product.upsert({
    where: { id: fixture.productId },
    create: {
      id: fixture.productId,
      brandId: brand.id,
      sku: fixture.sku,
      title: `Redirect fixture ${fixture.code}`,
      description: "Phase 4 redirect fixture",
      priceGel: "100.00",
      backlinkUrl: destination,
      commissionType: "FIXED",
      commissionValue: "10.0000",
      status: "ACTIVE",
    },
    update: {
      title: `Redirect fixture ${fixture.code}`,
      backlinkUrl: destination,
      status: "ACTIVE",
    },
  });
  await prisma.trackingLink.upsert({
    where: {
      productId_creatorId: {
        productId: fixture.productId,
        creatorId: creator.id,
      },
    },
    create: {
      id: fixture.linkId,
      productId: fixture.productId,
      creatorId: creator.id,
      code: fixture.code,
      status: fixture.linkStatus,
    },
    update: { code: fixture.code, status: fixture.linkStatus },
  });
}

console.log(
  JSON.stringify({
    event: "phase_4_seeded",
    activeLinks: 2,
    disabledLinks: 1,
    destination,
  }),
);
await prisma.$disconnect();
