"use server";
import { revalidatePath } from "next/cache";
import { currentViewer, requireBrand } from "@/src/modules/identity";
import { setOwnedBrandLinkStatus } from "@/src/modules/partnerships";
import { isLocale } from "@/src/modules/localization";

export async function changeProductLinkStatus(
  locale: string,
  linkId: string,
  status: "ACTIVE" | "DISABLED",
) {
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok || !isLocale(locale))
    return { ok: false, error: "unauthenticated" };
  try {
    const result = await setOwnedBrandLinkStatus(
      allowed.value.brandId,
      linkId,
      status,
    );
    if (result.ok) {
      revalidatePath(`/${locale}/brand/products`, "layout");
      revalidatePath(`/${locale}/brand/links`);
      revalidatePath(`/${locale}/brand/performance`);
      revalidatePath(`/${locale}/creator/links`);
    }
    return result;
  } catch {
    return { ok: false, error: "retry" };
  }
}
