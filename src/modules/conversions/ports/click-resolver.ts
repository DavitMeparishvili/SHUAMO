import type { CitedLinkTerms } from "@/src/modules/attribution";

export interface ClickResolver {
  resolve(
    brandId: string,
    clickId: string,
    orderOccurredAt: Date,
  ): Promise<CitedLinkTerms | undefined>;
}
