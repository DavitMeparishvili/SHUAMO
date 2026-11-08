import "dotenv/config";
import { hashPassword } from "better-auth/crypto";

// Idempotent local-only fixture for the creator shop e2e spec: one approved
// brand and creator with a published profile, 15 shoppable products with
// links, and one product whose offer ended yesterday. The shop itself is
// emptied on every run so the spec always starts from a clean shop; pass
// --with-shop to start from a filled one instead.
const host = new URL(process.env.DATABASE_URL || "postgresql://invalid")
  .hostname;
if (
  process.env.NODE_ENV === "production" ||
  !["localhost", "127.0.0.1", "[::1]", "postgres-dev"].includes(host)
)
  throw new Error("Creator shop seed requires a local development database.");
Object.assign(process.env, { NODE_ENV: "development" });
const { prisma } = await import("@/src/infrastructure/db/client");

const id = (n: number) =>
  `95000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const password = await hashPassword("Shop-demo-only-2026!");
const SLUG = "shop-demo";
const BRAND = 201;
const CREATOR = 202;
const people = [
  { n: 1, name: "Shop Demo Brand", email: "shop-brand@example.test" },
  { n: 2, name: "Shop Demo Creator", email: "shop-creator@example.test" },
] as const;
// 90 characters, to prove long Georgian names clamp to two lines on phones.
const LONG_GEORGIAN =
  "ხელნაკეთი ნატურალური სანთელი ლავანდის, ვანილისა და ხის არომატით ყოველდღიური სიმშვიდისთვის.";
// Crockford base32, eight characters, as `/r/{code}` requires.
const code = (n: number) => `SHPDM${String(n).padStart(3, "0")}`;
const ENDED_CODE = "SHPDMEND";

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
    where: { id: id(BRAND) },
    create: {
      id: id(BRAND),
      userId: id(1),
      name: "Shop Demo Brand",
      keyPrefix: "shop_demo_1",
      keyHash: "development-only-not-an-api-key",
      status: "APPROVED",
    },
    update: { status: "APPROVED" },
  });
  await prisma.creator.upsert({
    where: { id: id(CREATOR) },
    create: {
      id: id(CREATOR),
      userId: id(2),
      displayName: "Shop Demo Creator",
      payoutName: "Shop Demo Creator",
      status: "APPROVED",
    },
    update: { status: "APPROVED" },
  });
  const profile = {
    slug: SLUG,
    status: "PUBLISHED" as const,
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    taglineEn: "Everyday finds from Tbilisi",
    taglineKa: "ყოველდღიური აღმოჩენები თბილისიდან",
    descriptionEn: "I share the products I actually use at home and on the go.",
    descriptionKa: "ვაზიარებ პროდუქტებს, რომლებსაც სახლში და გზაში ვიყენებ.",
    locationEn: "Tbilisi",
    locationKa: "თბილისი",
    heroImageUrl: "/images/creator.webp",
    categories: ["Lifestyle"],
    languages: ["Georgian", "English"],
    contentFormats: ["Reels"],
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/shopdemo" },
    ],
    featuredWork: [],
  };
  await prisma.creatorProfile.upsert({
    where: { creatorId: id(CREATOR) },
    create: { creatorId: id(CREATOR), ...profile },
    update: profile,
  });
  await prisma.partnership.upsert({
    where: {
      brandId_creatorId: { brandId: id(BRAND), creatorId: id(CREATOR) },
    },
    create: { brandId: id(BRAND), creatorId: id(CREATOR), status: "APPROVED" },
    update: { status: "APPROVED" },
  });

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const products = [
    ...Array.from({ length: 15 }, (_, index) => ({
      n: index + 1,
      title:
        index + 1 === 8
          ? LONG_GEORGIAN
          : `Shop demo item ${String(index + 1).padStart(2, "0")}`,
      code: code(index + 1),
      offerEndsAt: null as Date | null,
    })),
    {
      n: 16,
      title: "Shop demo ended offer",
      code: ENDED_CODE,
      offerEndsAt: yesterday,
    },
  ];
  for (const product of products) {
    const data = {
      brandId: id(BRAND),
      title: product.title,
      priceGel: "50",
      imageUrls: ["/images/creator.webp"],
      backlinkUrl: `https://example.test/shop-demo/${product.n}`,
      commissionType: "PERCENT" as const,
      commissionValue: "0.1",
      status: "ACTIVE" as const,
      offerStartsAt: null,
      offerEndsAt: product.offerEndsAt,
    };
    await prisma.product.upsert({
      where: { id: id(1000 + product.n) },
      create: {
        id: id(1000 + product.n),
        sku: `SHOP-DEMO-${String(product.n).padStart(3, "0")}`,
        ...data,
      },
      update: data,
    });
    // Older links first, so the picker's "newest first" order is stable.
    const createdAt = new Date(Date.UTC(2026, 0, 1, 0, product.n));
    await prisma.trackingLink.upsert({
      where: { id: id(2000 + product.n) },
      create: {
        id: id(2000 + product.n),
        productId: id(1000 + product.n),
        creatorId: id(CREATOR),
        code: product.code,
        commissionType: "PERCENT",
        commissionValue: "0.1",
        status: "ACTIVE",
        createdAt,
      },
      update: { status: "ACTIVE", createdAt },
    });
  }
  await prisma.creatorShopItem.deleteMany({
    where: { creatorId: id(CREATOR) },
  });
  // --with-shop pre-fills the shop with the 15 live items in catalog order,
  // for specs that start from an existing shop rather than building one.
  if (process.argv.includes("--with-shop"))
    await prisma.creatorShopItem.createMany({
      data: products
        .filter((product) => product.offerEndsAt === null)
        .map((product, position) => ({
          creatorId: id(CREATOR),
          productId: id(1000 + product.n),
          position,
        })),
    });
  process.stdout.write(
    JSON.stringify({ slug: SLUG, codes: products.map((p) => p.code) }),
  );
} finally {
  await prisma.$disconnect();
}
