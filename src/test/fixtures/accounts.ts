import { prisma } from "@/src/infrastructure/db/client";

export async function seedBrand(
  options: {
    email?: string;
    status?: "PENDING" | "APPROVED" | "SUSPENDED";
  } = {},
) {
  const email = options.email ?? `${crypto.randomUUID()}@brand.example.ge`;
  const user = await prisma.user.create({
    data: { email, name: "Test brand", emailVerified: true },
  });
  return prisma.brand.create({
    data: {
      userId: user.id,
      name: "Test brand",
      keyPrefix: `xu_sk_${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
      keyHash: "test-hash",
      status: options.status ?? "APPROVED",
    },
  });
}

export async function seedCreator(
  options: {
    email?: string;
    status?: "PENDING" | "APPROVED" | "SUSPENDED";
  } = {},
) {
  const email = options.email ?? `${crypto.randomUUID()}@creator.example.ge`;
  const user = await prisma.user.create({
    data: { email, name: "Test creator", emailVerified: true },
  });
  return prisma.creator.create({
    data: {
      userId: user.id,
      displayName: "Test creator",
      status: options.status ?? "APPROVED",
    },
  });
}

export async function seedApprovedPartnership() {
  const [brand, creator] = await Promise.all([seedBrand(), seedCreator()]);
  const partnership = await prisma.partnership.create({
    data: { brandId: brand.id, creatorId: creator.id, status: "APPROVED" },
  });
  return { brand, creator, partnership };
}

export async function seedLink(
  options: {
    code?: string;
    backlinkUrl?: string;
    linkStatus?: "ACTIVE" | "DISABLED";
    productStatus?: "ACTIVE" | "ARCHIVED";
  } = {},
) {
  const { brand, creator, partnership } = await seedApprovedPartnership();
  const suffix = crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      sku: `TEST-${suffix}`,
      title: "Tracked product",
      priceGel: "100.00",
      backlinkUrl: options.backlinkUrl ?? "https://shop.example.ge/product",
      commissionType: "FIXED",
      commissionValue: "10.0000",
      status: options.productStatus ?? "ACTIVE",
    },
  });
  const link = await prisma.trackingLink.create({
    data: {
      productId: product.id,
      creatorId: creator.id,
      code: options.code ?? suffix,
      status: options.linkStatus ?? "ACTIVE",
    },
  });
  return { brand, creator, partnership, product, link };
}
