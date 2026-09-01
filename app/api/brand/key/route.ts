import {
  createBrandKeyPostHandler,
  currentViewer,
  generateBrandKey,
  prismaBrandRepository,
  webCryptoRandom,
} from "@/src/modules/identity";

export const POST = createBrandKeyPostHandler({
  currentViewer,
  generate: generateBrandKey({
    random: webCryptoRandom,
    brands: prismaBrandRepository,
  }),
});
