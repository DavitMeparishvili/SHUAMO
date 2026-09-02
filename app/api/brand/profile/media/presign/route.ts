import { serverEnv } from "@/src/config/env";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import {
  createProfileMediaHandler,
  createS3ProfileMediaStorage,
} from "@/src/modules/profiles";
export async function POST(request: Request) {
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok)
    return Response.json(
      { error: allowed.error },
      { status: allowed.error === "unauthenticated" ? 401 : 403 },
    );
  const env = serverEnv();
  return createProfileMediaHandler({
    storage: createS3ProfileMediaStorage({
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      bucket: env.STORAGE_BUCKET,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    }),
    uuid: () => crypto.randomUUID(),
    publicEndpoint: env.STORAGE_PUBLIC_ENDPOINT,
    bucket: env.STORAGE_BUCKET,
  })(request, { role: "brands", ownerId: allowed.value.brandId });
}
