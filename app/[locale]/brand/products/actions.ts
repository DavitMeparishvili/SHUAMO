"use server";

import { revalidatePath } from "next/cache";
import { productFormInput } from "@/src/modules/catalog";
import { verifyProductReservation } from "@/src/infrastructure/product-upload-reservation";
import {
  archiveProductForBrand,
  createProductForBrand,
  updateProductForBrand,
} from "@/src/infrastructure/phase-3-services";
import { currentViewer, requireBrand } from "@/src/modules/identity";

async function brandId() {
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) throw new Error("unauthenticated");
  return allowed.value.brandId;
}

export async function createProductAction(locale: string, formData: FormData) {
  const owner = await brandId();
  const token = String(formData.get("uploadReservation") ?? "");
  const reservedId = token ? verifyProductReservation(token, owner) : undefined;
  if (token && !reservedId) return { error: "invalid_images" };
  const result = await createProductForBrand(
    owner,
    productFormInput(formData),
    reservedId,
  );
  if (!result.ok) return { error: result.error };
  revalidatePath(`/${locale}/brand/products`);
  return { redirect: `/${locale}/brand/products/${result.value.id}?created=1` };
}

export async function updateProductAction(
  locale: string,
  productId: string,
  formData: FormData,
) {
  const result = await updateProductForBrand(
    await brandId(),
    productId,
    productFormInput(formData),
  );
  if (!result.ok) return { error: result.error };
  revalidatePath(`/${locale}/brand/products`);
  return { saved: true };
}

export async function archiveProductAction(locale: string, productId: string) {
  const result = await archiveProductForBrand(await brandId(), productId);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/${locale}/brand/products`);
  return { redirect: `/${locale}/brand/products?archived=1` };
}
