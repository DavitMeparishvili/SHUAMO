import "dotenv/config";
import { hashPassword } from "better-auth/crypto";

Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? "development" });
const { prisma } = await import("@/src/infrastructure/db/client");
const { mintApiKey } = await import("@/src/modules/identity");

const FIXED_AT = new Date("2026-08-29T08:00:00.000Z");
const PASSWORD = "seeded-password-01";
const key = mintApiKey({ bytes: (count) => new Uint8Array(count).fill(11) });

const fixtures = [
  {
    userId: "02000000-0000-4000-8000-000000000001",
    accountId: "12000000-0000-4000-8000-000000000001",
    roleId: "22000000-0000-4000-8000-000000000001",
    email: "brand@aromashop.ge",
    name: "Aromashop",
    role: "brand" as const,
    status: "APPROVED" as const,
    vatRegistered: true,
  },
  {
    userId: "02000000-0000-4000-8000-000000000002",
    accountId: "12000000-0000-4000-8000-000000000002",
    roleId: "22000000-0000-4000-8000-000000000002",
    email: "nino@creators.ge",
    name: "Nino",
    role: "creator" as const,
    status: "APPROVED" as const,
  },
  {
    userId: "02000000-0000-4000-8000-000000000003",
    accountId: "12000000-0000-4000-8000-000000000003",
    roleId: "22000000-0000-4000-8000-000000000003",
    email: "dato@creators.ge",
    name: "Dato",
    role: "creator" as const,
    status: "APPROVED" as const,
  },
  {
    userId: "02000000-0000-4000-8000-000000000004",
    accountId: "12000000-0000-4000-8000-000000000004",
    roleId: "22000000-0000-4000-8000-000000000004",
    email: "pending@creators.ge",
    name: "Pending Creator",
    role: "creator" as const,
    status: "PENDING" as const,
  },
  {
    userId: "02000000-0000-4000-8000-000000000005",
    accountId: "12000000-0000-4000-8000-000000000005",
    roleId: "22000000-0000-4000-8000-000000000005",
    email: "suspended@aromashop.ge",
    name: "Suspended Shop",
    role: "brand" as const,
    status: "SUSPENDED" as const,
    vatRegistered: false,
  },
];

const passwordHash = await hashPassword(PASSWORD);

for (const fixture of fixtures) {
  await prisma.user.upsert({
    where: { email: fixture.email },
    create: {
      id: fixture.userId,
      email: fixture.email,
      name: fixture.name,
      emailVerified: true,
      createdAt: FIXED_AT,
      updatedAt: FIXED_AT,
    },
    update: { name: fixture.name, emailVerified: true, updatedAt: FIXED_AT },
  });
  await prisma.appUser.upsert({
    where: { email: fixture.email },
    create: {
      id: fixture.userId,
      email: fixture.email,
      locale: "ka",
      createdAt: FIXED_AT,
    },
    update: { locale: "ka" },
  });
  await prisma.account.upsert({
    where: { id: fixture.accountId },
    create: {
      id: fixture.accountId,
      accountId: fixture.userId,
      providerId: "credential",
      userId: fixture.userId,
      password: passwordHash,
      createdAt: FIXED_AT,
      updatedAt: FIXED_AT,
    },
    update: { password: passwordHash, updatedAt: FIXED_AT },
  });
  if (fixture.role === "brand") {
    await prisma.brand.upsert({
      where: { userId: fixture.userId },
      create: {
        id: fixture.roleId,
        userId: fixture.userId,
        name: fixture.name,
        status: fixture.status,
        vatRegistered: fixture.vatRegistered,
        keyPrefix: fixture.userId.endsWith("1") ? key.prefix : "xu_sk_SUSPEND0",
        keyHash: fixture.userId.endsWith("1") ? key.hash : "suspended",
        createdAt: FIXED_AT,
      },
      update: {
        name: fixture.name,
        status: fixture.status,
        vatRegistered: fixture.vatRegistered,
        keyPrefix: fixture.userId.endsWith("1") ? key.prefix : "xu_sk_SUSPEND0",
        keyHash: fixture.userId.endsWith("1") ? key.hash : "suspended",
      },
    });
  } else {
    await prisma.creator.upsert({
      where: { userId: fixture.userId },
      create: {
        id: fixture.roleId,
        userId: fixture.userId,
        displayName: fixture.name,
        status: fixture.status,
        createdAt: FIXED_AT,
      },
      update: { displayName: fixture.name, status: fixture.status },
    });
  }
}

console.log(
  JSON.stringify({
    event: "phase_2_seeded",
    accounts: fixtures.length,
    brandKey: key.plaintext,
  }),
);
await prisma.$disconnect();
