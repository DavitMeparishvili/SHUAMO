"use server";

import { revalidatePath } from "next/cache";
import {
  decidePartnershipForBrand,
  inviteCreatorForBrand,
} from "@/src/infrastructure/phase-3-services";
import { currentViewer, requireBrand } from "@/src/modules/identity";

async function brandId() {
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) throw new Error("unauthenticated");
  return allowed.value.brandId;
}

export async function decideAction(
  locale: string,
  partnershipId: string,
  decision: "APPROVE" | "REJECT",
) {
  const result = await decidePartnershipForBrand(
    await brandId(),
    partnershipId,
    decision,
  );
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/${locale}/brand/creators`);
}

export async function inviteAction(locale: string, creatorId: string) {
  const result = await inviteCreatorForBrand(await brandId(), creatorId);
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/${locale}/brand/creators`);
}
