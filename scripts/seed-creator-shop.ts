import "dotenv/config";
import { hashPassword } from "better-auth/crypto";

// Idempotent local-only fixture for the creator shop e2e spec: one approved
// brand and creator with a published profile, 15 shoppable products with
// links, and one product whose offer ended yesterday. The shop itself is
// emptied on every run so the spec always starts from a clean shop; pass
// --with-shop to start from a filled one instead.
//
// --full (implies --with-shop) turns the same accounts into a fully populated
// demo for design review: a real portrait, bilingual bio, five social links,
// six featured-work items and 15 live products with realistic names, prices
// and a distinct photo each (the 90-character Georgian name and the ended
// offer stay). Photos are checked in under scripts/fixtures/creator-shop (see
// sources.json) and uploaded to the configured S3-compatible storage, so the
// seed never reaches the internet. Running without --full restores the plain
// fixture the e2e spec expects.
//   pnpm seed:creator-shop -- --full
const host = new URL(process.env.DATABASE_URL || "postgresql://invalid")
  .hostname;
if (
  process.env.NODE_ENV === "production" ||
  !["localhost", "127.0.0.1", "[::1]", "postgres-dev"].includes(host)
)
  throw new Error("Creator shop seed requires a local development database.");
Object.assign(process.env, { NODE_ENV: "development" });
const { prisma } = await import("@/src/infrastructure/db/client");
const { Prisma } = await import("@/src/generated/prisma/client");
const FULL = process.argv.includes("--full");
const WITH_SHOP = FULL || process.argv.includes("--with-shop");

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
// --full: 15 live products, each with its own photo, in catalog order.
const FULL_PRODUCTS = [
  ["Everyday commuter backpack", "89", "product-01-backpack.jpg"],
  ["Wireless over-ear headphones", "249", "product-02-headphones.jpg"],
  ["Hydrating body lotion", "38", "product-03-serum.jpg"],
  ["Lightweight running sneakers", "189", "product-04-sneaker.jpg"],
  ["ყავის მარცვლები, ეთიოპია 250 გ", "32", "product-05-coffee-beans.jpg"],
  ["Smart watch, midnight strap", "399", "product-06-smartwatch.jpg"],
  ["Aloe in a mint ceramic pot", "24", "product-07-plant.jpg"],
  [null, "45", "product-08-candle.jpg"],
  ["Classic black sunglasses", "129", "product-09-sunglasses.jpg"],
  ["Glow facial oil", "54", "product-10-face-oil.jpg"],
  ["Insulated steel bottle", "42", "product-11-bottle.jpg"],
  ["Instant camera", "279", "product-12-camera.jpg"],
  ["ტილოს ჩანთა", "29", "product-13-tote.jpg"],
  ["Matte desk lamp", "119", "product-14-lamp.jpg"],
  ["Stoneware coffee mug", "19", "product-15-mug.jpg"],
] as const;
const FULL_ENDED = ["Summer mesh cap", "35", "product-16-cap.jpg"] as const;
const FULL_WORK = [
  [
    "work-01-street-style.jpg",
    "Bright street style for spring",
    "ფერადი ქუჩის სტილი გაზაფხულისთვის",
    "https://www.instagram.com/p/C1shopdemo1/",
  ],
  [
    "work-02-capsule-wardrobe.jpg",
    "A ten-piece capsule wardrobe",
    "ათნივთიანი კაფსულური გარდერობი",
    "https://www.youtube.com/watch?v=shopdemo002",
  ],
  [
    "work-03-living-room.jpg",
    "Small living room makeover",
    "პატარა მისაღების განახლება",
    "https://www.tiktok.com/@nini.finds/video/7300000000000000003",
  ],
  [
    "work-04-supper.jpg",
    "Sunday supper with friends",
    "კვირის ვახშამი მეგობრებთან",
    "https://www.instagram.com/p/C1shopdemo4/",
  ],
  [
    "work-05-concept-store.jpg",
    "Inside a Tbilisi concept store",
    "თბილისის კონცეპტ-მაღაზიაში",
    "https://www.youtube.com/watch?v=shopdemo005",
  ],
  [
    "work-06-travel-kit.jpg",
    "What I pack for a road trip",
    "რას ვიღებ საგზაოდ",
    "https://www.tiktok.com/@nini.finds/video/7300000000000000006",
  ],
] as const;

/**
 * Upload the checked-in --full photos and return their public URLs by file.
 * When the configured storage is unreachable or rejects the credentials (for
 * example another project's MinIO holds port 9000), the photos are copied to
 * the git-ignored public/images/demo/creator-shop instead, so the public page
 * still renders; the profile editor will then refuse to re-save those URLs.
 */
async function fullMedia() {
  try {
    return await uploadFullMedia();
  } catch (error) {
    const { cp } = await import("node:fs/promises");
    await cp(
      "scripts/fixtures/creator-shop",
      "public/images/demo/creator-shop",
      { recursive: true },
    );
    process.stderr.write(
      `Storage upload failed (${error instanceof Error ? error.name : "error"}); serving --full photos from public/images/demo/creator-shop.
`,
    );
    return (file: string) => `/images/demo/creator-shop/${file}`;
  }
}

