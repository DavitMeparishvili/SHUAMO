import "dotenv/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

if (
  process.env.NODE_ENV === "production" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(process.env.DATABASE_URL!).hostname,
  )
) {
  throw new Error(
    "Brand demonstrations may only be seeded into a local development database.",
  );
}
Object.assign(process.env, { NODE_ENV: "development" });
const { prisma } = await import("@/src/infrastructure/db/client");
const { mintApiKey } = await import("@/src/modules/identity");
const creatorId = "22000000-0000-4000-8000-000000000002";
const resetApplications = process.argv.includes("--reset-applications");
const fixtures = [
  {
    suffix: "001",
    slug: "botanica",
    name: "Botanica",
    tagline: "Modern skincare for natural beauty",
    taglineKa: "თანამედროვე მოვლა ბუნებრივი სილამაზისთვის",
    city: "Batumi",
    cityKa: "ბათუმი",
    category: "Beauty",
    status: null,
    product: "Daily botanical cream",
    type: "BEAUTY_SKINCARE",
    price: "48.00",
    interest: "Short video",
    interestKa: "მოკლე ვიდეო",
  },
  {
    suffix: "002",
    slug: "clay-room",
    name: "Clay Room",
    tagline: "Handmade ceramics for modern homes",
    taglineKa: "ხელნაკეთი კერამიკა თანამედროვე სახლისთვის",
    city: "Tbilisi",
    cityKa: "თბილისი",
    category: "Home & living",
    status: "APPROVED",
    product: "Everyday ceramic bowl",
    type: "HOME_DECOR",
    price: "65.00",
    interest: "Product storytelling",
    interestKa: "პროდუქტის ამბავი",
  },
  {
    suffix: "003",
    slug: "linen-house",
    name: "Linen House",
    tagline: "Natural textiles for a calmer home",
    taglineKa: "ბუნებრივი ტექსტილი მყუდრო სახლისთვის",
    city: "Kutaisi",
    cityKa: "ქუთაისი",
    category: "Home & living",
    status: "REJECTED",
    product: "Linen cushion cover",
    type: "HOME_DECOR",
    price: "72.00",
    interest: "Long-term partnerships",
    interestKa: "გრძელვადიანი პარტნიორობა",
  },
  {
    suffix: "004",
    slug: "mta-outdoor",
    name: "Mta Outdoor",
    tagline: "Gear for a more open world",
    taglineKa: "აღჭურვილობა ახალი თავგადასავლებისთვის",
    city: "Tbilisi",
    cityKa: "თბილისი",
    category: "Outdoors",
    status: "PENDING",
    product: "Everyday adventure backpack",
    type: "SPORTS_OUTDOORS",
    price: "145.00",
    interest: "Short video",
    interestKa: "მოკლე ვიდეო",
  },
  {
    suffix: "005",
    slug: "studio-forma",
    name: "Studio Forma",
    tagline: "Contemporary fashion for everyday life",
    taglineKa: "თანამედროვე მოდა ყოველდღიური ცხოვრებისთვის",
    city: "Tbilisi",
    cityKa: "თბილისი",
    category: "Fashion",
    status: null,
    product: "Everyday cotton tee",
    type: "FASHION_CLOTHING",
    price: "55.00",
    interest: "Product storytelling",
    interestKa: "პროდუქტის ამბავი",
  },
] as const;
const storage = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT!,
  region: process.env.STORAGE_REGION!,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  },
});
const bucket = process.env.STORAGE_BUCKET!;
const endpoint = process.env.STORAGE_PUBLIC_ENDPOINT!.replace(/\/$/, "");
try {
  const creator = await prisma.creator.findUniqueOrThrow({
    where: { id: creatorId },
    select: { user: { select: { email: true } } },
  });
  if (creator.user.email !== "nino@creators.ge")
    throw new Error("Expected the existing Nino demonstration account.");
  for (const fixture of fixtures) {
    const userId = `07000000-0000-4000-8000-000000000${fixture.suffix}`;
    const brandId = `27000000-0000-4000-8000-000000000${fixture.suffix}`;
    const productId = `37000000-0000-4000-8000-000000000${fixture.suffix}`;
    const email = `${fixture.slug}@brands.example.test`;
    const body = await readFile(
      path.join(
        process.cwd(),
        "scripts/fixtures/brands",
        `${fixture.slug}.jpg`,
      ),
    );
    const hash = createHash("sha256").update(body).digest("hex");
    const objectId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    async function upload(prefix: string) {
      const key = `${prefix}/${objectId}.jpg`;
      await storage.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: "image/jpeg",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      return `${endpoint}/${bucket}/${key}`;
    }
    const heroImageUrl = await upload(`profiles/brands/${brandId}/brand-hero`);
    const logoUrl = await upload(`profiles/brands/${brandId}/brand-logo`);
    const productImageUrl = await upload(`products/${brandId}/${productId}`);
    const apiKey = mintApiKey({ bytes: randomBytes });
    await prisma.$transaction(async (db) => {
      await db.user.upsert({
        where: { id: userId },
        create: { id: userId, email, name: fixture.name, emailVerified: true },
        update: {},
      });
      await db.appUser.upsert({
        where: { id: userId },
        create: { id: userId, email, locale: "en" },
        update: {},
      });
      await db.brand.upsert({
        where: { id: brandId },
        create: {
          id: brandId,
          userId,
          name: fixture.name,
          status: "APPROVED",
          keyPrefix: apiKey.prefix,
          keyHash: apiKey.hash,
        },
        update: {},
      });
      await db.brandProfile.upsert({
        where: { brandId },
        create: {
          brandId,
          slug: fixture.slug,
          status: "PUBLISHED",
          publishedAt: new Date("2026-09-01T09:00:00Z"),
          taglineEn: fixture.tagline,
          taglineKa: fixture.taglineKa,
          descriptionEn: `${fixture.tagline}. This is an illustrative Xurjin demonstration brand with stock imagery.`,
          descriptionKa: `${fixture.taglineKa}. ეს არის Xurjin-ის სადემონსტრაციო ბრენდი საილუსტრაციო ფოტოებით.`,
          locationEn: `${fixture.city}, Georgia`,
          locationKa: `${fixture.cityKa}, საქართველო`,
          heroImageUrl,
          logoUrl,
          categories: [fixture.category],
          collaborationInterests: [
            { en: fixture.interest, ka: fixture.interestKa },
          ],
          whatWeMake: [
            { label: { en: fixture.product, ka: fixture.taglineKa } },
          ],
        },
        update: { heroImageUrl, logoUrl },
      });
      await db.product.upsert({
        where: { id: productId },
        create: {
          id: productId,
          brandId,
          sku: `DEMO-${fixture.slug.toUpperCase()}`,
          title: fixture.product,
          description:
            "Illustrative demonstration product with stock photography.",
          productType: fixture.type,
          priceGel: fixture.price,
          imageUrls: [productImageUrl],
          backlinkUrl: `https://example.com/demo/${fixture.slug}`,
          commissionType: "PERCENT",
          commissionValue: "0.1000",
          status: "ACTIVE",
        },
        update: { imageUrls: [productImageUrl] },
      });
      if (fixture.status) {
        await db.partnership.upsert({
          where: { brandId_creatorId: { brandId, creatorId } },
          create: {
            brandId,
            creatorId,
            status: fixture.status,
            createdAt: new Date("2026-09-02T10:00:00Z"),
          },
          update: resetApplications ? { status: fixture.status } : {},
        });
      } else if (resetApplications) {
        // Only these two named demonstration brands and the verified demo creator.
        await db.partnership.deleteMany({ where: { brandId, creatorId } });
      }
    });
  }
  console.log(
    JSON.stringify({
      event: "demo_brands_seeded",
      brands: fixtures.length,
      creator: "nino@creators.ge",
      resetApplications,
    }),
  );
} finally {
  storage.destroy();
  await prisma.$disconnect();
}
