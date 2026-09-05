"use server";

import { revalidatePath } from "next/cache";
import { decideOrderForBrand } from "@/src/infrastructure/phase-6-services";
import type { OrderAction } from "@/src/modules/conversions";
import { currentViewer, requireBrand } from "@/src/modules/identity";

export async function decideOrderAction(
  locale: string,
  conversionId: string,
  action: OrderAction,
) {
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) throw new Error("unauthenticated");
  const result = await decideOrderForBrand(
    allowed.value.brandId,
    allowed.value.userId,
    conversionId,
    action,
  );
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/${locale}/brand/orders`);
  revalidatePath(`/${locale}/brand/orders/source`);
  revalidatePath(`/${locale}/brand/performance`);
  revalidatePath(`/${locale}/brand`);
  revalidatePath(`/${locale}/creator/earnings`);
}