async function uploadFullMedia() {
  const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
  const { createHash } = await import("node:crypto");
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const bucket = process.env.STORAGE_BUCKET!;
  const endpoint = process.env.STORAGE_PUBLIC_ENDPOINT!.replace(/\/$/, "");
  const client = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT!,
    region: process.env.STORAGE_REGION!,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
  });
  const uploads: [string, string][] = [
    ["portrait.jpg", `profiles/creators/${id(CREATOR)}/creator-hero`],
    ...FULL_WORK.map(([file]): [string, string] => [
      file,
      `profiles/creators/${id(CREATOR)}/creator-work`,
    ]),
    ...[...FULL_PRODUCTS, FULL_ENDED].map(
      ([, , file], index): [string, string] => [
        file,
        `products/${id(BRAND)}/${id(1001 + index)}`,
      ],
    ),
  ];
  const urls = new Map<string, string>();
  try {
    for (const [file, prefix] of uploads) {
      const body = await readFile(
        path.join(process.cwd(), "scripts/fixtures/creator-shop", file),
      );
      // Content-hash, UUID-shaped keys pass profile media validation and
      // never serve a stale cached photo after a fixture changes.
      const hash = createHash("sha256").update(body).digest("hex");
      const objectId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      const key = `${prefix}/${objectId}.jpg`;
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: "image/jpeg",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      urls.set(file, `${endpoint}/${bucket}/${key}`);
    }
  } finally {
    client.destroy();
  }
  return (file: string) => {
    const url = urls.get(file);
    if (!url) throw new Error(`Missing creator shop image: ${file}`);
    return url;
  };
}
// Crockford base32, eight characters, as `/r/{code}` requires.
const code = (n: number) => `SHPDM${String(n).padStart(3, "0")}`;
const ENDED_CODE = "SHPDMEND";

const brandName = FULL ? "Kvali Market" : "Shop Demo Brand";
const creatorName = FULL ? "Nini Beridze" : "Shop Demo Creator";
const image = FULL ? await fullMedia() : () => "/images/creator.webp";
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
      name: brandName,
      keyPrefix: "shop_demo_1",
      keyHash: "development-only-not-an-api-key",
      status: "APPROVED",
    },
    update: { name: brandName, status: "APPROVED" },
  });
  await prisma.creator.upsert({
    where: { id: id(CREATOR) },
    create: {
      id: id(CREATOR),
      userId: id(2),
      displayName: creatorName,
      payoutName: "Shop Demo Creator",
      status: "APPROVED",
    },
    update: { displayName: creatorName, status: "APPROVED" },
  });
  const base = {
    slug: SLUG,
    status: "PUBLISHED" as const,
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    // Published columns are the source of truth; no unpublished draft.
    draftData: Prisma.DbNull,
    locationEn: "Tbilisi",
    locationKa: "თბილისი",
  };
  const profile = FULL
    ? {
        ...base,
        taglineEn: "Honest picks for home, style and slow weekends",
        taglineKa:
          "გულწრფელი რჩევები სახლისთვის, სტილისა და ნელი შაბათ-კვირისთვის",
        descriptionEn:
          "I'm Nini, a Tbilisi-based creator sharing the things I actually live with: skincare that survives a Georgian summer, tech that earns its desk space and small upgrades that make a rented flat feel like home. Every product here is something I bought or tested for at least a month.",
        descriptionKa:
          "მე ვარ ნინი, თბილისელი კრეატორი. ვაზიარებ ნივთებს, რომლებითაც რეალურად ვცხოვრობ: კანის მოვლის საშუალებებს, რომლებიც ქართულ ზაფხულს უძლებს, ტექნიკას, რომელიც მაგიდაზე ადგილს იმსახურებს, და პატარა ცვლილებებს, რომლებიც ნაქირავებ ბინას სახლად აქცევს. აქ ყველა პროდუქტი ერთი თვე მაინც მაქვს გამოცდილი.",
        heroImageUrl: image("portrait.jpg"),
        categories: ["Lifestyle", "Beauty", "Fashion", "Home", "Tech"],
        languages: ["Georgian", "English", "Russian"],
        contentFormats: ["Reels", "Stories", "YouTube reviews", "Photography"],
        socialLinks: [
          {
            platform: "instagram",
            url: "https://www.instagram.com/nini.finds/",
          },
          { platform: "tiktok", url: "https://www.tiktok.com/@nini.finds" },
          { platform: "youtube", url: "https://www.youtube.com/@ninifinds" },
          { platform: "facebook", url: "https://www.facebook.com/ninifinds" },
          { platform: "website", url: "https://ninifinds.ge/" },
        ],
        featuredWork: FULL_WORK.map(([file, en, ka, url]) => ({
          title: { en, ka },
          url,
          imageUrl: image(file),
        })),
      }
    : {
        ...base,
        taglineEn: "Everyday finds from Tbilisi",
        taglineKa: "ყოველდღიური აღმოჩენები თბილისიდან",
        descriptionEn:
          "I share the products I actually use at home and on the go.",
        descriptionKa:
          "ვაზიარებ პროდუქტებს, რომლებსაც სახლში და გზაში ვიყენებ.",
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
          : FULL
            ? FULL_PRODUCTS[index]![0]!
            : `Shop demo item ${String(index + 1).padStart(2, "0")}`,
      priceGel: FULL ? FULL_PRODUCTS[index]![1] : "50",
      imageUrl: image(FULL_PRODUCTS[index]![2]),
      code: code(index + 1),
      offerEndsAt: null as Date | null,
    })),
    {
      n: 16,
      title: FULL ? FULL_ENDED[0] : "Shop demo ended offer",
      priceGel: FULL ? FULL_ENDED[1] : "50",
      imageUrl: image(FULL_ENDED[2]),
      code: ENDED_CODE,
      offerEndsAt: yesterday,
    },
  ];
  for (const product of products) {
    const data = {
      brandId: id(BRAND),
      title: product.title,
      priceGel: product.priceGel,
      imageUrls: [product.imageUrl],
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
  if (WITH_SHOP)
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
