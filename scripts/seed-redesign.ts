import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import Decimal from "decimal.js";
import { createHash } from "node:crypto";

Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? "development" });
const database = new URL(process.env.DATABASE_URL!);
if (
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  !database.pathname.includes("dev")
)
  throw new Error("Redesign fixtures require the local development database.");
const { prisma } = await import("@/src/infrastructure/db/client");
const id = (n: number) =>
  `96000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const brandId = "22000000-0000-4000-8000-000000000001";
const creators = [
  "22000000-0000-4000-8000-000000000002",
  "22000000-0000-4000-8000-000000000003",
  id(103),
];
const now = new Date();
const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tbilisi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(now);
const today = new Date(`${day}T00:00:00+04:00`);
const hash = await hashPassword("seeded-password-01");
try {
  // Dedicated fixture accounts; existing user-authored content is never reset.
  for (const [i, name] of ["Mari", "Salome", "Giorgi", "Ana"].entries()) {
    const userId = id(3 + i),
      creatorId = id(103 + i),
      email = `${name.toLowerCase()}.redesign@creators.ge`;
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email, name, emailVerified: true },
      update: {},
    });
    await prisma.account.upsert({
      where: { id: id(203 + i) },
      create: {
        id: id(203 + i),
        accountId: userId,
        userId,
        providerId: "credential",
        password: hash,
      },
      update: {},
    });
    await prisma.creator.upsert({
      where: { id: creatorId },
      create: { id: creatorId, userId, displayName: name, status: "APPROVED" },
      update: {},
    });
    await prisma.creatorProfile.upsert({
      where: { creatorId },
      create: {
        creatorId,
        slug: `${name.toLowerCase()}-redesign`,
        taglineEn: "Lifestyle and everyday discoveries in Georgia",
        taglineKa: "ცხოვრების სტილი და ყოველდღიური აღმოჩენები",
        descriptionEn:
          "I create thoughtful product stories and short-form videos for Georgian audiences.",
        descriptionKa:
          "ვქმნი პროდუქტების ისტორიებსა და მოკლე ვიდეოებს ქართული აუდიტორიისთვის.",
        categories: ["Lifestyle"],
        languages: ["Georgian", "English"],
        contentFormats: ["Reels", "Photography"],
        status: "DRAFT",
      },
      update: {},
    });
    await prisma.partnership.upsert({
      where: { brandId_creatorId: { brandId, creatorId } },
      create: { brandId, creatorId, status: i < 2 ? "APPROVED" : "PENDING" },
      update: {},
    });
  }
  const products = await prisma.product.findMany({
    where: {
      brandId,
      status: "ACTIVE",
      id: {
        in: [1, 2, 3].map(
          (n) => `32000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
        ),
      },
    },
    orderBy: { title: "asc" },
    take: 3,
  });
  if (products.length < 3)
    throw new Error("Run seed:phase-2, seed:phase-3, and seed:media first.");
  for (const [ci, creatorId] of creators.entries()) {
    await prisma.partnership.upsert({
      where: { brandId_creatorId: { brandId, creatorId } },
      create: { brandId, creatorId, status: "APPROVED" },
      update: {},
    });
    for (const [pi, product] of products.entries()) {
      const existingLink = await prisma.trackingLink.findFirst({
        where: { productId: product.id, creatorId, status: "ACTIVE" },
      });
      const linkId = existingLink?.id ?? id(300 + ci * 10 + pi),
        code = `XR${ci}${pi}DEMO`;
      const terms = {
        termsVersion: 1,
        cookieWindowDays: 30,
        commissionType: "FIXED",
        commissionValue: "10",
        payoutTiming: "AFTER_CONFIRMED_CONVERSION",
        allowedChannels: ["Instagram", "TikTok"],
        prohibitedPromotionMethods: [],
        availableRegions: ["Georgia"],
        couponPolicy: "",
        returnPolicy: "",
        contentRequirements: "",
        specialTerms: "",
      };
      await prisma.trackingLink.upsert({
        where: { id: linkId },
        create: {
          id: linkId,
          productId: product.id,
          creatorId,
          code,
          commissionType: "FIXED",
          commissionValue: "10",
          acceptedTerms: terms,
          termsAcceptedAt: new Date(today.getTime() - 45 * 86400000),
        },
        update: {},
      });
      for (let d = 1; d <= 30; d++) {
        const at = new Date(today.getTime() - d * 86400000 + 12 * 3600000);
        const count = 2 + ((d + ci + pi) % 4);
        for (let v = 0; v < count; v++) {
          const clickId = `ck_redesign_${ci}_${pi}_${d}_${v}`,
            clickAt = new Date(at.getTime() + v * 60000);
          await prisma.click.upsert({
            where: { id: clickId },
            create: {
              id: clickId,
              trackingLinkId: linkId,
              brandId,
              occurredAt: clickAt,
              creditable: true,
            },
            update: { occurredAt: clickAt },
          });
          if (v !== 0 || (d + pi + ci) % 3 === 0) continue;
          const orderId = `XR-${ci}${pi}-${String(d).padStart(3, "0")}`,
            cancelled = (d + ci * 2 + pi) % 9 === 0;
          const saleAt = new Date(clickAt.getTime() + 3600000);
          const conversion = await prisma.conversion.upsert({
            where: { brandId_orderId: { brandId, orderId } },
            create: {
              brandId,
              orderId,
              requestFingerprint: createHash("sha256")
                .update(orderId)
                .digest("hex"),
              occurredAt: saleAt,
              confirmedAt: saleAt,
              status: cancelled ? "CANCELLED" : "CONFIRMED",
              items: {
                create: {
                  sku: product.sku,
                  qty: 1,
                  unitPrice: product.priceGel,
                  lineDiscount: "0",
                  lineVat: "0",
                  commissionableNet: product.priceGel,
                  attribution: {
                    create: {
                      clickId,
                      creatorId,
                      productId: product.id,
                      commissionAmount: existingLink
                        ? existingLink.commissionType === "FIXED"
                          ? existingLink.commissionValue.toString()
                          : new Decimal(product.priceGel.toString())
                              .times(existingLink.commissionValue.toString())
                              .toFixed(2)
                        : "10",
                      status: "CANONICAL",
                      createdAt: saleAt,
                    },
                  },
                },
              },
            },
            update: { occurredAt: saleAt, confirmedAt: saleAt },
          });
          if (cancelled) {
            const auditId = id(10000 + ci * 1000 + pi * 100 + d);
            await prisma.auditEvent.upsert({
              where: { id: auditId },
              create: {
                id: auditId,
                action: "conversion.cancelled",
                entityType: "conversion",
                entityId: conversion.id,
                changes: { from: "CONFIRMED", to: "CANCELLED" },
                at: new Date(saleAt.getTime() + 6 * 3600000),
              },
              update: { at: new Date(saleAt.getTime() + 6 * 3600000) },
            });
          }
        }
      }
    }
  }
  console.log(
    JSON.stringify({
      event: "redesign_fixtures_seeded",
      accounts: [
        "brand@aromashop.ge",
        "nino@creators.ge",
        "mari.redesign@creators.ge",
      ],
      clicks: await prisma.click.count({
        where: { id: { startsWith: "ck_redesign_" } },
      }),
      sales: await prisma.conversion.count({
        where: { orderId: { startsWith: "XR-" } },
      }),
    }),
  );
} finally {
  await prisma.$disconnect();
}
