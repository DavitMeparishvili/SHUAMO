import "dotenv/config";
import { hashPassword } from "better-auth/crypto";

// Idempotent local-only fixture for the team leads e2e spec: a lead, one
// member with a confirmed sale, and an outsider with a sale of their own.
const host = new URL(process.env.DATABASE_URL || "postgresql://invalid")
  .hostname;
if (
  process.env.NODE_ENV === "production" ||
  !["localhost", "127.0.0.1", "[::1]", "postgres-dev"].includes(host)
)
  throw new Error("Team lead seed requires a local development database.");
Object.assign(process.env, { NODE_ENV: "development" });
const { prisma } = await import("@/src/infrastructure/db/client");

const id = (n: number) =>
  `94000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const password = await hashPassword("Team-demo-only-2026!");
const people = [
  { n: 1, name: "Team Demo Brand", email: "team-brand@example.test" },
  { n: 2, name: "Tamar Team Lead", email: "team-lead@example.test" },
  { n: 3, name: "Levan Team Member", email: "team-member@example.test" },
  { n: 4, name: "Ana Outsider", email: "team-outsider@example.test" },
] as const;

try {
  for (const p of people) {
    await prisma.user.upsert({
      where: { id: id(p.n) },
      create: {
        id: id(p.n),
        name: p.name,
        email: p.email,
        emailVerified: true,
      },
      update: { name: p.name, emailVerified: true },
    });
    await prisma.appUser.update({
      where: { id: id(p.n) },
      data: { isAdmin: false, accessDisabled: false, locale: "en" },
    });
    await prisma.account.upsert({
      where: { id: id(100 + p.n) },
      create: {
        id: id(100 + p.n),
        accountId: id(p.n),
        providerId: "credential",
        userId: id(p.n),
        password,
      },
      update: { password },
    });
  }
  await prisma.brand.upsert({
    where: { id: id(201) },
    create: {
      id: id(201),
      userId: id(1),
      name: "Team Demo Brand",
      keyPrefix: "team_demo_1",
      keyHash: "development-only-not-an-api-key",
      status: "APPROVED",
    },
    update: { status: "APPROVED" },
  });
  // The lead first, so the member's foreign key resolves.
  for (const c of [
    { n: 2, isTeamLead: true, teamLeadId: null },
    { n: 3, isTeamLead: false, teamLeadId: id(202) },
    { n: 4, isTeamLead: false, teamLeadId: null },
  ]) {
    const data = {
      status: "APPROVED" as const,
      isTeamLead: c.isTeamLead,
      teamLeadId: c.teamLeadId,
    };
    await prisma.creator.upsert({
      where: { id: id(200 + c.n) },
      create: {
        id: id(200 + c.n),
        userId: id(c.n),
        displayName: people.find((p) => p.n === c.n)!.name,
        payoutName: people.find((p) => p.n === c.n)!.name,
        ...data,
      },
      update: data,
    });
  }
  await prisma.product.upsert({
    where: { id: id(1001) },
    create: {
      id: id(1001),
      brandId: id(201),
      sku: "TEAM-DEMO-001",
      title: "Team demo candle",
      priceGel: "100",
      backlinkUrl: "https://example.test/team-demo",
      commissionType: "PERCENT",
      commissionValue: "0.1",
      status: "ACTIVE",
    },
    update: {},
  });
  // Recent enough to fall inside the default "this month" report.
  const occurredAt = new Date(Date.now() - 60_000);
  for (const creatorN of [3, 4]) {
    await prisma.partnership.upsert({
      where: {
        brandId_creatorId: { brandId: id(201), creatorId: id(200 + creatorN) },
      },
      create: {
        brandId: id(201),
        creatorId: id(200 + creatorN),
        status: "APPROVED",
      },
      update: {},
    });
    await prisma.trackingLink.upsert({
      where: { id: id(2000 + creatorN) },
      create: {
        id: id(2000 + creatorN),
        productId: id(1001),
        creatorId: id(200 + creatorN),
        code: `TEAMDEMO${creatorN}`,
        commissionType: "PERCENT",
        commissionValue: "0.1",
        status: "ACTIVE",
      },
      update: {},
    });
    await prisma.conversion.upsert({
      where: { id: id(3000 + creatorN) },
      create: {
        id: id(3000 + creatorN),
        brandId: id(201),
        orderId: `TEAM-DEMO-ORDER-${creatorN}`,
        requestFingerprint: "f".repeat(64),
        occurredAt,
        status: "CONFIRMED",
      },
      update: { occurredAt, status: "CONFIRMED" },
    });
    await prisma.conversionItem.upsert({
      where: { id: id(4000 + creatorN) },
      create: {
        id: id(4000 + creatorN),
        conversionId: id(3000 + creatorN),
        sku: "TEAM-DEMO-001",
        qty: 1,
        unitPrice: "100",
        lineDiscount: "0",
        lineVat: "0",
        commissionableNet: "100",
      },
      update: {},
    });
    await prisma.click.upsert({
      where: { id: `ck_team_demo_${creatorN}` },
      create: {
        id: `ck_team_demo_${creatorN}`,
        trackingLinkId: id(2000 + creatorN),
        brandId: id(201),
        occurredAt: new Date(occurredAt.getTime() - 60_000),
      },
      update: { occurredAt: new Date(occurredAt.getTime() - 60_000) },
    });
    await prisma.attribution.upsert({
      where: { id: id(5000 + creatorN) },
      create: {
        id: id(5000 + creatorN),
        conversionItemId: id(4000 + creatorN),
        clickId: `ck_team_demo_${creatorN}`,
        creatorId: id(200 + creatorN),
        productId: id(1001),
        commissionAmount: "10",
      },
      update: {},
    });
  }
  process.stdout.write(
    JSON.stringify({ lead: id(202), member: id(203), outsider: id(204) }),
  );
} finally {
  await prisma.$disconnect();
}
