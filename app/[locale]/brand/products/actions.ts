"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveProductForBrand,
  createProductForBrand,
  updateProductForBrand,
} from "@/src/infrastructure/phase-3-services";
import { currentViewer, requireBrand } from "@/src/modules/identity";

function value(formData: FormData, key: string): string {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function input(formData: FormData) {
  return {
    sku: value(formData, "sku"),
    title: value(formData, "title"),
    description: value(formData, "description"),
    priceGel: value(formData, "priceGel"),
    imageUrls: formData
      .getAll("imageUrls")
      .filter((item): item is string => typeof item === "string"),
    backlinkUrl: value(formData, "backlinkUrl"),
    commissionType:
      value(formData, "commissionType") === "FIXED"
        ? ("FIXED" as const)
        : ("PERCENT" as const),
    commissionValue: value(formData, "commissionValue"),
  };
}

async function brandId() {
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) throw new Error("unauthenticated");
  return allowed.value.brandId;
}

export async function createProductAction(locale: string, formData: FormData) {
  const result = await createProductForBrand(await brandId(), input(formData));
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/${locale}/brand/products`);
  redirect(
    `/${locale}/brand/products/${result.value.id}?created=${result.value.mintedLinks}`,
  );
}

export async function updateProductAction(
  locale: string,
  productId: string,
  formData: FormData,
) {
  const result = await updateProductForBrand(
    await brandId(),
    productId,
    input(formData),
  );
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/${locale}/brand/products`);
  redirect(`/${locale}/brand/products/${productId}?saved=1`);
}

export async function archiveProductAction(locale: string, productId: string) {
  const result = await archiveProductForBrand(await brandId(), productId);
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/${locale}/brand/products`);
  redirect(`/${locale}/brand/products?archived=1`);
}
