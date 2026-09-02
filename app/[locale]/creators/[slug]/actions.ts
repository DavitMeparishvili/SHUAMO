"use server";
import { revalidatePath } from "next/cache";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { inviteCreatorForBrand } from "@/src/infrastructure/phase-3-services";
export async function inviteFromProfile(
  locale: string,
  slug: string,
  creatorId: string,
) {
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) throw new Error(allowed.error);
  const result = await inviteCreatorForBrand(allowed.value.brandId, creatorId);
  if (!result.ok && result.error !== "already_exists")
    throw new Error(result.error);
  revalidatePath(`/${locale}/creators/${slug}`);
  revalidatePath(`/${locale}/brand/creators`);
}
