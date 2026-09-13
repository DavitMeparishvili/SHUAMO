import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
const host = new URL(process.env.DATABASE_URL || "postgresql://invalid")
  .hostname;
if (
  process.env.NODE_ENV === "production" ||
  !["localhost", "127.0.0.1", "[::1]", "postgres-dev"].includes(host)
)
  throw new Error("Finance demo seed requires a local development database.");
Object.assign(process.env, { NODE_ENV: "development" });
const { prisma } = await import("@/src/infrastructure/db/client");
const id = (n: number) =>
  `93000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const password = await hashPassword("Finance-demo-only-2026!");
const now = new Date(),
  today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now),
  month = today.slice(0, 7);
const roles = [
  {
    n: 1,
    name: "Finance administrator",
    email: "finance-admin@example.test",
    role: "admin",
  },
  {
    n: 2,
    name: "Aromashop Finance Demo",
    email: "finance-brand@example.test",
    role: "brand",
  },
  {
    n: 3,
    name: "ნინო · Finance Demo",
    email: "finance-creator@example.test",
    role: "creator",
  },
  {
    n: 4,
    name: "Aromashop Reports Demo",
    email: "finance-report-brand@example.test",
    role: "brand",
  },
  {
    n: 5,
    name: "Studio Margo Reports Demo",
    email: "finance-report-brand-2@example.test",
    role: "brand",
  },
  {
    n: 6,
    name: "ნინო Reports Demo",
    email: "finance-report-creator@example.test",
    role: "creator",
  },
  {
    n: 7,
    name: "Giorgi Reports Demo",
    email: "finance-report-creator-2@example.test",
    role: "creator",
  },
] as const;
try {
  for (const r of roles) {
    await prisma.user.upsert({
      where: { id: id(r.n) },
      create: {
        id: id(r.n),
        name: r.name,
        email: r.email,
        emailVerified: true,
      },
      update: { name: r.name, emailVerified: true },
    });
    await prisma.appUser.update({
      where: { id: id(r.n) },
      data: { isAdmin: r.role === "admin" || r.n === 7, locale: "en" },
    });
    await prisma.account.upsert({
      where: { id: id(100 + r.n) },
      create: {
        id: id(100 + r.n),
        accountId: id(r.n),
        providerId: "credential",
        userId: id(r.n),
        password,
      },
      update: { password },
    });
    if (r.role === "brand")
      await prisma.brand.upsert({
        where: { id: id(200 + r.n) },
        create: {
          id: id(200 + r.n),
          userId: id(r.n),
          name: r.name,
          keyPrefix: `finance_demo_${r.n}`,
          keyHash: "development-only-not-an-api-key",
          status: "APPROVED",
        },
        update: {},
      });
    if (r.role === "creator")
      await prisma.creator.upsert({
        where: { id: id(200 + r.n) },
        create: {
          id: id(200 + r.n),
          userId: id(r.n),
          displayName: r.name,
          status: "APPROVED",
          payoutName: r.name,
        },
        update: {},
      });
  }
  const partyIds = roles
    .filter((r) => r.role !== "admin")
    .map((r) => id(200 + r.n));
  if (process.argv.includes("--reset"))
    await prisma.$transaction(async (tx) => {
      const invoices = await tx.financeInvoice.findMany({
        where: {
          OR: [{ brandId: { in: partyIds } }, { creatorId: { in: partyIds } }],
        },
        select: { id: true },
      });
      const payments = await tx.financePayment.findMany({
        where: {
          OR: [{ brandId: { in: partyIds } }, { creatorId: { in: partyIds } }],
        },
        select: { id: true },
      });
      await tx.auditEvent.deleteMany({
        where: {
          entityId: { in: [...invoices, ...payments].map((r) => r.id) },
          action: { startsWith: "finance." },
        },
      });
      await tx.financePayment.deleteMany({
        where: { id: { in: payments.map((r) => r.id) }, kind: "REVERSAL" },
      });
      await tx.financePayment.deleteMany({
        where: { id: { in: payments.map((r) => r.id) } },
      });
      await tx.financeInvoiceLine.deleteMany({
        where: { invoiceId: { in: invoices.map((r) => r.id) } },
      });
      await tx.financeInvoice.deleteMany({
        where: { id: { in: invoices.map((r) => r.id) } },
      });
    });
  async function product(
    n: number,
    brandN: number,
    creatorN?: number,
    archived = false,
    disabled = false,
  ) {
    const productId = id(1000 + n),
      sku = `FIN-DEMO-${String(n).padStart(3, "0")}`;
    await prisma.product.upsert({
      where: { id: productId },
      create: {
        id: productId,
        brandId: id(200 + brandN),
        sku,
        title:
          n === 0
            ? "Finance Demo Fragrance"
            : `Report product ${String(n).padStart(2, "0")}`,
        priceGel: "100",
        backlinkUrl: "https://example.test/finance-demo",
        commissionType: "PERCENT",
        commissionValue: "0.1",
        status: archived ? "ARCHIVED" : "ACTIVE",
      },
      update: {},
    });
    if (creatorN) {
      await prisma.partnership.upsert({
        where: {
          brandId_creatorId: {
            brandId: id(200 + brandN),
            creatorId: id(200 + creatorN),
          },
        },
        create: {
          brandId: id(200 + brandN),
          creatorId: id(200 + creatorN),
          status: "APPROVED",
        },
        update: {},
      });
      await prisma.trackingLink.upsert({
        where: { id: id(2000 + n) },
        create: {
          id: id(2000 + n),
          productId,
          creatorId: id(200 + creatorN),
          code: `FINDEMO${n}`,
          commissionType: "PERCENT",
          commissionValue: "0.1",
          status: disabled ? "DISABLED" : "ACTIVE",
        },
        update: {},
      });
    }
    return { productId, sku };
  }
  async function sale(
    n: number,
    brandN: number,
    creatorN: number,
    commission: string,
    net: string,
    cancelled = false,
  ) {
    const p = await prisma.product.findUniqueOrThrow({
        where: { id: id(1000 + n) },
      }),
      occurredAt = new Date(
        `${month}-${String(Math.min(Number(today.slice(8)), (n % 13) + 1)).padStart(2, "0")}T12:00:00+04:00`,
      );
    await prisma.conversion.upsert({
      where: { id: id(3000 + n) },
      create: {
        id: id(3000 + n),
        brandId: id(200 + brandN),
        orderId: `FIN-DEMO-ORDER-${n}`,
        requestFingerprint: "f".repeat(64),
        occurredAt,
        status: cancelled ? "CANCELLED" : "CONFIRMED",
      },
      update: {},
    });
    await prisma.conversionItem.upsert({
      where: { id: id(4000 + n) },
      create: {
        id: id(4000 + n),
        conversionId: id(3000 + n),
        sku: p.sku,
        qty: 1,
        unitPrice: net,
        lineDiscount: "0",
        lineVat: "0",
        commissionableNet: net,
      },
      update: {},
    });
    await prisma.click.upsert({
      where: { id: `ck_finance_demo_${n}` },
      create: {
        id: `ck_finance_demo_${n}`,
        trackingLinkId: id(2000 + n),
        brandId: id(200 + brandN),
        occurredAt: new Date(occurredAt.getTime() - 3600000),
      },
      update: {},
    });
    await prisma.attribution.upsert({
      where: { id: id(5000 + n) },
      create: {
        id: id(5000 + n),
        conversionItemId: id(4000 + n),
        clickId: `ck_finance_demo_${n}`,
        creatorId: id(200 + creatorN),
        productId: p.id,
        commissionAmount: commission,
      },
      update: {},
    });
  }
  await product(0, 2, 3);
  await sale(0, 2, 3, "300", "3000");
  for (let n = 1; n <= 26; n++) {
    await product(n, 4, n === 26 ? undefined : 6, n === 24, n === 23);
    if (n <= 16) await sale(n, 4, 6, "10", "100", n === 16);
  }
  await product(27, 5, 7);
  await sale(27, 5, 7, "20", "200");
  await prisma.trackingLink.upsert({
    where: { id: id(2099) },
    create: {
      id: id(2099),
      productId: id(1001),
      creatorId: id(207),
      code: "FINDEMOZERO",
      commissionType: "PERCENT",
      commissionValue: "0.1",
      status: "DISABLED",
    },
    update: {},
  });
  const priorMonth = new Date(`${month}-01T00:00:00Z`);
  priorMonth.setUTCDate(0);
  await prisma.financePayment.upsert({
    where: { requestKey: id(9000) },
    create: {
      id: id(9001),
      requestKey: id(9000),
      requestHash: "d".repeat(64),
      kind: "PAYMENT",
      brandId: id(204),
      amount: "50",
      transferredOn: priorMonth,
      partySnapshot: { name: "Aromashop Reports Demo" },
      recordedById: id(1),
      bankReference: "PRIOR-MONTH-DEMO",
    },
    update: {},
  });
  console.log(
    "Finance fixtures ready. Local demo password: Finance-demo-only-2026!",
  );
  console.log(
    "Admin: finance-admin@example.test; owners: finance-brand@example.test, finance-creator@example.test",
  );
  console.log(
    `Base brand ${id(202)}; base creator ${id(203)}; report brand ${id(204)} (26 products).`,
  );
} finally {
  await prisma.$disconnect();
}
