"use server";
import { revalidatePath } from "next/cache";
import { currentViewer, requireCreator } from "@/src/modules/identity";
import { applyCreatorToBrand } from "@/src/infrastructure/phase-3-services";
export async function applyFromProfile(
  locale: string,
  slug: string,
  brandId: string,
) {
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) throw new Error(allowed.error);
  const result = await applyCreatorToBrand(allowed.value.creatorId, brandId);
  if (!result.ok && result.error !== "already_exists")
    throw new Error(result.error);
  revalidatePath(`/${locale}/brands/${slug}`);
  revalidatePath(`/${locale}/creator/brands`);
}
