import { serverEnv } from "@/src/config/env";
import { verifyProductReservation } from "@/src/infrastructure/product-upload-reservation";
import {
  createImageUploadUrl,
  createS3ImageStorage,
} from "@/src/modules/catalog";
import { currentViewer, requireBrand } from "@/src/modules/identity";
export async function POST(request: Request) {
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok)
    return Response.json({ error: allowed.error }, { status: 401 });
  let body: { reservation?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const id =
    typeof body?.reservation === "string"
      ? verifyProductReservation(body.reservation, allowed.value.brandId)
      : undefined;
  if (!id || typeof body.contentType !== "string")
    return Response.json({ error: "invalid_body" }, { status: 400 });
  const env = serverEnv();
  const result = await createImageUploadUrl({
    products: { findOwned: async () => ({ id }) },
    storage: createS3ImageStorage({
      endpoint: env.STORAGE_ENDPOINT,
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
  })(allowed.value.brandId, id, { contentType: body.contentType });
  return result.ok
    ? Response.json(result.value)
    : Response.json({ error: result.error }, { status: 422 });
}
