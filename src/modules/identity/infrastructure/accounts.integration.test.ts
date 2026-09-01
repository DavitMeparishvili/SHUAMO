import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";

async function createUser(email: string) {
  const authUser = await prisma.user.create({
    data: { email, name: email, emailVerified: true },
  });
  return prisma.appUser.findUniqueOrThrow({ where: { id: authUser.id } });
}

describe("account tables", () => {
  it("defaults a new brand and creator to PENDING", async () => {
    const brandUser = await createUser("brand@example.ge");
    const creatorUser = await createUser("creator@example.ge");
    const brand = await prisma.brand.create({
      data: {
        userId: brandUser.id,
        name: "Aromashop",
        keyPrefix: "xu_sk_AAAAAAAA",
        keyHash: "hash",
      },
    });
    const creator = await prisma.creator.create({
      data: { userId: creatorUser.id, displayName: "Nino" },
    });
    expect(brand.status).toBe("PENDING");
    expect(brand.vatRegistered).toBe(false);
    expect(creator.status).toBe("PENDING");
    expect(creator.payoutIban).toBeNull();
    expect(creator.bio).toBe("");
  });
  it("refuses a second brand for the same user in PostgreSQL", async () => {
    const user = await createUser("brand2@example.ge");
    await prisma.brand.create({
      data: {
        userId: user.id,
        name: "One",
        keyPrefix: "xu_sk_BBBBBBBB",
        keyHash: "h",
      },
    });
    await expect(
      prisma.brand.create({
        data: {
          userId: user.id,
          name: "Two",
          keyPrefix: "xu_sk_CCCCCCCC",
          keyHash: "h",
        },
      }),
    ).rejects.toThrow();
  });
  it("refuses duplicate prefixes and emails", async () => {
    const first = await createUser("a@example.ge");
    const second = await createUser("b@example.ge");
    await prisma.brand.create({
      data: {
        userId: first.id,
        name: "A",
        keyPrefix: "xu_sk_DDDDDDDD",
        keyHash: "h",
      },
    });
    await expect(
      prisma.brand.create({
        data: {
          userId: second.id,
          name: "B",
          keyPrefix: "xu_sk_DDDDDDDD",
          keyHash: "h",
        },
      }),
    ).rejects.toThrow();
    await expect(createUser("a@example.ge")).rejects.toThrow();
  });
  it("refuses a locale outside ka and en at the database", async () => {
    const user = await createUser("ru@example.ge");
    await expect(
      prisma.$executeRaw`UPDATE app_user SET locale = 'ru' WHERE id = ${user.id}::uuid`,
    ).rejects.toThrow();
  });
});
