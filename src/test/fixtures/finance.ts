import { prisma } from "@/src/infrastructure/db/client";
import { seedLink } from "./accounts";
export async function financeFixture() {
  const linked = await seedLink(),
    user = await prisma.user.create({
      data: {
        email: `${crypto.randomUUID()}@finance.example.test`,
        name: "Finance test admin",
      },
    });
  const admin = await prisma.appUser.update({
    where: { id: user.id },
    data: { isAdmin: true },
  });
  const conversion = await prisma.conversion.create({
    data: {
      brandId: linked.brand.id,
      orderId: `FIN-${crypto.randomUUID()}`,
      requestFingerprint: "f".repeat(64),
      occurredAt: new Date("2026-09-13T10:00:00Z"),
    },
  });
  const item = await prisma.conversionItem.create({
    data: {
      conversionId: conversion.id,
      sku: linked.product.sku,
      qty: 1,
      unitPrice: "3000",
      lineDiscount: "0",
      lineVat: "0",
      commissionableNet: "3000",
    },
  });
  const click = await prisma.click.create({
    data: {
      id: `ck_${crypto.randomUUID()}`,
      trackingLinkId: linked.link.id,
      brandId: linked.brand.id,
      occurredAt: new Date("2026-09-13T09:00:00Z"),
    },
  });
  const attribution = await prisma.attribution.create({
    data: {
      conversionItemId: item.id,
      clickId: click.id,
      creatorId: linked.creator.id,
      productId: linked.product.id,
      commissionAmount: "300",
    },
  });
  return { ...linked, admin, conversion, attribution, click, item };
}
