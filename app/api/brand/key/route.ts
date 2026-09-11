import {
  createBrandKeyPostHandler,
  currentViewer,
  generateBrandKey,
  prismaBrandRepository,
  webCryptoRandom,
} from "@/src/modules/identity";
import { serverEnv } from "@/src/config/env";

const post = createBrandKeyPostHandler({
  currentViewer,
  generate: generateBrandKey({
    random: webCryptoRandom,
    brands: prismaBrandRepository,
  }),
});

export async function POST(request: Request) {
  if (
    request.headers.get("origin") !== new URL(serverEnv().APP_URL).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return post();
}
