"use server";

import { revalidatePath } from "next/cache";
import { applyCreatorToBrand } from "@/src/infrastructure/phase-3-services";
import { currentViewer, requireCreator } from "@/src/modules/identity";

export async function applyAction(locale: string, brandId: string) {
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) throw new Error("unauthenticated");
  const result = await applyCreatorToBrand(allowed.value.creatorId, brandId);
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/${locale}/creator/brands`);
}
