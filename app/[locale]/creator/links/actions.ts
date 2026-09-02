"use server";

import { revalidatePath } from "next/cache";
import { createProductLinkForCreator } from "@/src/infrastructure/phase-3-services";
import { currentViewer, requireCreator } from "@/src/modules/identity";
import { parseProductLinkAcceptance } from "@/src/modules/partnerships";

export async function createProductLinkAction(
  locale: string,
  formData: FormData,
) {
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) throw new Error("unauthenticated");
  const acceptance = parseProductLinkAcceptance({
    productId: formData.get("productId"),
    commissionType: formData.get("commissionType"),
    commissionValue: formData.get("commissionValue"),
    termsVersion: formData.get("termsVersion"),
  });
  if (acceptance === undefined) throw new Error("invalid_product_offer");
  const result = await createProductLinkForCreator(
    allowed.value.creatorId,
    acceptance,
  );
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/${locale}/creator/links`);
  revalidatePath(`/${locale}/creator/products`);
  revalidatePath(`/${locale}/creator/products/${acceptance.productId}`);
  revalidatePath(`/${locale}/products`);
  revalidatePath(`/${locale}/products/${acceptance.productId}`);
  revalidatePath(`/${locale}/brand/links`);
}
