import "dotenv/config";

Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? "development" });
const { prisma } = await import("@/src/infrastructure/db/client");
const { generateBrandKey, prismaBrandRepository, webCryptoRandom } =
  await import("@/src/modules/identity");

const email = process.argv[2];
if (email === undefined) throw new Error("Usage: pnpm brand:key <brand-email>");
const brand = await prisma.brand.findFirst({
  where: { user: { email } },
  select: { id: true },
});
if (brand === null) throw new Error(`No brand found for ${email}`);
const result = await generateBrandKey({
  random: webCryptoRandom,
  brands: prismaBrandRepository,
})(brand.id);
if (!result.ok) throw new Error("Brand disappeared while generating its key");
console.log(
  JSON.stringify({
    event: "brand_key_generated",
    email,
    prefix: result.value.prefix,
    plaintext: result.value.plaintext,
  }),
);
await prisma.$disconnect();
