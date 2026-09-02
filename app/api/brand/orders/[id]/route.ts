import { decideOrderForBrand } from "@/src/infrastructure/phase-6-services";
import { createOrderPatchHandler } from "@/src/modules/conversions";
import { currentViewer } from "@/src/modules/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const PATCH = createOrderPatchHandler({
  currentViewer,
  decide: decideOrderForBrand,
});
