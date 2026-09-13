"use server";

import { revalidatePath } from "next/cache";
import { setOwnedBrandLinkStatus } from "@/src/modules/partnerships";
import { currentViewer, requireBrand } from "@/src/modules/identity";

export async function setLinkStatusAction(
  locale: string,
  linkId: string,
  status: "ACTIVE" | "DISABLED",
) {
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) throw new Error("unauthenticated");
  const result = await setOwnedBrandLinkStatus(
    allowed.value.brandId,
    linkId,
    status,
  );
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/${locale}/brand/links`);
  revalidatePath(`/${locale}/brand/products`, "layout");
  revalidatePath(`/${locale}/creator/links`);
}
