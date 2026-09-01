"use server";

import { revalidatePath } from "next/cache";
import { createProductLinkForCreator } from "@/src/infrastructure/phase-3-services";
import { currentViewer, requireCreator } from "@/src/modules/identity";

export async function createProductLinkAction(
  locale: string,
  formData: FormData,
) {
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) throw new Error("unauthenticated");
  const productId = formData.get("productId");
  if (typeof productId !== "string" || productId.length === 0) {
    throw new Error("invalid_product");
  }
  const result = await createProductLinkForCreator(
    allowed.value.creatorId,
    productId,
  );
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/${locale}/creator/links`);
  revalidatePath(`/${locale}/brand/links`);
}
