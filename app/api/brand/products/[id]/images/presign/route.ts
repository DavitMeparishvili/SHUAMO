import { serverEnv } from "@/src/config/env";
import {
  createPresignHandler,
  createS3ImageStorage,
  prismaProductRepository,
} from "@/src/modules/catalog";
import { currentViewer, requireBrand } from "@/src/modules/identity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await currentViewer();
  const allowed = requireBrand(viewer);
  if (!allowed.ok) {
    return Response.json({ error: allowed.error }, { status: 401 });
  }
  const [{ id }, env] = await Promise.all([
    params,
    Promise.resolve(serverEnv()),
  ]);
  return createPresignHandler({
    products: prismaProductRepository,
    storage: createS3ImageStorage({
      // Browsers upload directly, so sign the public host rather than the Docker host.
      endpoint: env.STORAGE_PUBLIC_ENDPOINT,
      region: env.STORAGE_REGION,
      bucket: env.STORAGE_BUCKET,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    }),
    random: { uuid: () => crypto.randomUUID() },
    config: {
      publicEndpoint: env.STORAGE_PUBLIC_ENDPOINT,
      bucket: env.STORAGE_BUCKET,
    },
  })(request, { brandId: allowed.value.brandId, productId: id });
}
