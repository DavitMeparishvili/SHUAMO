import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { serverEnv } from "@/src/config/env";
import { parseProductImageUrls } from "@/src/modules/catalog";

/** Verify completed uploads before making them part of the saved product. */
export async function verifyProductImages(
  brandId: string,
  productId: string,
  values: readonly string[],
) {
  const env = serverEnv();
  if (
    !parseProductImageUrls({
      brandId,
      productId,
      values,
      publicEndpoint: env.STORAGE_PUBLIC_ENDPOINT,
      bucket: env.STORAGE_BUCKET,
    }).ok
  )
    return false;
  if (!values.length) return true;
  const client = new S3Client({
    endpoint: env.STORAGE_ENDPOINT,
    region: env.STORAGE_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    },
  });
  try {
    const results = await Promise.all(
      values.map(async (value) => {
        const key = `products/${brandId}/${productId}/${new URL(value).pathname.split("/").at(-1)}`;
        const object = await client.send(
          new HeadObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }),
        );
        return (
          object.ContentLength !== undefined &&
          object.ContentLength > 0 &&
          object.ContentLength <= 5 * 1024 * 1024 &&
          ["image/jpeg", "image/png", "image/webp"].includes(
            object.ContentType ?? "",
          )
        );
      }),
    );
    return results.every(Boolean);
  } catch {
    return false;
  } finally {
    client.destroy();
  }
}
