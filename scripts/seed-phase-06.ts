import "dotenv/config";
import { Money } from "@/src/modules/shared";

Object.assign(process.env, {
  NODE_ENV: process.env.NODE_ENV ?? "development",
});
const { prisma } = await import("@/src/infrastructure/db/client");
const { intakeConversionForBrand } =
  await import("@/src/infrastructure/phase-6-services");
const { mintApiKey } = await import("@/src/modules/identity");

const brand = await prisma.brand.findUniqueOrThrow({
  where: { userId: "02000000-0000-4000-8000-000000000001" },
});
const key = mintApiKey({ bytes: (count) => new Uint8Array(count).fill(11) });
await prisma.brand.update({
  where: { id: brand.id },
  data: { keyPrefix: key.prefix, keyHash: key.hash },
});
const product = await prisma.product.findUniqueOrThrow({
  where: { id: "34000000-0000-4000-8000-000000000001" },
});
const link = await prisma.trackingLink.findUniqueOrThrow({
  where: { id: "44000000-0000-4000-8000-000000000001" },
});
const seededAt = new Date();
const attributedAt =
  (
    await prisma.conversion.findUnique({
      where: {
        brandId_orderId: {
          brandId: brand.id,
          orderId: "PHASE6-SEED-1234",
        },
      },
      select: { occurredAt: true },
    })
  )?.occurredAt ?? seededAt;
const unattributedAt =
  (
    await prisma.conversion.findUnique({
      where: {
        brandId_orderId: {
          brandId: brand.id,
          orderId: "UNATTRIBUTED-ORDER",
        },
      },
      select: { occurredAt: true },
    })
  )?.occurredAt ?? seededAt;
const click = await prisma.click.upsert({
  where: { id: "ck_phase6_seeded" },
  create: {
    id: "ck_phase6_seeded",
    trackingLinkId: link.id,
    brandId: brand.id,
    occurredAt: new Date(seededAt.getTime() - 60_000),
    creditable: false,
  },
  update: { occurredAt: new Date(seededAt.getTime() - 60_000) },
});

const attributed = await intakeConversionForBrand(
  { id: brand.id, vatRegistered: brand.vatRegistered },
  {
    orderId: "PHASE6-SEED-1234",
    occurredAt: attributedAt,
    clickId: click.id,
    items: [
      {
        sku: product.sku,
        qty: 1,
        unitPrice: Money.of("100.00"),
        lineDiscount: Money.ZERO,
        lineVat: Money.ZERO,
      },
    ],
  },
);
const unattributed = await intakeConversionForBrand(
  { id: brand.id, vatRegistered: brand.vatRegistered },
  {
    orderId: "UNATTRIBUTED-ORDER",
    occurredAt: unattributedAt,
    clickId: undefined,
    items: [
      {
        sku: "UNKNOWN-SKU",
        qty: 1,
        unitPrice: Money.of("25.00"),
        lineDiscount: Money.ZERO,
        lineVat: Money.ZERO,
      },
    ],
  },
);

console.log(
  JSON.stringify({
    event: "phase_6_seeded",
    attributed: attributed.kind,
    unattributed: unattributed.kind,
  }),
);
await prisma.$disconnect();
