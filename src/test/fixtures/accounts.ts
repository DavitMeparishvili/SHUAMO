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
