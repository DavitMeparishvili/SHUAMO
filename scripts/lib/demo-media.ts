import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient, Prisma } from "@/src/generated/prisma/client";

const brandId = "22000000-0000-4000-8000-000000000001";
const ninoId = "22000000-0000-4000-8000-000000000002";
const productImages = [
  ["32000000-0000-4000-8000-000000000001", "product-one.jpg"],
  ["32000000-0000-4000-8000-000000000002", "product-two.jpg"],
  ["32000000-0000-4000-8000-000000000003", "product-candle.jpg"],
  ["32000000-0000-4000-8000-000000000004", "product-discovery.jpg"],
  ["34000000-0000-4000-8000-000000000001", "product-redirect-one.jpg"],
  ["34000000-0000-4000-8000-000000000002", "product-redirect-two.jpg"],
  ["34000000-0000-4000-8000-000000000003", "product-redirect-three.jpg"],
] as const;
const workImages = ["nino-night.jpg", "nino-atelier.jpg", "nino-market.jpg"];

/** Refresh demonstration media without changing profile content or account state. */
export async function seedDemoMedia(prisma: PrismaClient) {
  const [brand, creator, products] = await Promise.all([
    prisma.brandProfile.findUniqueOrThrow({ where: { brandId } }),
    prisma.creatorProfile.findUniqueOrThrow({ where: { creatorId: ninoId } }),
    prisma.product.findMany({
      where: { brandId, id: { in: productImages.map(([id]) => id) } },
      select: { id: true },
    }),
  ]);
  const bucket = process.env.STORAGE_BUCKET!;
  const publicEndpoint = process.env.STORAGE_PUBLIC_ENDPOINT!.replace(
    /\/$/,
    "",
  );
  const client = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT!,
    region: process.env.STORAGE_REGION!,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
  });
  const prefixes: [string, string][] = [
    ["aromashop-logo.jpg", `profiles/brands/${brandId}/brand-logo`],
    ["aromashop-hero.jpg", `profiles/brands/${brandId}/brand-hero`],
    ["nino-hero.jpg", `profiles/creators/${ninoId}/creator-hero`],
    ...workImages.map((file): [string, string] => [
      file,
      `profiles/creators/${ninoId}/creator-work`,
    ]),
    ...productImages
      .filter(([id]) => products.some((product) => product.id === id))
      .map(([id, file]): [string, string] => [
        file,
        `products/${brandId}/${id}`,
      ]),
  ];
  const urls = new Map<string, string>();
  try {
    for (const [file, prefix] of prefixes) {
      const body = await readFile(
        path.join(process.cwd(), "scripts/fixtures/profile-media", file),
      );
      // Content-based UUID-shaped keys satisfy media ownership validation and
      // avoid stale cached placeholders when the photographs change.
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
      urls.set(file, `${publicEndpoint}/${bucket}/${key}`);
    }
  } finally {
    client.destroy();
  }
  const image = (file: string) => {
    const url = urls.get(file);
    if (!url) throw new Error(`Missing demo image: ${file}`);
    return url;
  };
  const work = Array.isArray(creator.featuredWork) ? creator.featuredWork : [];
  await prisma.$transaction([
    prisma.brandProfile.update({
      where: { id: brand.id },
      data: {
        logoUrl: image("aromashop-logo.jpg"),
        heroImageUrl: image("aromashop-hero.jpg"),
      },
    }),
    prisma.creatorProfile.update({
      where: { id: creator.id },
      data: {
        heroImageUrl: image("nino-hero.jpg"),
        featuredWork: work.map((item, index) =>
          item &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          workImages[index]
            ? { ...item, imageUrl: image(workImages[index]) }
            : item,
        ) as Prisma.InputJsonValue,
      },
    }),
    ...productImages
      .filter(([id]) => products.some((product) => product.id === id))
      .map(([id, file]) =>
        prisma.product.update({
          where: { id },
          data: { imageUrls: [image(file)] },
        }),
      ),
  ]);
  console.log(
    JSON.stringify({
      event: "demo_media_seeded",
      profiles: 2,
      products: products.length,
      images: urls.size,
    }),
  );
}
