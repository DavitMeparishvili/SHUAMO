"use server";

import { revalidatePath } from "next/cache";
import { applyCreatorToBrand } from "@/src/infrastructure/phase-3-services";
import { currentViewer, requireCreator } from "@/src/modules/identity";

export async function applyAction(locale: string, brandId: string) {
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) return { ok: false };
  const result = await applyCreatorToBrand(allowed.value.creatorId, brandId);
  if (!result.ok && result.error !== "already_exists") return { ok: false };
  revalidatePath(`/${locale}/creator/brands`);
  revalidatePath(`/${locale}/brands`, "layout");
  return { ok: true };
}
